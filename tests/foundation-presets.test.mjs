import test from 'node:test';
import assert from 'node:assert/strict';
import { FOUNDATION_PRESETS, applyFoundationPreset, matchingFoundationPreset } from '../dist/foundation-presets.mjs';
import { AMBIENT_DEFAULTS, FOUNDATION_INSTRUMENTS } from '../dist/ambient-settings.mjs';
import { AmbientEngine } from '../dist/ambient-dsp.mjs';
import { serializeProject, decodeProject } from '../dist/project-file.mjs';

const buffer={length:8,duration:8/48000,sampleRate:48000,numberOfChannels:1,getChannelData:()=>new Float32Array(8)};
const options={defaults:{},ranges:{},controls:{},decodeAudio:async()=>buffer};

test('a starting sound changes Foundation while retaining the player’s composition and surroundings',()=>{
 const original={...AMBIENT_DEFAULTS,instrument:'moog',compositionVersion:1,scene:2,key:7,scale:2,change:96,activity:65,evolution:80,seed:321,hold:true,space:90,grains:35,orbit:45};
 const owned=new Set(['instrument','compositionVersion','color','drift','bloom','pads','melody','air']);
 for(const preset of FOUNDATION_PRESETS){
  const selected=applyFoundationPreset(original,preset.id);
  for(const key of Object.keys(original))if(!owned.has(key))assert.equal(selected[key],original[key],key+' stays with the Piece');
  assert.equal(selected.compositionVersion,2);
  assert.equal(matchingFoundationPreset(selected)?.id,preset.id);
  assert.equal(matchingFoundationPreset({...selected,color:selected.color+1}),null);
  assert.equal(matchingFoundationPreset({...selected,compositionVersion:1}),null);
  assert.equal(matchingFoundationPreset({...selected,key:11})?.id,preset.id);
 }
 assert.equal(original.instrument,'moog');assert.equal(original.compositionVersion,1);
 assert.equal(applyFoundationPreset(original,'missing'),original);
 assert.equal(matchingFoundationPreset({...AMBIENT_DEFAULTS,instrument:'juno'})?.id,'juno-stillwater');
});

test('starting sounds survive real project save/load without storing a preset label',async()=>{
 for(const preset of FOUNDATION_PRESETS){
  const ambient=applyFoundationPreset({...AMBIENT_DEFAULTS,key:7,hold:true,seed:1701},preset.id);
  const serialized=serializeProject({buffer,ambient,params:{},controls:{}});
  const restored=await decodeProject(serialized,options);
  assert.deepEqual(restored.ambient,ambient);
  assert.equal(matchingFoundationPreset(restored.ambient)?.id,preset.id);
  assert.equal(Object.hasOwn(JSON.parse(serialized).ambient,'foundationPreset'),false);
 }
});

function render(settings,rate){
 const engine=new AmbientEngine(rate);engine.set(settings);engine.play(true);
 const output=[new Float32Array(rate*3),new Float32Array(rate*3)];
 for(let at=0;at<output[0].length;at+=128){
  const n=Math.min(128,output[0].length-at),channels=[new Float32Array(n),new Float32Array(n)];
  engine.process(channels);for(let c=0;c<2;c++)output[c].set(channels[c],at);
 }
 return output;
}
function rms(values){let energy=0;for(const value of values)energy+=value*value;return Math.sqrt(energy/values.length);}
function distance(a,b){let energy=0;for(let i=0;i<a.length;i++)energy+=(a[i]-b[i])**2;return Math.sqrt(energy/a.length);}

test('every instrument offers three audible, distinct starting sounds with stereo headroom at playback rates',t=>{
 assert.equal(FOUNDATION_PRESETS.length,18);
 assert.equal(new Set(FOUNDATION_PRESETS.map(p=>p.id)).size,18);
 assert.ok(Object.isFrozen(FOUNDATION_PRESETS));
 for(const instrument of FOUNDATION_INSTRUMENTS){
  const presets=FOUNDATION_PRESETS.filter(p=>p.instrument===instrument);
  assert.equal(presets.length,3);
  for(const rate of [44100,48000]){
   const renders=presets.map(preset=>render(applyFoundationPreset({...AMBIENT_DEFAULTS,seed:731},preset.id),rate));
   for(let a=0;a<renders.length;a++){
    assert.ok(Object.isFrozen(presets[a]));assert.ok(Object.isFrozen(presets[a].settings));
    let peak=0;
    for(const channel of renders[a])for(const value of channel){assert.ok(Number.isFinite(value));peak=Math.max(peak,Math.abs(value));}
    const level=rms(renders[a][0]);
    assert.ok(peak<.8,`${presets[a].id} peak ${peak} retains headroom`);
    assert.ok(level>.003,`${presets[a].id} RMS ${level} is audible`);
    let nearest=Infinity;
    for(let b=0;b<a;b++){
     const difference=distance(renders[a][0],renders[b][0]);nearest=Math.min(nearest,difference);
     assert.ok(difference>.002,`${presets[a].id} and ${presets[b].id} differ beyond a tiny PCM change: ${difference}`);
    }
    t.diagnostic(`${rate} Hz ${presets[a].id}: peak=${peak.toFixed(4)}, RMS=${level.toFixed(4)}${Number.isFinite(nearest)?', distance='+nearest.toFixed(4):''}`);
   }
  }
 }
});

test('explicit draft recovery restores the selected sound from actual Foundation values',async()=>{
 const {createSessionRecovery}=await import('../dist/session-recovery.mjs');
 let saved,restored;
 const store={read:async()=>saved,write:async value=>{saved=value;},remove:async()=>{saved=undefined;}};
 const ambient=applyFoundationPreset({...AMBIENT_DEFAULTS,key:7,hold:true,seed:1701},'sem-estuary');
 const dependencies={store,snapshot:()=>serializeProject({buffer,ambient,params:{},controls:{}}),restore:async text=>{restored=await decodeProject(text,options);},schedule:()=>0,unschedule(){}};
 const first=createSessionRecovery(dependencies);await first.ready;first.edited();await first.flush();
 const reopened=createSessionRecovery(dependencies);await reopened.ready;
 assert.equal(reopened.available,true);assert.equal(restored,undefined);
 assert.equal(await reopened.recover(),true);
 assert.equal(matchingFoundationPreset(restored.ambient)?.id,'sem-estuary');
 assert.deepEqual(restored.ambient,ambient);
});
