import { SPACE_ECHO_MODES } from './tape-settings.mjs';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const keys = ['delayTime', 'feedback', 'mix', 'drive', 'wow', 'flutter', 'hiss', 'tone', 'spring', 'on'];

// A short dispersive waveguide for each of three spring paths. This is a
// synthetic approximation, not a measured RE-201 tank impulse or circuit model.
class SpringPath {
  constructor(rate, seconds, dispersion) {
    this.line = new Float32Array(Math.round(rate * seconds));
    this.at = 0;
    this.low = 0;
    this.allpasses = dispersion.map(seconds => ({ line: new Float32Array(Math.max(1, Math.round(rate * seconds))), at: 0 }));
    this.damping = 1 - Math.exp(-2 * Math.PI * 4200 / rate);
    this.decay = Math.pow(.001, this.line.length / rate / 1.65);
  }
  process(input) {
    let value = this.line[this.at];
    this.low += this.damping * (value - this.low);
    value = this.low;
    for (const pass of this.allpasses) {
      const delayed = pass.line[pass.at];
      const next = delayed - .62 * value;
      pass.line[pass.at] = value + .62 * next;
      pass.at = (pass.at + 1) % pass.line.length;
      value = next;
    }
    this.line[this.at] = Math.tanh(input + value * this.decay);
    this.at = (this.at + 1) % this.line.length;
    return value;
  }
}

