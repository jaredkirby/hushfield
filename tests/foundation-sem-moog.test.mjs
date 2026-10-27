import test from 'node:test';
import assert from 'node:assert/strict';
import { AmbientEngine } from '../dist/ambient-dsp.mjs';
function render(instrument, controls={}, rate=8000, blockSize=128) {
 const e=new AmbientEngine(rate);e.set({instrument,compositionVersion:2,seed:719,hold:true,activity:0,melody:0,air:0,pads:85,...controls});e.play(true);
 const audio=new Float32Array(rate*3);
 for(let offset=0;offset<audio.length;offset+=blockSize){const n=Math.min(blockSize,audio.length-offset),out=[new Float32Array(n),new Float32Array(n)];e.process(out);audio.set(out[0],offset);assert.ok(out[1].every(Number.isFinite));}
 return audio;
}
const distance=(a,b)=>Math.sqrt(a.reduce((sum,value,i)=>sum+(value-b[i])**2,0)/a.length);
for(const instrument of ['sem','moog'])test(`${instrument} produces its own audible Foundation and responds to every macro`,()=>{
 const original=render('current'),base=render(instrument,{color:50,drift:50,bloom:50});
 assert.ok(distance(base,original)>.003,'Instrument changes audible Foundation output');
 for(const macro of ['color','drift','bloom'])assert.ok(distance(render(instrument,{[macro]:0}),render(instrument,{[macro]:100}))>.0003,`${macro} changes audible output`);
 for(const rate of [8000,44100,48000]){
  const output=render(instrument,{color:100,drift:100,bloom:100},rate);
  assert.ok(output.every(value=>Number.isFinite(value)&&Math.abs(value)<.5),'Output is finite and retains headroom');
  assert.ok(Math.sqrt(output.reduce((sum,value)=>sum+value*value,0)/output.length)>.003,'Output is audible');
 }
 assert.deepEqual(render(instrument),render(instrument,{},8000,97),'Seeded audio is independent of render block size');
});
test('SEM morph and Moog bass have distinct audible identities',()=>{
 assert.ok(distance(render('sem'),render('moog'))>.003);
});
test('Moog voices only the low chord dot while SEM retains all four voices',()=>{
 const points=[{x:.17,y:.35},{x:.39,y:.18},{x:.61,y:.78},{x:.83,y:.18}];
 assert.equal(distance(render('moog'),render('moog',{points})),0,'Upper chord dots do not add extra bass voices');
 assert.ok(distance(render('sem'),render('sem',{points}))>.003,'SEM still voices the complete chord');
});
test('Moog chord changes settle onto one bass pitch while preserving complete harmony',()=>{
 const rate=8000,e=new AmbientEngine(rate);e.set({instrument:'moog',compositionVersion:2,change:20,activity:0,melody:0,air:0,drift:0,bloom:0,color:50,seed:719});e.play(true);
 const oldMidi=e.status().chordNotes[0],audio=new Float32Array(rate);
 for(let offset=0;offset<rate*22;offset+=128){const out=[new Float32Array(128),new Float32Array(128)];e.process(out);if(offset>=rate*21)audio.set(out[0].subarray(0,Math.min(128,rate*22-offset)),offset-rate*21);}
 const harmony=e.status().chordNotes;assert.equal(harmony.length,4);
 const magnitude=midi=>{const frequency=440*2**((midi-69)/12)*.5;let real=0,imaginary=0;for(let i=0;i<audio.length;i++){const weight=.5-.5*Math.cos(2*Math.PI*i/(audio.length-1));real+=audio[i]*weight*Math.cos(2*Math.PI*frequency*i/rate);imaginary+=audio[i]*weight*Math.sin(2*Math.PI*frequency*i/rate);}return Math.hypot(real,imaginary);};
 assert.notEqual(oldMidi,harmony[0],'The harmony actually changed');
 assert.ok(magnitude(oldMidi)<magnitude(harmony[0])*.05,'Previous bass note does not overlap the settled new bass');
});
