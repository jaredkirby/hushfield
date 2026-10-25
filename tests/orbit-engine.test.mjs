import test from 'node:test';
import assert from 'node:assert/strict';
import {OrbitEngine} from '../dist/orbit-dsp.mjs';
import {createSoundState} from '../dist/sound-patches.mjs';

function render(engine,seconds,rate=48000) {
  let output=Array.from({length:12},()=>[new Float32Array(128),new Float32Array(128)]);
  let energy=0;
  const frames=Math.round(seconds*rate);
  for(let at=0;at<frames;at+=128) {
    const count=Math.min(128,frames-at);
    if(count!==output[0][0].length)output=Array.from({length:12},()=>[new Float32Array(count),new Float32Array(count)]);
    engine.process(output);
    for(const bus of output)for(const channel of bus)for(const value of channel){assert(Number.isFinite(value));energy+=value*value;}
  }
  return energy;
}
test('Orbit completes its phrase and renders sound without any animation frame messages',()=>{
  const engine=new OrbitEngine(48000);
  engine.configure({rpm:12,points:0,balls:0,triggers:8,gravity:0,bounce:84,orientation:0});
  engine.setPatches(createSoundState());
  engine.play({simulate:true,audible:true});
  const energy=render(engine,5);
  assert.equal(engine.status().triggerCount,8);
  assert(energy>1,'Automatic trigger voices produce PCM');
  engine.play({simulate:false,audible:false});
  const phase=engine.status().phase;
  render(engine,.25);
  assert.equal(engine.status().phase,phase);
});

for(const rate of [44100,48000])test(`Orbit supports signed RPM, silence, bank isolation and bounded voices at ${rate} Hz`,()=>{
  const engine=new OrbitEngine(rate);
  engine.configure({rpm:-24,balls:0,triggers:8});engine.play({simulate:true,audible:false});
  assert.equal(render(engine,2.5,rate),0);
  assert.equal(engine.status().triggerCount,8);
  const patches=createSoundState();patches.balls.base.pan=-100;patches.balls.base.delaySend=patches.balls.base.reverbSend=0;
  engine.setPatches(patches);engine.audition('balls',0,60);
  const outputs=Array.from({length:12},()=>[new Float32Array(128),new Float32Array(128)]);
  let left=0,right=0,unrelated=0;
  for(let k=0;k<200;k++){engine.process(outputs);for(let i=0;i<128;i++){left+=outputs[9][0][i]**2;right+=outputs[9][1][i]**2;unrelated+=outputs[6][0][i]**2;}}
  assert(left>.001);assert.equal(right,0);assert.equal(unrelated,0);
  for(const bank of ['triggers','balls'])for(let i=0;i<30;i++)engine.audition(bank,i%12,60);
  assert.equal(engine.status().voices,48);
  engine.stop('triggers');assert.equal(engine.status().voices,24);
  engine.stop();render(engine,.1,rate);assert.equal(engine.status().voices,0);
});

test('a resolved bank audition patch is retained when item zero is muted',()=>{
  const engine=new OrbitEngine(48000),patches=createSoundState();
  patches.triggers.items[0]={enabled:false};engine.setPatches(patches);
  assert.equal(engine.audition('triggers',0,60,{...patches.triggers.base,...patches.triggers.effects}),true);
  assert(render(engine,.1)>0);
});
