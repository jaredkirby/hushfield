import { AmbientEngine } from './ambient-dsp.mjs?v=hushfield-1';
class AmbientProcessor extends AudioWorkletProcessor {
 constructor(options){super();this.synth=new AmbientEngine(sampleRate);if(options?.processorOptions?.settings)this.synth.set(options.processorOptions.settings);if(options?.processorOptions?.playing)this.synth.play(true);this.frames=0;this.port.onmessage=({data})=>{if(data.type==='play'){this.synth.play(data.value);this.port.postMessage({...this.synth.status(),audioTime:currentTime});}else if(data.type==='settings')this.synth.set(data.value);else if(data.type==='points')this.synth.set({points:data.value});};this.port.postMessage({type:'ready'});}
 process(inputs,outputs){if(outputs[0]?.length===2)this.synth.process(outputs[0]);this.frames+=outputs[0]?.[0]?.length||0;if(this.frames>=sampleRate/4){this.port.postMessage({...this.synth.status(),audioTime:currentTime+(outputs[0]?.[0]?.length||0)/sampleRate});this.frames=0;}return true;}
}
registerProcessor('ambient-engine',AmbientProcessor);
