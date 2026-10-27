import { TAPE_DEFAULTS } from "./tape-settings.mjs";
import { tapeWow, tapeFlutter } from "./tape-motion.mjs";
const smoothKeys = ["delayTime", "feedback", "mix", "drive", "wow", "flutter", "hiss", "tone", "on"];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
class TapeDelay {
  constructor(rate) {
    this.rate = rate;
    this.length = Math.ceil(rate * 2) + 4;
    this.buffer = [new Float32Array(this.length), new Float32Array(this.length)];
    this.directLength = Math.ceil(rate * 0.03) + 4;
    this.directBuffer = [new Float32Array(this.directLength), new Float32Array(this.directLength)];
    this.directHead = 0;
    this.directLow = [0, 0];
    this.head = 0;
    this.clock = 0;
    this.low = [0, 0];
    this.high = [0, 0];
    this.last = [0, 0];
    this.envelope = 0;
    this.seed = 721;
    this.target = {};
    this.set(TAPE_DEFAULTS);
    this.p = { ...this.target };
    this.slew = 1 - Math.exp(-1 / (rate * 0.035));
  }
  set(values) {
    const t = this.target;
    const specs = { delayTime: [0.05, 1.5, 1], feedback: [0, 0.8, 0.01], delayMix: [0, 0.7, 0.01], drive: [0, 1, 0.01], wow: [0, 1, 0.01], flutter: [0, 1, 0.01], hiss: [0, 1, 0.01], tapeTone: [0, 1, 0.01] };
    for (const [key, [min, max, scale]] of Object.entries(specs)) {
      if (Number.isFinite(values[key])) t[{ delayMix: "mix", tapeTone: "tone" }[key] || key] = clamp(values[key] * scale, min, max);
    }
    if (typeof values.tapeOn === "boolean") t.on = Number(values.tapeOn);
  }
  process(input, output) {
    const p = this.p, t = this.target, rate = this.rate, n = this.length;
    let echoEnergy = 0;
    for (let i = 0; i < output[0].length; i++) {
      for (const key of smoothKeys) p[key] += (t[key] - p[key]) * this.slew;
      const left = input[0]?.[i] || 0, right = input[1]?.[i] ?? left;
      this.envelope = Math.max(Math.abs(left), Math.abs(right), this.envelope * 0.9994);
      const phase = this.clock / rate;
      const drift = tapeWow(phase, p.wow);
      const flutter = tapeFlutter(phase, p.flutter);
      const cutoff = 1500 + 6500 * p.tone, lp = 1 - Math.exp(-2 * Math.PI * cutoff / rate), hp = Math.exp(-2 * Math.PI * 90 / rate);
      for (let c = 0; c < 2; c++) {
        const source = c ? right : left, offset = p.on * ((drift + flutter) * rate + (c ? rate * 7e-4 : 0));
        const read = (this.head - clamp(p.delayTime * rate + offset, 2, n - 2) + n) % n, at = Math.floor(read), fraction = read - at;
        let echo = this.buffer[c][at] * (1 - fraction) + this.buffer[c][(at + 1) % n] * fraction;
        this.high[c] = hp * (this.high[c] + echo - this.last[c]);
        this.last[c] = echo;
        this.low[c] += lp * (this.high[c] - this.low[c]);
        echo = echo * (1 - p.on) + this.low[c] * p.on;
        const gain = 1 + p.drive * 36;
        this.seed = this.seed * 1664525 + 1013904223 >>> 0;
        const hiss = (this.seed / 4294967296 * 2 - 1) * p.hiss * 3e-3 * Math.min(1, this.envelope * 12) * p.on;
        const write = source + echo * p.feedback * p.on;
        this.buffer[c][this.head] = write * (1 - p.on) + Math.tanh(write * gain) / gain * p.on + hiss;
        this.directBuffer[c][this.directHead] = source;
        const directRead = (this.directHead - clamp((8e-3 + drift + flutter) * rate, 2, this.directLength - 2) + this.directLength) % this.directLength;
        const directAt = Math.floor(directRead), directFraction = directRead - directAt;
        const headSample = this.directBuffer[c][directAt] * (1 - directFraction) + this.directBuffer[c][(directAt + 1) % this.directLength] * directFraction;
        const directAlpha = 1 - Math.exp(-2 * Math.PI * (2200 + 8500 * p.tone) / rate);
        this.directLow[c] += directAlpha * (headSample - this.directLow[c]);
        const direct = source * (1 - p.on) + Math.tanh(this.directLow[c] * gain) / gain * (1 + p.drive * 0.5) * p.on;
        output[c][i] = direct * 0.75 + echo * p.mix * p.on;
        echoEnergy += (echo * p.mix * p.on) ** 2;
      }
      this.head = (this.head + 1) % n;
      this.directHead = (this.directHead + 1) % this.directLength;
      this.clock++;
    }
    this.echoRms = Math.sqrt(echoEnergy / (2 * output[0].length));
  }
}
export {
  TapeDelay
};