class SpaceEcho {
  constructor(rate) {
    this.rate = rate;
    this.length = Math.ceil(rate * 2) + 8;
    this.audio = new Float32Array(this.length);
    this.distance = new Float64Array(this.length);
    this.travel = 0;
    this.frame = 0;
    this.readers = [0, 0, 0];
    this.high = [0, 0, 0];
    this.previous = [0, 0, 0];
    this.low = [0, 0, 0];
    this.low2 = [0, 0, 0];
    this.headWeights = [0, 1, 1];
    this.springWeight = 0;
    this.mode = 4;
    this.target = { delayTime: .36, feedback: .28, mix: .16, drive: .16, wow: .1, flutter: .06, hiss: .04, tone: .42, spring: .12, on: 0 };
    this.p = { ...this.target };
    this.slew = 1 - Math.exp(-1 / (rate * .035));
    this.motorSlew = 1 - Math.exp(-1 / (rate * .12));
    this.motor = 3 / .36;
    this.visualSpeed = 1;
    this.echoRms = this.springRms = 0;
    this.headRms = [0, 0, 0];
    this.headEnergy = new Float64Array(3);
    this.seed = 201;
    this.envelope = 0;
    this.springHigh = 0;
    this.springLast = 0;
    this.springs = [
      new SpringPath(rate, .0311, [.0013, .0029, .0053]),
      new SpringPath(rate, .0377, [.0017, .0037, .0061]),
      new SpringPath(rate, .0419, [.0023, .0043, .0071])
    ];
  }
  set(values) {
    const specs = { delayTime: [.05, 1.5, 1], feedback: [0, .8, .01], delayMix: [0, .7, .01], drive: [0, 1, .01], wow: [0, 1, .01], flutter: [0, 1, .01], hiss: [0, 1, .01], tapeTone: [0, 1, .01], springMix: [0, .7, .01] };
    for (const [key, [min, max, scale]] of Object.entries(specs)) {
      if (Number.isFinite(values[key])) this.target[{ delayMix: 'mix', tapeTone: 'tone', springMix: 'spring' }[key] || key] = clamp(values[key] * scale, min, max);
    }
    if (typeof values.tapeOn === 'boolean') this.target.on = Number(values.tapeOn);
    if (Number.isInteger(values.echoMode) && values.echoMode >= 1 && values.echoMode <= 12) this.mode = values.echoMode;
  }
  readHead(head) {
    const target = this.travel - (head + 1);
    const oldest = Math.max(0, this.frame - this.length + 2);
    if (target < this.distance[oldest % this.length]) return 0;
    let index = Math.max(this.readers[head], oldest);
    while (index + 1 < this.frame && this.distance[(index + 1) % this.length] <= target) index++;
    this.readers[head] = index;
    if (index + 1 >= this.frame) return 0;
    const first = index % this.length, next = (index + 1) % this.length;
    const span = this.distance[next] - this.distance[first];
    const fraction = span > 0 ? clamp((target - this.distance[first]) / span, 0, 1) : 0;
    return this.audio[first] + (this.audio[next] - this.audio[first]) * fraction;
  }
  process(input, output) {
    const p = this.p, rate = this.rate;
    const startTravel = this.travel, headEnergy = this.headEnergy;
    headEnergy.fill(0);
    let echoEnergy = 0, springEnergy = 0;
    const mode = SPACE_ECHO_MODES[this.mode - 1];
    const hp = Math.exp(-2 * Math.PI * 75 / rate);
    for (let i = 0; i < output[0].length; i++) {
      for (const key of keys) p[key] += (this.target[key] - p[key]) * this.slew;
      // Fixed physical head distances, moving tape. Each read interpolates the
      // recorded tape-distance history, so pitch follows playback/record speed.
      this.motor += (3 / p.delayTime - this.motor) * this.motorSlew;
      const seconds = this.frame / rate;
      const wow = (Math.sin(seconds * 2 * Math.PI * .47) + .28 * Math.sin(seconds * 2 * Math.PI * .79)) * .012 * p.wow;
      const flutter = (Math.sin(seconds * 2 * Math.PI * 6.7) + .35 * Math.sin(seconds * 2 * Math.PI * 11.3)) * .003 * p.flutter;
      const cutoff = clamp((2200 + 6500 * p.tone) * Math.sqrt(.36 * this.motor / 3), 1200, Math.min(14000, rate * .4));
      const lp = 1 - Math.exp(-2 * Math.PI * cutoff / rate);
      const left = input[0]?.[i] || 0, right = input[1]?.[i] ?? left;
      const gain = 1 + p.drive * 12;
      const preampL = Math.tanh(left * gain) / gain * (1 + p.drive * .5);
      const preampR = Math.tanh(right * gain) / gain * (1 + p.drive * .5);
      const source = (preampL + preampR) * .5;
      this.envelope = Math.max(Math.abs(source), this.envelope * Math.exp(-1 / (rate * .18)));
      let echo = 0, weights = 0;
      for (let head = 0; head < 3; head++) {
        const raw = this.readHead(head);
        this.high[head] = hp * (this.high[head] + raw - this.previous[head]);
        this.previous[head] = raw;
        this.low[head] += lp * (this.high[head] - this.low[head]);
        this.low2[head] += lp * (this.low[head] - this.low2[head]);
        this.headWeights[head] += (Number(mode.heads.includes(head + 1)) - this.headWeights[head]) * this.slew;
        echo += this.low2[head] * this.headWeights[head];
        weights += this.headWeights[head];
      }
      for (let head = 0; head < 3; head++) headEnergy[head] +=
        (this.low2[head] * this.headWeights[head] * p.mix * p.on / Math.sqrt(Math.max(1, weights))) ** 2;
      // Average the selected returns in the loop so adding heads does not
      // multiply the feedback gain. The highest intensity can self-oscillate.
      const feedback = echo / Math.max(1, weights) * p.feedback * 1.45 * p.on;
      this.seed = this.seed * 1664525 + 1013904223 >>> 0;
      const noise = (this.seed / 4294967296 * 2 - 1) * p.hiss * .0015 * Math.min(1, this.envelope * 10) * p.on;
      this.audio[this.frame % this.length] = Math.tanh((source + feedback) * (1 + p.drive * 3)) / (1 + p.drive * 3) + noise;
      this.distance[this.frame % this.length] = this.travel;
      this.travel += this.motor * (1 + wow + flutter) / rate;
      // Spring is a parallel return, with its own level and no tape feedback.
      this.springHigh = hp * (this.springHigh + source - this.springLast);
      this.springLast = source;
      let spring = 0;
      for (const path of this.springs) spring += path.process(this.springHigh * p.on);
      this.springWeight += (Number(mode.spring) - this.springWeight) * this.slew;
      const wet = echo / Math.sqrt(Math.max(1, weights)) * p.mix + spring / 3 * p.spring * this.springWeight;
      echoEnergy += (echo / Math.sqrt(Math.max(1, weights)) * p.mix * p.on) ** 2;
      springEnergy += (spring / 3 * p.spring * this.springWeight * p.on) ** 2;
      output[0][i] = left * .75 + p.on * ((preampL - left) * .75 + wet);
      output[1][i] = right * .75 + p.on * ((preampR - right) * .75 + wet);
      this.frame++;
    }
    const count = output[0].length;
    this.visualSpeed = (this.travel - startTravel) / count * rate * .12;
    this.echoRms = Math.sqrt(echoEnergy / count);
    this.springRms = Math.sqrt(springEnergy / count);
    for (let i = 0; i < 3; i++) this.headRms[i] = Math.sqrt(headEnergy[i] / count);
  }
}
export { SpaceEcho };
