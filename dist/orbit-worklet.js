import { OrbitEngine } from "./orbit-dsp.mjs";
class OrbitProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.engine = new OrbitEngine(sampleRate);
    this.reportFrames = 0;
    const settings = options?.processorOptions;
    if (settings?.options) this.engine.configure(settings.options);
    if (settings?.patches) this.engine.setPatches(settings.patches);
    if (settings?.balls) this.engine.scatter(settings.balls);
    this.port.onmessage = ({ data }) => {
      if (data.type === "options") this.engine.configure(data.value);
      else if (data.type === "patches") this.engine.setPatches(data.value);
      else if (data.type === "transport") this.engine.play(data.value);
      else if (data.type === "audition") this.engine.audition(data.bank, data.index, data.midi, data.patch);
      else if (data.type === "stop") this.engine.stop(data.bank, data.index);
      else if (data.type === "scatter") this.engine.scatter(data.balls);
      else if (data.type === "nudge") this.engine.nudge();
    };
  }
  process(inputs, outputs) {
    this.engine.process(outputs);
    const count = outputs[0][0].length;
    this.reportFrames += count;
    if (this.reportFrames >= sampleRate / 30) {
      this.reportFrames = 0;
      const state = this.engine.status(), audioTime = currentTime + count / sampleRate;
      const hits = this.engine.hits.splice(0).map((hit) => ({ index: hit.index, audioTime: audioTime + hit.time - state.time }));
      this.port.postMessage({ ...state, audioTime, hits });
    }
    return true;
  }
}
registerProcessor("orbit-engine", OrbitProcessor);
