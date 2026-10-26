import { TAPE_DEFAULTS } from './tape-settings.mjs';
import { encodeWav } from './wave-file.mjs';

const status = document.getElementById('status'), clips = document.getElementById('clips'), results = document.getElementById('results');
const rate = 48000, duration = 16;
const rms = values => Math.sqrt(values.reduce((sum, x) => sum+x*x, 0) / values.length);
const common = { ...TAPE_DEFAULTS, tapeOn: true, drive: 24, wow: 15, flutter: 8, hiss: 3, delayTime: .36, feedback: 47, delayMix: 42, springMix: 28, echoMode: 11 };
const variations = [
  { id: 'dry', title: 'Dry phrase', note: 'Tape Off at the instrument\'s 0.75 reference gain.', params: { tapeOn: false } },
  { id: 'classic', title: 'Classic Tape', note: 'The existing single echo and modulated direct tape path.', params: { tapeModel: 1 } },
  { id: 'space-echo', title: 'Space Echo, all heads and spring', note: 'Mode 11. Listen for head rhythms, darker repeat tails and the parallel spring.', params: { tapeModel: 2 } },
  { id: 'speed-glide', title: 'Space Echo, motor speed change', note: 'Mode 3. At 7 seconds, Head 3 time changes from 0.18 to 0.65 seconds. The old tape drops in pitch, then newly recorded notes settle.', params: { tapeModel: 2, echoMode: 3, delayTime: .18, springMix: 0 }, change: { delayTime: .65 } },
  { id: 'spring', title: 'Spring only', note: 'Mode 12. Echo level cannot add tape heads in this mode. Listen for the metallic return after each pluck.', params: { tapeModel: 2, echoMode: 12, springMix: 48 } }
];
function phrase(context) {
  const buffer = context.createBuffer(2, rate*duration, rate);
  const notes = [48,55,60,63,67,60,55,58];
  for(let channel=0;channel<2;channel++) {
    const data=buffer.getChannelData(channel);
    for(let i=0;i<data.length;i++) {
      const t=i/rate;
      if(t<1 || t>=12) continue;
      const beat=Math.floor((t-1)/.5), age=(t-1)-beat*.5;
      const frequency=440*Math.pow(2,(notes[beat%notes.length]-69)/12);
      const pluck=(Math.sin(2*Math.PI*frequency*age)+.35*Math.sin(2*Math.PI*frequency*2*age)+.14*Math.sin(2*Math.PI*frequency*5*age))*Math.exp(-age*15)*Math.min(1,age/.003);
      const chord=[130.8128,155.5635,195.9977].reduce((sum,hz)=>sum+Math.sin(2*Math.PI*hz*(t-1)),0)/3;
      const pad=chord*Math.min(1,(t-1)/1.5)*Math.min(1,(12-t)/1.5)*.07;
      data[i]=(pluck*.11*(channel?.85:1)+pad)*.65;
    }
  }
  return buffer;
}
async function renderClip(variation, sampleRate=rate, sourceBuffer) {
  const context = new OfflineAudioContext(2, sampleRate*duration, sampleRate);
  await context.audioWorklet.addModule('./build/tape-worklet.js?v=re201-1');
  const tape = new AudioWorkletNode(context, 'tape-delay', {numberOfInputs:1,outputChannelCount:[2],processorOptions:{params:{...common,...variation.params}}});
  tape.connect(context.destination);
  await new Promise((resolve,reject)=>{ const timer=setTimeout(()=>reject(Error('Tape Worklet did not become ready')),2000); tape.port.onmessage=({data})=>{if(data.type==='ready'){clearTimeout(timer);resolve();}}; });
  const source=context.createBufferSource();source.buffer=sourceBuffer||phrase(context);source.connect(tape);source.start();
  const suspended=variation.change?context.suspend(7):null;
  const rendering=context.startRendering();
  if(suspended){await suspended;tape.port.postMessage(variation.change);await new Promise(resolve=>setTimeout(resolve,20));await context.resume();}
  return rendering;
}
async function save(name, bytes) {
  const response=await fetch('/.listening-save/'+name,{method:'POST',body:bytes});
  if(!response.ok)throw Error('Comparison server did not save '+name+' ('+response.status+')');
}
async function renderAll() {
  clips.replaceChildren();results.textContent='';
  const build=await (await fetch('./build/manifest.json')).json();
  const harness=await fetch('./qa-space-echo.mjs').then(response=>response.text());
  const harnessHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(harness))),value=>value.toString(16).padStart(2,'0')).join('');
  const receipt={createdAt:new Date().toISOString(),buildInputs:build.inputs,harnessSha256:harnessHash,sampleRate:rate,seconds:duration,source:'deterministic synthesized plucks and chord; no hardware recording',gain:'one common source gain; no per-clip normalization',clips:[]};
  for(const variation of variations) {
    status.textContent='Rendering '+variation.title+'…';
    const buffer=await renderClip(variation), wav=encodeWav(buffer);
    const bytes=new Uint8Array(wav), hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),value=>value.toString(16).padStart(2,'0')).join('');
    const peak=Math.max(...Array.from({length:buffer.numberOfChannels},(_,c)=>buffer.getChannelData(c).reduce((peak,x)=>Math.max(peak,Math.abs(x)),0)));
    const section=document.createElement('section'), heading=document.createElement('h2'), note=document.createElement('p'),audio=document.createElement('audio'),link=document.createElement('a');
    heading.textContent=variation.title;note.textContent=variation.note;audio.controls=true;audio.preload='metadata';audio.src=URL.createObjectURL(new Blob([wav],{type:'audio/wav'}));link.href=audio.src;link.download='re201-'+variation.id+'.wav';link.textContent='Download WAV';section.append(heading,note,audio,link);clips.append(section);
    const entry={id:variation.id,params:{...common,...variation.params},change:variation.change||null,peak,rms:rms(buffer.getChannelData(0)),sha256:hash};receipt.clips.push(entry);
    try {await save('re201-'+variation.id+'.wav',wav);entry.saved=true;}catch{entry.saved=false;}
  }
  try {await save('re201-receipt.json',JSON.stringify(receipt,null,2));}catch{}
  window.spaceEchoReceipt=receipt;
  status.textContent='Five clips ready. All renders are 16 seconds at 48 kHz. Saved files are available on this preview when the listening server is running.';
  document.body.dataset.render='passed';
}
async function checks() {
  results.textContent='';let count=0;
  function check(condition,message){if(!condition)throw Error(message);results.textContent+='PASS '+message+'\n';count++;}
  for(const sampleRate of [44100,48000]) {
    const dry=await renderClip(variations[0],sampleRate), echo=await renderClip(variations[2],sampleRate), spring=await renderClip(variations[4],sampleRate);
    const tail=Math.round(sampleRate*12.2);
    check(echo.getChannelData(0).every(Number.isFinite),sampleRate+' Hz finite Worklet output');
    check(rms(echo.getChannelData(0).slice(tail))>1e-5,sampleRate+' Hz audible echo tail after the source');
    check(rms(spring.getChannelData(0).slice(tail))>1e-6,sampleRate+' Hz audible parallel spring tail');
    check(rms(dry.getChannelData(0).slice(tail))<1e-12,sampleRate+' Hz Off removes echo and spring');
    const difference=echo.getChannelData(0).map((x,i)=>x-dry.getChannelData(0)[i]);
    check(rms(difference)>.005,sampleRate+' Hz Space Echo differs audibly from bypass');
  }
  results.textContent+='\n'+count+' WORKLET CHECKS PASSED';document.body.dataset.result='passed';
}
for(const [id,action] of [['render',renderAll],['check',checks]])document.getElementById(id).onclick=async()=>{
  const buttons=[...document.querySelectorAll('button')];buttons.forEach(button=>button.disabled=true);
  try{await action();}catch(error){status.textContent=error.message;document.body.dataset.result='failed';}finally{buttons.forEach(button=>button.disabled=false);}
};
// Saved private renders can be played immediately, without waiting for new renders.
if(new URLSearchParams(location.search).has('saved')) {
  try {
    const response=await fetch('/.listening-artifacts/re201-receipt.json');if(!response.ok)throw Error('No saved comparison');
    window.spaceEchoReceipt=await response.json();
    for(const variation of variations){const section=document.createElement('section'),heading=document.createElement('h2'),note=document.createElement('p'),audio=document.createElement('audio');heading.textContent=variation.title;note.textContent=variation.note;audio.controls=true;audio.preload='metadata';audio.src='/.listening-artifacts/re201-'+variation.id+'.wav';section.append(heading,note,audio);clips.append(section);}
    status.textContent='Saved comparison ready. These are synthesized examples of our code, not recordings of an RE-201.';
  } catch(error){status.textContent=error.message+'. Render new clips to compare.';}
}
