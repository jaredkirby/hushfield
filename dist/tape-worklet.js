import { TapeDelay } from './tape-dsp.mjs?v=hushfield-1';
class TapeProcessor extends AudioWorkletProcessor {
  constructor(){super();this.tape=new TapeDelay(sampleRate);this.port.onmessage=({data})=>this.tape.set(data);}
  process(inputs,outputs){if(outputs[0]?.length===2)this.tape.process(inputs[0]||[],outputs[0]);return true;}
}
registerProcessor('tape-delay',TapeProcessor);
