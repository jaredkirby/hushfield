import test from 'node:test';
import assert from 'node:assert/strict';
import {createRenderClock} from '../dist/render-clock.mjs';
test('paused scenes draw only on invalidation and animation is capped independently of display refresh',()=>{
  const clock=createRenderClock(30);
  assert.equal(clock.shouldDraw(0,false),true);
  for(let t=1;t<1000;t++)assert.equal(clock.shouldDraw(t,false),false);
  clock.invalidate();assert.equal(clock.shouldDraw(1000,false),true);
  let frames=0;
  for(let t=1001;t<=2000;t+=1000/120)if(clock.shouldDraw(t,true))frames++;
  assert(frames>=25&&frames<=30,`Expected at most 30 redraws, got ${frames}`);
});
