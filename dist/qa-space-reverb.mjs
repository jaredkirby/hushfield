import { AMBIENT_DEFAULTS } from './ambient-settings.mjs';
import { TAPE_DEFAULTS } from './tape-settings.mjs';
import { encodeWav } from './wave-file.mjs';
import { createPieceSpace } from './piece-space.mjs';
// Serve repository root to make the immutable source fixture available at /tests/.
import { createPieceSpace as original } from '../tests/fixtures/space-original-v1/piece-space.mjs';
const settings = {spaceVersion:2,foundationRoom:75,textureRoom:43,motionRoom:61,roomLow:180,roomHigh:7500};
const energy = data => data.reduce((sum,x)=>sum+x*x,0);
async function render(factory,model='original',extra={},modern=true) {
  const rate=extra.sampleRate||12000, context=new OfflineAudioContext(2,rate*3,rate), bus=factory(context,context.destination);
  bus.setDepth({...settings,spaceVersion:modern?2:1}); bus.setTone('lowpass',4800,.6); bus.setWidth(73); bus.wet.gain.value=.6;
  bus.setReverb?.({reverbModel:model,reverbDecay:1.6,reverbTone:70,reverbWidth:80,...extra});
  if(extra.amount===0) bus.wet.gain.value=0;
  if(extra.reverse) {bus.setReverb?.({reverbModel:'spring'});bus.setReverb?.({reverbModel:'chamber'});bus.setReverb?.({reverbModel:'original'});}
  const source=context.createBufferSource(), buffer=context.createBuffer(2,rate*.2,rate);
  for(let ch=0;ch<2;ch++){const data=buffer.getChannelData(ch);for(let i=0;i<data.length;i++)data[i]=Math.sin(i*(ch? .091:.073))*.12*Math.exp(-i/500);}
  source.buffer=buffer;source.connect(bus.parts.foundation);source.start();
  const result=await context.startRendering(); return [result.getChannelData(0),result.getChannelData(1)];
}
async function renderRapidSelection(switches) {
  const rate=12000,context=new OfflineAudioContext(2,rate*2,rate),bus=createPieceSpace(context,context.destination);
  bus.setDepth(settings);bus.setWidth(100);bus.wet.gain.value=.85;
  bus.setReverb({reverbModel:switches?'plate':'chamber',reverbDecay:.5});
  const source=context.createBufferSource(),buffer=context.createBuffer(2,1,rate);
  buffer.getChannelData(0)[0]=buffer.getChannelData(1)[0]=.2;source.buffer=buffer;source.connect(bus.parts.foundation);source.start(1);
  const first=context.suspend(.3),second=context.suspend(.6),rendering=context.startRendering();
  await first;
  if(switches)for(const reverbModel of ['spring','original','chamber'])bus.setReverb({reverbModel,reverbDecay:.5});
  // Wall-clock time alone must never authorize replacing an audible convolution lane.
  await new Promise(resolve=>setTimeout(resolve,200));await context.resume();
  await second;await new Promise(resolve=>setTimeout(resolve,200));await context.resume();
  const result=await rendering;return [result.getChannelData(0),result.getChannelData(1)];
}
export async function runSpaceReverbQA(){
  const checks=[];const check=(value,label)=>{checks.push({pass:!!value,label});if(!value)throw Error(label);};
  for(const sampleRate of [12000,44100,48000])for(const modern of [false,true]){
    const before=await render(original,'original',{sampleRate},modern),after=await render(createPieceSpace,'original',{sampleRate},modern);
    check(before.every((channel,ch)=>channel.every((x,i)=>Object.is(x,after[ch][i]))),`Original ${modern?'Depth':'legacy'} graph retains exact PCM at ${sampleRate}Hz`);
  }
  const reversed=await render(createPieceSpace,'original',{reverse:true});
  const unchanged=await render(createPieceSpace);
  check(reversed.every((channel,ch)=>channel.every((x,i)=>Object.is(x,unchanged[ch][i]))),'Rapid selection reversal retains latest original selection');
  const dry=await render(original,'original',{amount:0});
  for(const model of ['plate','spring','chamber']) {
    const muted=await render(createPieceSpace,model,{amount:0});
    check(dry.every((channel,ch)=>channel.every((x,i)=>Object.is(x,muted[ch][i]))),`${model} amount zero retains dry PCM`);
  }
  const responses={};
  for(const model of ['plate','spring','chamber']){
    responses[model]=await render(createPieceSpace,model);
    check(responses[model].every(c=>c.every(Number.isFinite)),`${model} finite stereo render`);
    check(energy(responses[model][0].slice(6000))>1e-8,`${model} audible late tail`);
    const narrow=await render(createPieceSpace,model,{reverbWidth:0});
    check(energy(narrow[0].map((x,i)=>x-responses[model][0][i]))>1e-8,`${model} independent width changes wet response`);
    const dark=await render(createPieceSpace,model,{reverbTone:0});
    check(energy(dark[0].map((x,i)=>x-responses[model][0][i]))>1e-8,`${model} tone changes wet response`);
    const delayed=await render(createPieceSpace,model,{reverbPredelay:150});
    check(energy(delayed[0].map((x,i)=>x-responses[model][0][i]))>1e-8,`${model} pre-delay changes wet response`);
  }
  check(energy(responses.plate[0].map((x,i)=>x-responses.spring[0][i]))>1e-7,'Plate and spring are distinct');
  check(energy(responses.chamber[0].map((x,i)=>x-responses.spring[0][i]))>1e-7,'Chamber and spring are distinct');
  for(const sampleRate of [44100,48000])for(const model of ['plate','spring','chamber']) {
    const result=await render(createPieceSpace,model,{sampleRate,reverbDecay:8});
    let peak=0;for(const channel of result)for(const value of channel)peak=Math.max(peak,Math.abs(value));
    check(Number.isFinite(peak)&&peak<1,`${model} retains headroom at ${sampleRate}Hz`);
  }
  const longContext=new OfflineAudioContext(2,12000*9,12000), longBus=createPieceSpace(longContext,longContext.destination);
  longBus.setDepth(settings);longBus.setWidth(100);longBus.wet.gain.value=.85;
  longBus.setReverb({reverbModel:'plate',reverbDecay:8});
  const impulse=longContext.createBufferSource(), impulseBuffer=longContext.createBuffer(2,1,12000);
  impulseBuffer.getChannelData(0)[0]=1;impulseBuffer.getChannelData(1)[0]=1;impulse.buffer=impulseBuffer;impulse.connect(longBus.parts.foundation);impulse.start();
  const longBuffer=await longContext.startRendering();
  check(energy(longBuffer.getChannelData(0).slice(12000*4,12000*6))>1e-9,'Eight second decay retains late energy');
  for(const swapRate of [12000,44100,48000]) {
  const swapContext=new OfflineAudioContext(2,swapRate*3,swapRate), swapBus=createPieceSpace(swapContext,swapContext.destination);
  swapBus.setDepth(settings);swapBus.setWidth(100);swapBus.wet.gain.value=.85;swapBus.setReverb({reverbModel:'plate',reverbDecay:1});
  const oscillator=swapContext.createOscillator();oscillator.frequency.value=177;oscillator.connect(swapBus.parts.foundation);oscillator.start();oscillator.stop(1.8);
  const pauses=[.3,.6,.9,1.2,1.5].map(at=>swapContext.suspend(at)),selectionFrames=[];const swapping=swapContext.startRendering();
  for(let i=0;i<pauses.length;i++){await pauses[i];selectionFrames.push(Math.round(swapContext.currentTime*swapRate));swapBus.setReverb({reverbModel:['spring','chamber','plate'][i%3],reverbDecay:1});await swapContext.resume();}
  const swapped=await swapping;check([0,1].every(ch=>swapped.getChannelData(ch).every(Number.isFinite)),`Repeated live model changes stay finite at ${swapRate}Hz`);
  let largestStep=0,stepIndex=0,stepChannel=0,swapPeak=0;for(let ch=0;ch<2;ch++){const samples=swapped.getChannelData(ch);for(let i=1;i<swapRate*1.7;i++){const step=Math.abs(samples[i]-samples[i-1]);swapPeak=Math.max(swapPeak,Math.abs(samples[i]));if(step>largestStep){largestStep=step;stepIndex=i;stepChannel=ch;}}}
  // Check selection boundaries, not the model's legitimate tail fluctuations.
  // Compare the largest step within three samples of the exact audio-thread
  // suspension boundary to neighboring18ms windows, separated by a2ms gap.
  // These reference windows span several177Hz cycles at every sample rate.
  const maximumStep=(samples,start,end)=>{
    let peak=0;for(let i=Math.max(1,start);i<Math.min(samples.length,end);i++)peak=Math.max(peak,Math.abs(samples[i]-samples[i-1]));return peak;
  };
  const gap=Math.max(4,Math.round(swapRate*.002)),reach=Math.round(swapRate*.020);
  let worstBoundaryRatio=0,worstBoundaryAt=0,worstBoundaryStep=0,worstReferenceStep=0;
  for(const frame of selectionFrames)for(let ch=0;ch<2;ch++){
    const samples=swapped.getChannelData(ch),boundaryStep=maximumStep(samples,frame-3,frame+4);
    const referenceStep=Math.max(maximumStep(samples,frame-reach,frame-gap),maximumStep(samples,frame+gap,frame+reach),1e-6);
    const ratio=boundaryStep/referenceStep;
    if(ratio>worstBoundaryRatio){worstBoundaryRatio=ratio;worstBoundaryAt=frame/swapRate;worstBoundaryStep=boundaryStep;worstReferenceStep=referenceStep;}
  }
  check(worstBoundaryRatio<2,`Repeated model selection boundaries remain continuous at ${swapRate}Hz: boundary/reference=${worstBoundaryRatio}, boundaryStep=${worstBoundaryStep}, neighboringStep=${worstReferenceStep}, boundaryAt=${worstBoundaryAt}s; global maxStep=${largestStep}, at=${stepIndex/swapRate}s, channel=${stepChannel}, peak=${swapPeak}`);
  if(swapRate===12000){
    const oldFailureFrame=selectionFrames[2],samples=swapped.getChannelData(1);
    const neighboringStep=Math.max(maximumStep(samples,oldFailureFrame-reach,oldFailureFrame-gap),maximumStep(samples,oldFailureFrame+gap,oldFailureFrame+reach),1e-6);
    const observedOldJump=.6401112079620361,oldFailureRatio=observedOldJump/neighboringStep;
    check(oldFailureRatio>2,`Boundary diagnostic rejects observed pre-fix0.9066667s jump: oldJump/reference=${oldFailureRatio}`);
  }
  }
  const latest=await renderRapidSelection(true), steady=await renderRapidSelection(false);
  check(latest.every((channel,ch)=>channel.every((value,i)=>Object.is(value,steady[ch][i]))),'Rapid plate→spring→original→chamber retains exact final chamber response after settling');
  for(const model of ['plate','spring','chamber']) {
    const musical=await renderSpaceListening(model,{tape:true});let peak=0;
    for(let ch=0;ch<2;ch++)for(const value of musical.getChannelData(ch))peak=Math.max(peak,Math.abs(value));
    check(Number.isFinite(peak)&&peak<1,`${model} Foundation→Space→Space Echo retains headroom at 48000Hz`);
  }
  return checks;
}
document.querySelector('#run').onclick=async()=>{const output=document.querySelector('#output');try{const checks=await runSpaceReverbQA();output.textContent=JSON.stringify({pass:true,checks},null,2);}catch(error){output.textContent=JSON.stringify({pass:false,error:error.message},null,2);}};

