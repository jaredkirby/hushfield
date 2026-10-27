import test from 'node:test';
import assert from 'node:assert/strict';
import { AmbientEngine } from '../dist/ambient-dsp.mjs';

function render(instrument, extra={}, rate=8000, block=128, seconds=3){
 const engine=new AmbientEngine(rate);engine.set({instrument,compositionVersion:2,seed:731,hold:true,activity:0,melody:0,air:0,drift:0,bloom:0,...extra});engine.play(true);
 const out=new Float32Array(Math.round(rate*seconds));for(let at=0;at<out.length;at+=block){const n=Math.min(block,out.length-at),channels=[new Float32Array(n),new Float32Array(n)];engine.process(channels);out.set(channels[0],at);}return out;
}
function rms(a){let sum=0;for(const x of a)sum+=x*x;return Math.sqrt(sum/a.length);}
function distance(a,b){let sum=0;for(let i=0;i<a.length;i++)sum+=(a[i]-b[i])**2;return Math.sqrt(sum/a.length);}

test('Chorus synth and Complex synth produce distinct Foundation audio',()=>{
 const current=render('current'),juno=render('juno'),buchla=render('buchla');
 assert.ok(distance(current,juno)>.006,'Chorus synth changes the audible voice');
 assert.ok(distance(current,buchla)>.006,'Complex synth changes the audible voice');
 assert.ok(distance(juno,buchla)>.006,'The two instruments have different characters');
});

test('Chorus and Complex synth controls change held Foundation audio without losing headroom',()=>{
 for(const instrument of ['juno','buchla']){
  const quiet=render(instrument,{color:20});
  for(const macro of ['color','drift','bloom']){
   const changed=render(instrument,{color:20,[macro]:100});
   assert.ok(distance(quiet,changed)>.0005,`${instrument} ${macro} changes audible output`);
   assert.ok(rms(changed)>.003,`${instrument} ${macro} retains usable level`);
  }
  for(const rate of [4000,44100,48000]){
   const samples=render(instrument,{color:100,drift:100,bloom:100,melody:100,activity:100},rate,128,2);
   assert.ok(samples.every(Number.isFinite),`${instrument} remains finite at ${rate}`);
   assert.ok(samples.every(value=>Math.abs(value)<.8),`${instrument} retains headroom at ${rate}`);
  }
 }
});

test('Chorus and Complex synth movement is repeatable across render blocks',()=>{
 for(const instrument of ['juno','buchla']){
  const settings={color:78,drift:82,bloom:73};
  const a=render(instrument,settings,8000,128,4);
  assert.deepEqual(a,render(instrument,settings,8000,97,4),`${instrument} is independent of block boundaries`);
  assert.ok(distance(a,render(instrument,{...settings,seed:732},8000,128,4))>.001,`${instrument} uses seeded voice movement`);
 }
});

function highFrequencyRatio(values){let energy=0,difference=0;for(let i=values.length>>1;i<values.length;i++){energy+=values[i]*values[i];difference+=(values[i]-values[i-1])**2;}return difference/energy;}
test('Color opens Chorus synth brightness and adds Complex synth upper harmonics',()=>{
 for(const instrument of ['juno','buchla']){
  const dark=render(instrument,{color:0},8000,128,4),bright=render(instrument,{color:100},8000,128,4);
  assert.ok(highFrequencyRatio(bright)>highFrequencyRatio(dark)*1.3,`${instrument} Color audibly increases upper-frequency energy ${highFrequencyRatio(bright)/highFrequencyRatio(dark)}`);
 }
});

test('Chorus synth produces moving stereo output even with centered Foundation voices',()=>{
 const engine=new AmbientEngine(8000);engine.set({instrument:'juno',compositionVersion:2,hold:true,seed:731,activity:0,melody:0,air:0,drift:100,points:Array.from({length:4},()=>({x:.5,y:.5}))});engine.play(true);
 let sides=0,mid=0;for(let block=0;block<250;block++){const channels=[new Float32Array(128),new Float32Array(128)];engine.process(channels);if(block>125)for(let i=0;i<128;i++){sides+=(channels[0][i]-channels[1][i])**2;mid+=(channels[0][i]+channels[1][i])**2;}}
 assert.ok(sides/mid>.0001,'Chorus gives a centered dry Foundation stereo movement');
});

function settledStereoLevel(instrument, settings, rate){
 const engine=new AmbientEngine(rate);engine.set({instrument,compositionVersion:2,hold:true,activity:0,melody:0,air:0,...settings});engine.play(true);
 let energy=0,count=0,peak=0;
 for(let at=0;at<rate*12;at+=128){
  const channels=[new Float32Array(128),new Float32Array(128)];engine.process(channels);
  for(const channel of channels)for(const value of channel){
   assert.ok(Number.isFinite(value),'Foundation output stays finite');
   peak=Math.max(peak,Math.abs(value));
   if(at>=rate*6){energy+=value*value;count++;}
  }
 }
 return {rms:Math.sqrt(energy/count),peak};
}

test('Chorus synth stays within 6 dB of Hushfield across dark, default and bright held chords',()=>{
 // Compare settled stereo output at the same Blend, after the shared attack.
 // This bounds switching volume without normalizing away instrument dynamics.
 for(const rate of [44100,48000])for(const seed of [719,731])for(const color of [0,38,100]){
  const settings={seed,color};
  const reference=settledStereoLevel('current',settings,rate);
  const chorus=settledStereoLevel('juno',settings,rate);
  const differenceDb=20*Math.log10(chorus.rms/reference.rms);
  assert.ok(Math.abs(differenceDb)<=6,`${rate} Hz seed ${seed} Color ${color}: Chorus level differs by ${differenceDb.toFixed(2)} dB`);
  assert.ok(chorus.peak<.8,'Chorus retains output headroom');
 }
});
