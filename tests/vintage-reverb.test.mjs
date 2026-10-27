import test from 'node:test';
import assert from 'node:assert/strict';
import { generateReverbImpulse } from '../dist/vintage-reverb.mjs';
test('vintage models produce deterministic finite stereo tails with distinct acoustic responses', () => {
  const tails = ['plate','spring','chamber'].map(reverbModel => generateReverbImpulse(12000,{reverbModel,reverbDecay:1}));
  for (let m=0;m<3;m++) {
    assert.equal(tails[m].length,2);
    assert.ok(tails[m][0].length >= 12000);
    assert.ok(tails[m].every(channel => channel.every(Number.isFinite)));
    assert.deepEqual(tails[m],generateReverbImpulse(12000,{reverbModel:['plate','spring','chamber'][m],reverbDecay:1}));
    assert.notDeepEqual(tails[m][0],tails[m][1]);
  }
  assert.notDeepEqual(tails[0],tails[1]); assert.notDeepEqual(tails[1],tails[2]);
});
const energy = values => values.reduce((sum,value)=>sum+value*value,0);
test('decay extends late energy while every model stays bounded at low sample rates', () => {
  for (const reverbModel of ['plate','spring','chamber']) {
    const short=generateReverbImpulse(8000,{reverbModel,reverbDecay:.5})[0];
    const long=generateReverbImpulse(8000,{reverbModel,reverbDecay:8})[0];
    assert.equal(short.length,4000); assert.equal(long.length,64000);
    assert.ok(energy(long.slice(8000)) > .01);
    assert.ok(Math.max(...short.map(Math.abs)) < 1);
    assert.ok(energy(long.slice(-8000)) < energy(long.slice(0,8000)) * .0001);
  }
});

test('plate diffusion builds reflection density and chamber retains discrete early walls', () => {
  const rate=48000, plate=generateReverbImpulse(rate,{reverbModel:'plate',reverbDecay:2})[0];
  const density=(start,end)=>{const window=plate.slice(start*rate,end*rate);return window.filter(value=>Math.abs(value)>1e-6).length/window.length;};
  assert.ok(density(.2,.22)>.9);
  assert.ok(density(.031,.051)<.2);
  const chamber=generateReverbImpulse(rate,{reverbModel:'chamber',reverbDecay:2})[0];
  assert.equal(energy(chamber.slice(0,.012*rate)),0);
  assert.ok(Math.abs(chamber[Math.round(.013*rate)])>.1);
  assert.equal(energy(chamber.slice(Math.round(.014*rate),Math.round(.020*rate))),0);
});

test('spring arrival timing disperses by frequency rather than a common fixed delay',()=>{
  const rate=48000, samples=generateReverbImpulse(rate,{reverbModel:'spring',reverbDecay:.5})[0].slice(0,4800);
  const phase=frequency=>{let real=0,imaginary=0;for(let i=0;i<samples.length;i++){const angle=2*Math.PI*frequency*i/rate;real+=samples[i]*Math.cos(angle);imaginary-=samples[i]*Math.sin(angle);}return Math.atan2(imaginary,real);};
  const groupDelay=frequency=>{const delta=phase(frequency+1)-phase(frequency);return -Math.atan2(Math.sin(delta),Math.cos(delta))/(2*Math.PI);};
  assert.ok(Math.abs(groupDelay(200)-groupDelay(3000))>.003);
});