function ready(node) {
  return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Worklet readiness timed out')),5000);node.port.onmessage=({data})=>{if(data.type==='ready'){clearTimeout(timer);resolve();}};node.onprocessorerror=()=>{clearTimeout(timer);reject(Error('Worklet failed'));};});
}
export async function renderSpaceListening(model,{tape=false}={}) {
  const rate=48000,context=new OfflineAudioContext(2,rate*12,rate);
  await context.audioWorklet.addModule('./build/ambient-worklet.js');
  if(tape)await context.audioWorklet.addModule('./build/tape-worklet.js');
  let destination=context.destination, tapeNode;
  if(tape){tapeNode=new AudioWorkletNode(context,'tape-delay',{numberOfInputs:1,outputChannelCount:[2],processorOptions:{params:{...TAPE_DEFAULTS,tapeOn:true,tapeModel:2,hiss:0}}});tapeNode.connect(destination);destination=tapeNode;}
  const bus=createPieceSpace(context,destination);bus.setDepth({...settings,foundationRoom:100});bus.setTone('lowpass',14000,.6);bus.setWidth(100);bus.wet.gain.value=model==='dry'?0:.65;bus.setReverb({reverbModel:model==='dry'?'original':model,reverbDecay:4,reverbPredelay:25,reverbTone:65,reverbWidth:100});
  const foundation=new AudioWorkletNode(context,'ambient-engine',{numberOfInputs:0,outputChannelCount:[2],processorOptions:{settings:{...AMBIENT_DEFAULTS,instrument:'juno',seed:7201,hold:true},playing:true}}),gate=context.createGain();
  gate.gain.setValueAtTime(1,0);gate.gain.setValueAtTime(1,5.95);gate.gain.linearRampToValueAtTime(0,6);foundation.connect(gate);gate.connect(bus.parts.foundation);
  await Promise.all([ready(foundation),...(tapeNode?[ready(tapeNode)]:[])]);
  return context.startRendering();
}
const listeningURLs=[];
document.querySelector('#listen').onclick=async()=>{
  const output=document.querySelector('#output'),clips=document.querySelector('#clips');
  listeningURLs.splice(0).forEach(URL.revokeObjectURL);clips.replaceChildren();
  let saved=0,saveFailures=0;
  try{for(const model of ['dry','original','plate','spring','chamber']){
    output.textContent='Rendering '+model+'…';
    const tape=document.querySelector('#tape').checked,buffer=await renderSpaceListening(model,{tape}),bytes=encodeWav(buffer),name='vintage-space-'+model+(tape?'-tape':'')+'.wav',url=URL.createObjectURL(new Blob([bytes],{type:'audio/wav'}));listeningURLs.push(url);
    const row=document.createElement('p'),label=document.createElement('a'),audio=document.createElement('audio');label.href=url;label.download=name;label.textContent=name;audio.src=url;audio.controls=true;row.append(label,audio);clips.append(row);
    try{const response=await fetch('/.listening-save/'+name,{method:'POST',body:bytes});if(response.ok)saved++;else saveFailures++;}catch{saveFailures++;}
  }output.textContent='Five deterministic Stillwater chorus comparisons ready: six seconds of excitation plus six seconds of tails. Downloads are available. Server files saved: '+saved+'; server saves unavailable/failed: '+saveFailures+'.';}catch(error){output.textContent=error.stack;}
};

if(new URLSearchParams(location.search).has('saved')) {
  document.querySelector('#run').hidden=true;
  document.querySelector('#listen').hidden=true;
  document.querySelector('#tape').closest('label').hidden=true;
  const clips=document.querySelector('#clips');
  for(const tape of [false,true])for(const model of ['dry','original','plate','spring','chamber']) {
    const name='vintage-space-'+model+(tape?'-tape':'')+'.wav',url='./space-listening/'+name;
    const row=document.createElement('p'),link=document.createElement('a'),audio=document.createElement('audio');
    link.href=url;link.download=name;link.textContent=model+(tape?' · Space Echo':' · Tape off');audio.src=url;audio.controls=true;audio.preload='none';
    row.append(link,audio);clips.append(row);
  }
  document.querySelector('#output').textContent='Each clip uses the same Stillwater Chorus synth: six seconds of sound followed by six seconds of reverb tails. Dry is the source reference. The reverb examples use Amount 65% and Foundation send 100% to make their differences easier to hear. The second set adds Space Echo with hiss off. These saved recordings are ready to play or download.';
}
