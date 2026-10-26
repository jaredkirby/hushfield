import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {AmbientEngine} from '../dist/ambient-dsp.mjs';
import {OrbitEngine} from '../dist/orbit-dsp.mjs';

function worklet(file,name,options={},rate=8000){
  let Processor;
  class Base{constructor(){this.messages=[];this.port={postMessage:message=>this.messages.push(structuredClone(message))};}}
  const source=readFileSync(new URL(`../dist/${file}`,import.meta.url),'utf8').replace(/^import .*;\s*$/gm,'');
  const context={AudioWorkletProcessor:Base,AmbientEngine,OrbitEngine,sampleRate:rate,currentTime:0,Math:Object.assign(Object.create(Math),{random:()=>.5}),Float32Array,registerProcessor:(id,C)=>{if(id===name)Processor=C;}};
  vm.runInNewContext(source,context);
  const engine=new Processor({processorOptions:options});
  return {engine,context,send:data=>engine.port.onmessage({data})};
}
function channel(){
  const messages=[];
  const receiver={onmessage:null};
  return {sender:{postMessage:data=>{messages.push(data);receiver.onmessage?.({data});}},receiver,messages};
}
function process(worklet,seconds,rate=8000,channels=1){
  for(let at=0;at<Math.round(rate*seconds);at+=128){
    const length=Math.min(128,Math.round(rate*seconds)-at);
    const outputs=Array.from({length:channels},()=>[new Float32Array(length),new Float32Array(length)]);
    worklet.process([],outputs);
    for(const output of outputs)for(const side of output)for(const sample of side)assert(Number.isFinite(sample));
  }
}

test('Foundation publishes phrase directly on the audio clock, including attach/settings/play and paused harmony edits',()=>{
  const ambient=worklet('ambient-worklet.js','ambient-engine',{settings:{compositionVersion:2,evolution:100,activity:0,pads:0,air:0},playing:true});
  const texture=channel(),motion=channel();
  ambient.send({type:'phrasePort',port:texture.sender});
  assert.equal(texture.messages.length,1,'Attaching Grain gets the current phrase immediately');
  ambient.send({type:'harmonyPort',port:motion.sender});
  assert.equal(motion.messages.length,1,'Attaching Orbit gets notes and current phrase immediately');
  assert(Array.isArray(motion.messages[0].notes));
  process(ambient.engine,1.2);
  assert(texture.messages.length>=12,'At least ten phrase updates per audio second without main-thread polling');
  assert(texture.messages.at(-1).phrase.elapsed>1);
  assert(motion.messages.at(-1).phrase.elapsed>1);
  const before=texture.messages.length;
  ambient.send({type:'play',value:false});const elapsed=texture.messages.at(-1).phrase.elapsed;
  process(ambient.engine,.4);
  assert.equal(texture.messages.at(-1).phrase.elapsed,elapsed,'Pause stops phrase development');
  assert(texture.messages.length>before,'Pause publishes the current state');
  const previousChord=motion.messages.at(-1).notes.join(',');
  ambient.send({type:'settings',value:{key:7}});
  assert.notEqual(motion.messages.at(-1).notes.join(','),previousChord,'Harmony edits reach Orbit while paused');
  assert.equal(texture.messages.at(-1).phrase.elapsed,elapsed);
});

function textureRender(density){
  const grain=worklet('grain-worklet.js','grain-engine',{params:{size:20,density:20,spray:0,width:0,scanOn:false},playing:true});
  grain.send({type:'sample',channels:[new Float32Array(8000).fill(.3)],sampleRate:8000});
  if(density!==undefined){const direct=channel();grain.send({type:'phrasePort',port:direct.receiver});direct.sender.postMessage({phrase:{textureDensity:density}});}
  const pcm=[];
  for(let at=0;at<40000;at+=128){const length=Math.min(128,40000-at),out=[[new Float32Array(length),new Float32Array(length)]];grain.engine.process([],out);pcm.push(...out[0][0]);}
  let onsets=0,active=false;for(const sample of pcm){assert(Number.isFinite(sample));const next=Math.abs(sample)>1e-7;if(next&&!active)onsets++;active=next;}
  grain.send({type:'play',value:false});const stopped=[[new Float32Array(128),new Float32Array(128)]];grain.engine.process([],stopped);
  assert(stopped[0].every(side=>side.every(value=>value===0)),'Pausing Texture remains silent');
  return {pcm,onsets,messages:grain.engine.messages};
}
test('direct Foundation phrase changes Texture grain scheduling smoothly without changing saved density',()=>{
  const full=textureRender(),sparse=textureRender(.4);
  assert(full.onsets>=99&&full.onsets<=101,'Twenty-grain-per-second patch yields its expected full-density events');
  assert(sparse.onsets<full.onsets*.5&&sparse.onsets>full.onsets*.35,'Phrase makes room through fewer grains rather than a main-thread timer');
  assert(sparse.messages.some(message=>message.phraseDensity<.5),'Published audio state exposes the smoothed effective factor');
  assert.deepEqual(textureRender(1).pcm,full.pcm,'Classic unity leaves full-density PCM exact');
  assert.deepEqual(textureRender(NaN).pcm,full.pcm,'Malformed phrase falls back to classic density');
  assert(textureRender(500).onsets<=126,'Out-of-range phrase density is bounded');
});

