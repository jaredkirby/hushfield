import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeProject, serializeProject } from '../dist/project-file.mjs';
import { AmbientEngine } from '../dist/ambient-dsp.mjs';
import { AMBIENT_DEFAULTS, AMBIENT_SCENES, restoreAmbient, applyAmbientScene } from '../dist/ambient-settings.mjs';
import { selectPiecePreset } from '../dist/piece-presets.mjs';
import { createSessionRecovery } from '../dist/session-recovery.mjs';
const buffer={length:8,duration:8/48000,sampleRate:48000,numberOfChannels:1,getChannelData:()=>new Float32Array(8)};
const options={decodeAudio:async()=>buffer,defaults:{},ranges:{},controls:{}};
const instruments=['current','solina','juno','buchla','sem','moog'];
for(const instrument of instruments)test(`${instrument} survives project export and import with its expressive settings`,async()=>{
 const ambient={...AMBIENT_DEFAULTS,instrument,compositionVersion:2,seed:451,color:71,drift:24,bloom:87,key:3,hold:true};
 const text=serializeProject({buffer,ambient,params:{},controls:{}});
 assert.equal(JSON.parse(text).version,6);
 assert.deepEqual((await decodeProject(text,options)).ambient,restoreAmbient(ambient));
});
test('older Pieces retain their original instrument and composition rules after re-export',async()=>{
 for(const version of [1,2,3,4,5]){
  const saved={...JSON.parse(serializeProject({buffer,ambient:{...AMBIENT_DEFAULTS,instrument:'solina',compositionVersion:2},params:{},controls:{}})),version};
  const restored=await decodeProject(JSON.stringify(saved),options);
  assert.equal(restored.ambient.instrument,'current');
  assert.equal(restored.ambient.compositionVersion,version===5?2:1);
  const reopened=await decodeProject(serializeProject(restored),options);
  assert.equal(reopened.ambient.instrument,'current');
  assert.equal(reopened.ambient.compositionVersion,version===5?2:1);
 }
});
test('missing and malformed instrument choices fall back to the original Foundation',async()=>{
 for(const instrument of [undefined,null,'future-instrument',1,{},['solina']]){
  const text=serializeProject({buffer,ambient:{instrument,compositionVersion:2},params:{},controls:{}});
  assert.equal((await decodeProject(text,options)).ambient.instrument,'current');
 }
 assert.equal(restoreAmbient({seed:10}).instrument,'current');
 assert.equal(restoreAmbient({seed:10}).compositionVersion,1,'Saved settings without an explicit model remain classic');
 assert.equal(restoreAmbient().compositionVersion,2,'Fresh settings remain expressive');
});
function render(instrument,block=128){const engine=new AmbientEngine(12000);engine.set({instrument,air:0,melody:0,seed:42});engine.play(true);const out=new Float32Array(24000);for(let at=0;at<out.length;at+=block){const n=Math.min(block,out.length-at),channels=[new Float32Array(n),new Float32Array(n)];engine.process(channels);out.set(channels[0],at);}return out;}
test('Solina produces a distinct deterministic Foundation signal independent of audio block size',()=>{
 const solina=render('solina'),renderedCurrent=render('current');
 assert.ok(solina.some((v,i)=>v!==renderedCurrent[i]));
 assert.deepEqual(solina,render('solina',97));
 assert.ok(solina.every(Number.isFinite));
 assert.ok(solina.some(v=>Math.abs(v)>.005));
});
test('Solina shared ensemble gives centered voices a stereo image',()=>{
 const engine=new AmbientEngine(12000);engine.set({instrument:'solina',air:0,melody:0,points:[0,1,2,3].map(()=>({x:.5,y:.5}))});engine.play(true);let difference=0;
 for(let block=0;block<200;block++){const channels=[new Float32Array(128),new Float32Array(128)];engine.process(channels);for(let i=0;i<128;i++)difference+=Math.abs(channels[0][i]-channels[1][i]);}
 assert.ok(difference>1,'Shared ensemble should widen centered Foundation voices');
});

test('Scenes preserve the selected instrument and whole Piece presets select the original voice',()=>{
 for(const instrument of instruments){
  const settings=restoreAmbient({...AMBIENT_DEFAULTS,instrument,seed:751});
  for(let scene=0;scene<AMBIENT_SCENES.length;scene++){
   applyAmbientScene(settings,scene);
   assert.equal(settings.instrument,instrument);
   assert.equal(settings.seed,751);
  }
 }
 for(const preset of ['still','cloud','shards','worn']){
  const result=selectPiecePreset(preset,{defaults:{},cancelPending(){}});
  assert.equal(result.ambient.instrument,'current');
  assert.equal(result.ambient.compositionVersion,2);
 }
});

test('explicit recovery retains every instrument through the saved project interface',async()=>{
 for(const instrument of instruments){
  let saved,restored;
  const store={read:async()=>saved,write:async value=>{saved=value;},remove:async()=>{saved=undefined;}};
  const snapshot=()=>serializeProject({buffer,ambient:{...AMBIENT_DEFAULTS,instrument,color:67,seed:911},params:{},controls:{}});
  const dependencies={store,snapshot,restore:async text=>{restored=await decodeProject(text,options);},schedule:()=>0,unschedule(){}};
  const first=createSessionRecovery(dependencies);await first.ready;first.edited();await first.flush();
  const reopened=createSessionRecovery(dependencies);await reopened.ready;
  assert.equal(reopened.available,true);
  assert.equal(restored,undefined,'Drafts wait for explicit recovery');
  assert.equal(await reopened.recover(),true);
  assert.equal(restored.ambient.instrument,instrument);
  assert.equal(restored.ambient.color,67);
  assert.equal(restored.ambient.seed,911);
 }
});

function renderSolina(settings={},rate=8000,seconds=3){
 const engine=new AmbientEngine(rate);engine.set({instrument:'solina',compositionVersion:2,hold:true,activity:0,air:0,melody:0,seed:143,color:20,drift:0,bloom:0,...settings});engine.play(true);
 const out=new Float32Array(Math.round(rate*seconds)),right=new Float32Array(out.length);for(let at=0;at<out.length;at+=128){const n=Math.min(128,out.length-at),channels=[new Float32Array(n),new Float32Array(n)];engine.process(channels);out.set(channels[0],at);right.set(channels[1],at);}return {engine,out,right};
}
test('String ensemble Color, Drift and Bloom each change held Foundation audio',()=>{
 const baseline=renderSolina().out;
 for(const macro of ['color','drift','bloom']){
  const {out}=renderSolina({[macro]:100});let error=0;for(let i=0;i<out.length;i++)error+=(out[i]-baseline[i])**2;
  assert.ok(Math.sqrt(error/out.length)>.0005,`${macro} audibly changes String ensemble`);
 }
});
test('String ensemble retains stereo headroom at supported rates and stops to silence',()=>{
 for(const rate of [4000,44100,48000]){
  const {engine,out,right}=renderSolina({color:100,drift:100,bloom:100,melody:100,activity:100},rate,2);
  assert.ok([out,right].every(channel=>channel.every(value=>Number.isFinite(value)&&Math.abs(value)<.8)));
  engine.play(false);
  for(let at=0;at<rate*2;at+=128){const channels=[new Float32Array(128),new Float32Array(128)];engine.process(channels);assert.ok(channels.every(channel=>channel.every(value=>Number.isFinite(value)&&Math.abs(value)<.8)));}
  const tail=[new Float32Array(128),new Float32Array(128)];engine.process(tail);
  assert.ok(tail.every(channel=>channel.every(value=>value===0)),`String ensemble stops at ${rate} Hz`);
 }
});
