import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AmbientEngine} from '../dist/ambient-dsp.mjs';
const ids=['current','solina','juno','buchla','sem','moog'];
function block(engine,n=128){const channels=[new Float32Array(n),new Float32Array(n)];engine.process(channels);return channels;}
function metrics(channels,last=[0,0]){let peak=0,step=0;for(let c=0;c<2;c++){for(const x of channels[c]){assert.ok(Number.isFinite(x));peak=Math.max(peak,Math.abs(x));step=Math.max(step,Math.abs(x-last[c]));last[c]=x;}}return {peak,step,last};}
test('rapid instrument reversals, reseeding and macro corners keep Foundation output bounded and continuous',t=>{
 const engine=new AmbientEngine(48000);engine.set({pads:85,melody:65,air:40,change:20});engine.play(true);let last=[0,0],steadyStep=0,transitionStep=0,peak=0;
 for(let i=0;i<750;i++){const m=metrics(block(engine),last);last=m.last;steadyStep=Math.max(steadyStep,m.step);}
 for(let i=0;i<420;i++){
  if(i%9===0)engine.set({instrument:ids[Math.floor(i/9)%ids.length],color:i%18?0:100,drift:i%18?100:0,bloom:i%27?0:100});
  if(i%47===0)engine.set({key:(i/47|0)%12,seed:100+i});
  const m=metrics(block(engine),last);last=m.last;peak=Math.max(peak,m.peak);transitionStep=Math.max(transitionStep,m.step);
 }
 t.diagnostic(JSON.stringify({steadyMaxSampleStep:steadyStep,transitionMaxSampleStep:transitionStep,transitionPeak:peak}));
 assert.ok(peak<.85,`Peak ${peak}`);
 assert.ok(transitionStep<Math.max(.06,steadyStep*5),`Transition step ${transitionStep}; steady ${steadyStep}`);
});
test('each Foundation instrument fades to silence and resumes after stop including effect history',()=>{
 for(const instrument of ids){const engine=new AmbientEngine(12000);engine.set({instrument,pads:90,melody:60,air:20});engine.play(true);for(let i=0;i<150;i++)block(engine);engine.play(false);let stopped;for(let i=0;i<180;i++)stopped=block(engine);assert.ok(stopped.every(c=>c.every(v=>v===0)),instrument+' stops');engine.play(true);let energy=0;for(let i=0;i<80;i++)for(const c of block(engine))for(const x of c){assert.ok(Number.isFinite(x));energy+=x*x;}assert.ok(energy>.01,instrument+' resumes');}
});
test('returning to a previously used instrument and changing seed retains deterministic stereo output',()=>{
 function run(){const engine=new AmbientEngine(12000);engine.play(true);const result=[];for(const instrument of ['juno','solina','juno','moog','solina']){engine.set({instrument,seed:4301,color:80,bloom:100,drift:75});for(let i=0;i<60;i++)result.push(...block(engine)[0]);}return result;}
 assert.deepEqual(run(),run());
});
test('entering Bass synth during a chord crossfade retains only the current bass pitch',()=>{
 const rate=8000,engine=new AmbientEngine(rate);engine.set({instrument:'current',change:20,activity:0,melody:0,air:0,drift:0,bloom:0,color:50,seed:719});engine.play(true);
 const oldMidi=engine.status().chordNotes[0],audio=new Float32Array(rate);let selected=false;
 for(let offset=0;offset<rate*22;offset+=128){if(!selected&&offset>=rate*20.2){engine.set({instrument:'moog'});selected=true;}const out=block(engine);if(offset>=rate*21)audio.set(out[0].subarray(0,Math.min(128,rate*22-offset)),offset-rate*21);}
 const harmony=engine.status().chordNotes;assert.equal(harmony.length,4);
 const magnitude=midi=>{const frequency=440*2**((midi-69)/12)*.5;let real=0,imaginary=0;for(let i=0;i<audio.length;i++){const weight=.5-.5*Math.cos(2*Math.PI*i/(audio.length-1));real+=audio[i]*weight*Math.cos(2*Math.PI*frequency*i/rate);imaginary+=audio[i]*weight*Math.sin(2*Math.PI*frequency*i/rate);}return Math.hypot(real,imaginary);};
 assert.notEqual(oldMidi,harmony[0]);assert.ok(magnitude(oldMidi)<magnitude(harmony[0])*.05,'Outgoing chord must not become a second bass');
});
