import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const code=fs.readFileSync(new URL('../dist/grain-worklet.js',import.meta.url),'utf8');
function makeEngine(){let Processor;class Base{constructor(){this.port={postMessage:()=>{}};}};vm.runInNewContext(code,{AudioWorkletProcessor:Base,sampleRate:48000,Math,registerProcessor:(name,C)=>{if(name==='grain-engine')Processor=C;}});return new Processor();}
function message(e,m){e.port.onmessage({data:m});}
function render(e,seconds){const values=[];for(let k=0;k<Math.ceil(seconds*48000/128);k++){const out=[[new Float32Array(128),new Float32Array(128)]];e.process([],out);values.push(...out[0][0]);}return values;}
function rms(a){return Math.sqrt(a.reduce((s,v)=>s+v*v,0)/a.length);}
const source=new Float32Array(48000);for(let i=0;i<source.length;i++)source[i]=Math.sin(i/48000*440*2*Math.PI)*.5;
function setup(p={}){const e=makeEngine();message(e,{type:'sample',channels:[source],sampleRate:48000,position:.5});message(e,{type:'params',params:{position:.5,size:200,density:20,spray:0,width:0,pitch:0,scanOn:false,...p}});message(e,{type:'play',value:true});return e;}
const e=setup();const samples=render(e,.7);assert(samples.every(Number.isFinite));assert(rms(samples)>.05,'Granular engine must produce an audible signal');assert(Math.max(...samples.map(Math.abs))<2,'Normal texture remains bounded');
message(e,{type:'play',value:false});assert.equal(rms(render(e,.1)),0,'Pause must silence and clear grains');
const pitched=render(setup({pitch:12}),.8).slice(12000);let crossings=0;for(let i=1;i<pitched.length;i++)if(pitched[i-1]<0&&pitched[i]>=0)crossings++;const estimated=crossings/(pitched.length/48000);assert(Math.abs(estimated-880)<4,`Octave pitch should double frequency, got ${estimated}`);
const frozen=setup({scanOn:true,freeze:true,speed:1});render(frozen,.3);assert.equal(frozen.scan,.5,'Freeze holds scan position');
const scanning=setup({scanOn:true,speed:.5});render(scanning,.3);assert(scanning.scan>.64&&scanning.scan<.66,'Scan advances at the selected rate');
const reverse=render(setup({reverse:100,pitch:-12}),.4);assert(rms(reverse)>.04&&reverse.every(Number.isFinite),'Reverse grains render valid non-silent audio');
const dense=setup({density:80,size:1500,chaos:100,elastic:100,reverse:50,tapeOn:true,wow:100,flutter:100,hiss:100});const stress=render(dense,2);assert(stress.every(Number.isFinite));assert(dense.grains.length<=160,'Grain count remains bounded');
const empty=makeEngine();message(empty,{type:'play',value:true});assert.equal(rms(render(empty,.1)),0);
console.log('PASS: audible finite output, pause, octave pitch, freeze, scan timing, reverse, bounded dense texture, empty input.');
let Recorder;
class CaptureBase{constructor(){this.messages=[];this.port={postMessage:m=>this.messages.push(m)};}}
vm.runInNewContext(code,{AudioWorkletProcessor:CaptureBase,sampleRate:48000,Math,registerProcessor:(name,C)=>{if(name==='capture-engine')Recorder=C;}});
const recorder=new Recorder();recorder.port.onmessage({data:{type:'start'}});recorder.process([[new Float32Array([.1,.2,.3]),new Float32Array([-.1,-.2,-.3])]]);recorder.port.onmessage({data:{type:'stop'}});assert.equal(recorder.messages[0].type,'chunk');assert.equal(recorder.messages[0].left.length,3);assert(Math.abs(recorder.messages[0].right[1]+.2)<.00001);assert.equal(recorder.messages[1].type,'done');console.log('PASS: post-effects PCM capture preserves stereo samples and flushes before completion.');
