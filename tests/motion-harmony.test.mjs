import test from 'node:test';
import assert from 'node:assert/strict';
import { OrbitEngine } from '../dist/orbit-dsp.mjs';
import { createSoundState } from '../dist/sound-patches.mjs';

function pitch(chord,follow=true) {
  const engine=new OrbitEngine(48000), patches=createSoundState();
  Object.assign(patches.triggers.base,{wave:'sine',attack:.002,decay:.01,sustain:100,gate:1,release:.1,cutoff:20000,pan:0});
  engine.setPatches(patches); engine.setHarmony(chord); engine.followHarmony=follow;
  engine.audition('triggers',0,61);
  const samples=[];
  for(let block=0;block<190;block++) {
    const outputs=Array.from({length:12},()=>[new Float32Array(128),new Float32Array(128)]);
    engine.process(outputs);if(block>20)samples.push(...outputs[6][0]);
  }
  let crossings=0;for(let i=1;i<samples.length;i++)if(samples[i-1]<0&&samples[i]>=0)crossings++;
  return crossings/(samples.length/48000);
}
test('Motion auditions follow the current Foundation chord and can explicitly unlink',()=>{
  assert.ok(Math.abs(pitch([62,65,69])-293.665)<4,'D minor maps C sharp to D');
  assert.ok(Math.abs(pitch([63,67,70])-311.127)<4,'E flat maps C sharp to E flat');
  assert.ok(Math.abs(pitch([63,67,70],false)-277.183)<4,'unlinked patches retain C sharp');
});
