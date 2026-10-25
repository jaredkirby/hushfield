class GrainEngine extends AudioWorkletProcessor {
  constructor() {
    super();
    this.channels = [];
    this.sourceRate = 48e3;
    this.grains = [];
    this.p = {};
    this.playing = false;
    this.scan = 0.5;
    this.clock = 0;
    this.untilGrain = 0;
    this.direction = 1;
    this.lastPosition = 0.5;
    this.smoothedPosition = 0.5;
    this.frameCounter = 0;
    this.port.onmessage = ({ data: m }) => {
      if (m.type === "sample") {
        this.channels = m.channels;
        this.sourceRate = m.sampleRate;
        this.grains = [];
        this.scan = m.position ?? 0.5;
        this.untilGrain = 0;
        this.smoothedPosition = this.scan;
        this.direction = 1;
      }
      if (m.type === "params") {
        const old = this.p;
        this.p = { ...old, ...m.params };
        if (m.params.position !== void 0 && m.params.position !== old.position) this.scan = m.params.position;
      }
      if (m.type === "play") {
        this.playing = m.value;
        if (!m.value) this.grains = [];
        this.untilGrain = 0;
      }
    };
  }
  spawn() {
    const p = this.p, len = this.channels[0]?.length;
    if (!len || this.grains.length >= 160) return;
    if (Math.random() * 100 < (p.hold || 0)) return;
    let pos = this.scan;
    if (Math.random() * 100 < (p.static || 0)) pos = this.lastPosition;
    if (Math.random() * 100 < (p.jump || 0)) pos = Math.random();
    pos += (Math.random() - 0.5) * ((p.spray || 0) / 100) + Math.sin(this.clock * 0.31) * (p.wander || 0) / 400;
    pos = (pos % 1 + 1) % 1;
    const smoothing = (p.smooth || 0) / 100;
    this.smoothedPosition += (pos - this.smoothedPosition) * Math.max(0.015, 1 - smoothing * 0.985);
    pos = this.smoothedPosition;
    this.lastPosition = pos;
    const chaos = (p.chaos || 0) / 100;
    const duration = Math.max(0.012, (p.size || 200) / 1e3 * (1 + (Math.random() - 0.5) * chaos));
    const rev = Math.random() * 100 < (p.reverse || 0) ? -1 : 1;
    const pitch = (p.pitch || 0) + (Math.random() - 0.5) * (p.elastic || 0) / 12;
    const rate = 2 ** (pitch / 12) * this.sourceRate / sampleRate * rev;
    const width = (p.width ?? 65) / 100;
    this.grains.push({ position: pos * len, age: 0, duration: Math.floor(duration * sampleRate), rate, pan: (Math.random() * 2 - 1) * width, amplitude: Math.min(0.8, 1.1 / Math.sqrt(Math.max(1, (p.density || 12) * duration))) });
  }
  process(inputs, outputs) {
    const out = outputs[0];
    if (!out?.length) return true;
    const p = this.p, len = this.channels[0]?.length || 0;
    let peak = 0;
    for (let i = 0; i < out[0].length; i++) {
      let l = 0, r = 0;
      if (this.playing && len) {
        if (this.untilGrain <= 0) {
          this.spawn();
          const jitter = 1 + (Math.random() - 0.5) * (p.chaos || 0) / 100;
          this.untilGrain = sampleRate / Math.max(1, p.density || 12) * jitter;
        }
        this.untilGrain--;
        if (p.scanOn && !p.freeze) {
          let speed = Math.abs(p.speed ?? 1) * (p.scanMode === "pingpong" ? this.direction : 1);
          if (p.scanMode === "reverse") speed = -Math.abs(speed);
          const range = (p.range ?? 100) / 100, center = p.position ?? 0.5, lo = Math.max(0, center - range / 2), hi = Math.min(1, center + range / 2);
          this.scan += speed / (len / this.sourceRate) / sampleRate;
          if (this.scan > hi) {
            this.scan = hi;
            if (p.scanMode === "pingpong") this.direction = -1;
            else this.scan = lo;
          }
          if (this.scan < lo) {
            this.scan = lo;
            if (p.scanMode === "pingpong") this.direction = 1;
            else this.scan = hi;
          }
        }
        for (let g = this.grains.length - 1; g >= 0; g--) {
          const grain = this.grains[g];
          if (grain.age >= grain.duration) {
            this.grains.splice(g, 1);
            continue;
          }
          const pos = (grain.position % len + len) % len, idx = Math.floor(pos), f = pos - idx;
          const a = this.channels[0], b = this.channels[1] || a;
          const env = Math.sin(Math.PI * grain.age / grain.duration) ** 2;
          const left = a[idx] * (1 - f) + a[(idx + 1) % len] * f;
          const right = b[idx] * (1 - f) + b[(idx + 1) % len] * f;
          l += left * env * grain.amplitude * Math.sqrt((1 - grain.pan) / 2);
          r += right * env * grain.amplitude * Math.sqrt((1 + grain.pan) / 2);
          grain.age++;
          grain.position += grain.rate;
        }
      }
      out[0][i] = l;
      if (out[1]) out[1][i] = r;
      peak = Math.max(peak, Math.abs(l), Math.abs(r));
      this.clock += 1 / sampleRate;
    }
    this.frameCounter += out[0].length;
    if (this.frameCounter >= sampleRate / 15) {
      this.port.postMessage({ scan: this.scan, count: this.grains.length, peak, grains: this.grains.slice(-45).map((g) => ({ position: (g.position % Math.max(1, len) + len) % Math.max(1, len) / Math.max(1, len), life: g.age / g.duration })) });
      this.frameCounter = 0;
    }
    return true;
  }
}
registerProcessor("grain-engine", GrainEngine);
class CaptureEngine extends AudioWorkletProcessor {
  constructor() {
    super();
    this.recording = false;
    this.left = new Float32Array(4096);
    this.right = new Float32Array(4096);
    this.offset = 0;
    this.port.onmessage = ({ data }) => {
      if (data.type === "start" && !this.recording) {
        this.id = data.id;
        this.maxFrames = Math.min(Math.floor(sampleRate * 300), Number.isFinite(data.maxFrames) ? Math.max(1, Math.floor(data.maxFrames)) : Math.floor(sampleRate * 300));
        this.frames = this.offset = 0;
        this.recording = true;
      } else if (data.type === "stop" && (data.id === void 0 || data.id === this.id) && this.recording) this.finish();
    };
  }
  finish() {
    this.recording = false;
    this.flush();
    this.port.postMessage({ type: "done", id: this.id });
  }
  flush() {
    if (!this.offset) return;
    const left = this.left.slice(0, this.offset), right = this.right.slice(0, this.offset);
    this.port.postMessage({ type: "chunk", id: this.id, left, right }, [left.buffer, right.buffer]);
    this.offset = 0;
  }
  process(inputs) {
    const input = inputs[0];
    if (this.recording && input?.[0]) {
      const l = input[0], r = input[1] || l;
      for (let i = 0; i < l.length && this.recording; i++) {
        this.left[this.offset] = l[i];
        this.right[this.offset] = r[i];
        this.offset++;
        this.frames++;
        if (this.offset === 4096) this.flush();
        if (this.frames >= this.maxFrames) this.finish();
      }
    }
    return true;
  }
}
registerProcessor("capture-engine", CaptureEngine);
