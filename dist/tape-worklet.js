import { TapeDelay } from "./tape-dsp.mjs?v=hushfield-1";
class TapeProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.tape = new TapeDelay(sampleRate);
    this.visuals = false;
    this.visualFrames = 0;
    this.waveLeft = new Float32Array(32);
    this.waveRight = new Float32Array(32);
    this.waveIndex = this.waveCount = this.waveSumLeft = this.waveSumRight = 0;
    this.waveBin = Math.max(1, Math.round(sampleRate / 750));
    if (options?.processorOptions?.params) this.tape.set(options.processorOptions.params);
    this.port.onmessage = ({ data }) => {
      if (data?.type === "visuals") {
        this.visuals = data.enabled === true;
        this.visualFrames = sampleRate;
        this.waveLeft.fill(0); this.waveRight.fill(0);
        this.waveIndex = this.waveCount = this.waveSumLeft = this.waveSumRight = 0;
      } else this.tape.set(data);
    };
    this.port.postMessage({ type: "ready" });
  }
  process(inputs, outputs) {
    if (outputs[0]?.length === 2) {
      this.tape.process(inputs[0] || [], outputs[0]);
      if (this.visuals) for (let i = 0; i < outputs[0][0].length; i++) {
        this.waveSumLeft += outputs[0][0][i];
        this.waveSumRight += outputs[0][1][i];
        if (++this.waveCount === this.waveBin) {
          this.waveLeft[this.waveIndex] = this.waveSumLeft / this.waveBin;
          this.waveRight[this.waveIndex] = this.waveSumRight / this.waveBin;
          this.waveIndex = (this.waveIndex + 1) % 32;
          this.waveCount = this.waveSumLeft = this.waveSumRight = 0;
        }
      }
      this.visualFrames += outputs[0][0].length;
      if (this.visuals && this.visualFrames >= sampleRate / 30) {
        this.visualFrames = 0;
        let energy = 0;
        for (const channel of outputs[0]) for (const value of channel) energy += value * value;
        // Keep signed waveform detail without cancelling opposite-phase stereo.
        const leftEnergy = this.waveLeft.reduce((sum, value) => sum + value * value, 0);
        const rightEnergy = this.waveRight.reduce((sum, value) => sum + value * value, 0);
        const source = leftEnergy >= rightEnergy ? this.waveLeft : this.waveRight;
        const waveform = Float32Array.from({length:32}, (_, i) => source[(this.waveIndex + i) % 32]);
        this.port.postMessage({
          type: "tape-visuals",
          audioTime: currentTime + outputs[0][0].length / sampleRate,
          phase: this.tape.clock / sampleRate,
          params: { ...this.tape.p },
          outputRms: Math.sqrt(energy / (2 * outputs[0][0].length)),
          waveform,
          echoRms: this.tape.echoRms
        });
      }
    }
    return true;
  }
}
registerProcessor("tape-delay", TapeProcessor);
