import { TapeDelay } from "./tape-dsp.mjs?v=hushfield-1";
class TapeProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.tape = new TapeDelay(sampleRate);
    this.visuals = false;
    this.visualFrames = 0;
    this.processorFrames = 0;
    this.waveLeft = new Float32Array(32);
    this.waveRight = new Float32Array(32);
    this.waveIndex = this.waveCount = this.waveSumLeft = this.waveSumRight = 0;
    this.waveBin = Math.max(1, Math.round(sampleRate / 750));
    this.visualEnergy = {output:0, echo:0, spring:0, samples:0, heads:new Float64Array(3)};
    if (options?.processorOptions?.params) this.tape.set(options.processorOptions.params);
    this.port.onmessage = ({ data }) => {
      if (data?.type === "visuals") {
        this.visuals = data.enabled === true;
        this.visualFrames = sampleRate;
        this.waveLeft.fill(0); this.waveRight.fill(0);
        this.waveIndex = this.waveCount = this.waveSumLeft = this.waveSumRight = 0;
        this.resetVisualEnergy();
      } else this.tape.set(data);
    };
    this.port.postMessage({ type: "ready" });
  }
  resetVisualEnergy() {
    const energy = this.visualEnergy;
    energy.output = energy.echo = energy.spring = energy.samples = 0;
    energy.heads.fill(0);
  }
  process(inputs, outputs) {
    if (outputs[0]?.length === 2) {
      this.tape.process(inputs[0] || [], outputs[0]);
      this.processorFrames += outputs[0][0].length;
      if (this.visuals) {
        this.tape.accumulateVisualEnergy(this.visualEnergy, outputs[0][0].length);
        this.visualEnergy.samples += outputs[0][0].length;
        for (let i = 0; i < outputs[0][0].length; i++) {
          this.visualEnergy.output += (outputs[0][0][i] ** 2 + outputs[0][1][i] ** 2) / 2;
          this.waveSumLeft += outputs[0][0][i];
          this.waveSumRight += outputs[0][1][i];
          if (++this.waveCount === this.waveBin) {
            this.waveLeft[this.waveIndex] = this.waveSumLeft / this.waveBin;
            this.waveRight[this.waveIndex] = this.waveSumRight / this.waveBin;
            this.waveIndex = (this.waveIndex + 1) % 32;
            this.waveCount = this.waveSumLeft = this.waveSumRight = 0;
          }
        }
      }
      this.visualFrames += outputs[0][0].length;
      if (this.visuals && this.visualFrames >= sampleRate / 30) {
        this.visualFrames = 0;
        const energy = this.visualEnergy;
        // Keep signed waveform detail without cancelling opposite-phase stereo.
        const leftEnergy = this.waveLeft.reduce((sum, value) => sum + value * value, 0);
        const rightEnergy = this.waveRight.reduce((sum, value) => sum + value * value, 0);
        const source = leftEnergy >= rightEnergy ? this.waveLeft : this.waveRight;
        const waveform = Float32Array.from({length:32}, (_, i) => source[(this.waveIndex + i) % 32]);
        this.port.postMessage({
          type: "tape-visuals",
          audioTime: currentTime + outputs[0][0].length / sampleRate,
          ...this.tape.visualState(),
          processorFrames: this.processorFrames,
          phase: this.processorFrames / sampleRate,
          outputRms: Math.sqrt(energy.output / energy.samples),
          echoRms: Math.sqrt(energy.echo / energy.samples),
          springRms: Math.sqrt(energy.spring / energy.samples),
          headRms: Array.from(energy.heads, value => Math.sqrt(value / energy.samples)),
          waveform
        });
        this.resetVisualEnergy();
      }
    }
    return true;
  }
}
registerProcessor("tape-delay", TapeProcessor);
