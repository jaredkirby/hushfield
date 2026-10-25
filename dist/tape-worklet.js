import { TapeDelay } from "./tape-dsp.mjs?v=hushfield-1";
class TapeProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.tape = new TapeDelay(sampleRate);
    if (options?.processorOptions?.params) this.tape.set(options.processorOptions.params);
    this.port.onmessage = ({ data }) => this.tape.set(data);
    this.port.postMessage({ type: "ready" });
  }
  process(inputs, outputs) {
    if (outputs[0]?.length === 2) this.tape.process(inputs[0] || [], outputs[0]);
    return true;
  }
}
registerProcessor("tape-delay", TapeProcessor);
