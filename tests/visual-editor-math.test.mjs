import test from 'node:test';
import assert from 'node:assert/strict';
import {cutoffFromUnit,cutoffToUnit,trimAt,grainBounds,grainSizeFromDrag,spaceAt,echoAt,responsePath,echoRepeatPath} from '../dist/visual-editor-math.mjs';

test('filter gestures preserve logarithmic frequency spacing and bound two axes',()=>{
  assert.equal(cutoffFromUnit(0),100); assert.equal(cutoffFromUnit(1),20000);
  assert.ok(Math.abs(cutoffFromUnit(.5)-Math.sqrt(100*20000))<1);
  for(const hz of [100,400,1000,14000,20000]) assert.ok(Math.abs(cutoffFromUnit(cutoffToUnit(hz))-hz)<1);
  assert.deepEqual(spaceAt(-2,3),{cutoff:100,resonance:.1});
  assert.deepEqual(spaceAt(2,-3),{cutoff:20000,resonance:12});
});
test('trim endpoints stay ordered at edges and never change grain position',()=>{
  for(let start=0;start<100;start+=7.1) for(const pointer of [-100,0,15,90,100,200]) {
    const params={trimStart:start,trimEnd:Math.min(100,start+5),position:50};
    const left={...params,...trimAt(params,'trimStart',pointer)};
    const right={...params,...trimAt(params,'trimEnd',pointer)};
    assert.ok(left.trimStart < left.trimEnd); assert.ok(right.trimEnd > right.trimStart);
    assert.equal(left.position,50); assert.equal(right.position,50);
  }
  assert.deepEqual(trimAt({trimStart:0,trimEnd:100},'trimStart',100),{trimStart:99.9});
  assert.deepEqual(trimAt({trimStart:0,trimEnd:100},'trimEnd',-1),{trimEnd:.1});
});
test('grain sizing uses source seconds and handles clip to the visible phrase',()=>{
  assert.deepEqual(grainBounds(50,1000,4),{center:.5,left:.375,right:.625});
  assert.equal(grainBounds(100,1500,1).right,1);
  assert.equal(grainBounds(0,1500,1).left,0);
  assert.equal(grainSizeFromDrag(100,.1,4),900);
  assert.equal(grainSizeFromDrag(100,2,4),1500);
  assert.equal(grainSizeFromDrag(100,-2,4),15);
});
test('echo and filter diagrams stay finite at parameter extremes',()=>{
  assert.deepEqual(echoAt(-1,3),{delayTime:.05,feedback:0});
  assert.deepEqual(echoAt(2,-1),{delayTime:1.5,feedback:80});
  for(const type of ['lowpass','highpass','bandpass']) for(const cutoff of [100,20000]) for(const q of [.1,12]) {
    const path=responsePath(type,cutoff,q); assert.ok(!/NaN|Infinity/.test(path)); assert.equal(path.split(' ').length,121);
  }
});

test('echo preview uses relative dB height so default repeats remain visible',()=>{
  const lines=echoRepeatPath(.36,28,16).split(' ');
  assert.equal(lines.length,4);
  const tops=lines.map(line=>Number(line.split('V')[1]));
  assert.ok(tops[0]<35); // First repeat fills over two thirds of the timeline.
  assert.ok(tops[1]<60); // The second remains visibly above the baseline.
  for(let i=1;i<tops.length;i++)assert.ok(tops[i]>tops[i-1]);
  assert.equal(echoRepeatPath(.36,28,0),'');
  assert.equal(echoRepeatPath(.36,0,16).split(' ').length,1);
  assert.ok(!/NaN|Infinity/.test(echoRepeatPath(.05,80,70)));
});