function motionRender(density){
  const orbit=worklet('orbit-worklet.js','orbit-engine',{options:{balls:0,rpm:12,triggers:8,gravity:0}});
  if(density!==undefined){const direct=channel();orbit.send({type:'harmonyPort',port:direct.receiver});direct.sender.postMessage({notes:[48,51,55,58],phrase:{motionDensity:density}});}
  orbit.send({type:'transport',value:{simulate:true,audible:true}});
  const pcm=[];
  for(let at=0;at<161600;at+=128){orbit.context.currentTime=at/8000;const outputs=Array.from({length:12},()=>[new Float32Array(128),new Float32Array(128)]);orbit.engine.process([],outputs);pcm.push(...outputs[0][0]);}
  const hits=orbit.engine.messages.flatMap(message=>message.hits||[]),state=orbit.engine.messages.filter(message=>message.phase!==undefined).at(-1);
  orbit.send({type:'transport',value:{simulate:false,audible:false}});process(orbit.engine,.1,8000,12);
  const phase=orbit.engine.messages.at(-1).phase;
  orbit.send({type:'audition',bank:'triggers',index:0,midi:60});
  let auditionEnergy=0;
  for(let at=0;at<800;at+=128){const outputs=Array.from({length:12},()=>[new Float32Array(128),new Float32Array(128)]);orbit.engine.process([],outputs);for(const sample of outputs[6][0])auditionEnergy+=sample**2;}
  assert.equal(orbit.engine.messages.at(-1).phase,phase,'Paused transport stops physics');
  assert(auditionEnergy>.01,'Explicit auditions remain audible at reduced phrase density');
  return {pcm,hits,state,auditionEnergy};
}
test('direct phrase thins automatic Motion events deterministically while keeping physics and auditions alive',()=>{
  const full=motionRender(),sparse=motionRender(.35);
  assert.equal(full.hits.length,32);
  assert(sparse.hits.length>=11&&sparse.hits.length<=12,'Low-density phrase leaves intentional gaps');
  assert.equal(sparse.state.triggerCount,full.state.triggerCount,'Every physical pad crossing is retained');
  assert.equal(sparse.hits[0].index,full.hits[0].index,'The first trigger is never suppressed');
  assert.equal(sparse.auditionEnergy,full.auditionEnergy,'Auditions bypass automatic phrase gating');
  assert.equal(sparse.state.phrase.motionDensity,.35);
  assert.deepEqual(motionRender(.35).hits,sparse.hits,'Automatic thinning is repeatable without randomness');
  assert.deepEqual(motionRender(1).pcm,full.pcm,'Unity phrase keeps classic PCM exact');
  assert.deepEqual(motionRender(NaN).pcm,full.pcm,'Invalid density restores unity');
});

test('a linked one-minute Piece hands space from Motion to Texture without any main-thread updates',()=>{
  const rate=2000,ambient=worklet('ambient-worklet.js','ambient-engine',{settings:{compositionVersion:2,evolution:100,activity:0,pads:0,melody:0,air:0},playing:true},rate);
  const texture=worklet('grain-worklet.js','grain-engine',{params:{size:12,density:20,width:0,spray:0},playing:true},rate);
  texture.send({type:'sample',channels:[new Float32Array(rate).fill(.3)],sampleRate:rate});
  const motion=worklet('orbit-worklet.js','orbit-engine',{options:{balls:0,rpm:12,triggers:8,gravity:0}},rate);
  motion.send({type:'transport',value:{simulate:true,audible:true}});
  const grainChannel=channel(),orbitChannel=channel();
  texture.send({type:'phrasePort',port:grainChannel.receiver});motion.send({type:'harmonyPort',port:orbitChannel.receiver});
  ambient.send({type:'phrasePort',port:grainChannel.sender});ambient.send({type:'harmonyPort',port:orbitChannel.sender});
  let earlyGrains=0,lateGrains=0,active=false;
  for(let at=0;at<rate*60;at+=128){
    const count=Math.min(128,rate*60-at),a=[[new Float32Array(count),new Float32Array(count)]],g=[[new Float32Array(count),new Float32Array(count)]],o=Array.from({length:12},()=>[new Float32Array(count),new Float32Array(count)]);
    for(const part of [ambient,texture,motion])part.context.currentTime=at/rate;
    ambient.engine.process([],a);texture.engine.process([],g);motion.engine.process([],o);
    for(let i=0;i<count;i++){const next=Math.abs(g[0][0][i])>1e-7;if(next&&!active){if(at+i<rate*20)earlyGrains++;else if(at+i>=rate*40)lateGrains++;}active=next;}
  }
  const hits=motion.engine.messages.flatMap(message=>message.hits||[]),earlyNotes=hits.filter(hit=>hit.audioTime<20).length,lateNotes=hits.filter(hit=>hit.audioTime>=40).length;
  assert(lateGrains>earlyGrains*1.6,'Texture develops into the foreground');
  assert(lateNotes<earlyNotes*.7,'Motion leaves more rests as Texture grows');
  assert(grainChannel.messages.at(-1).phrase.elapsed>59.9);
  assert.equal(orbitChannel.messages.at(-1).notes.length,4,'Direct harmony accompanies the phrase throughout');
});
