import test from 'node:test';
import assert from 'node:assert/strict';
import {createVisualRenderer} from '../dist/audio-visuals.mjs';
import {VISUAL_DEFAULTS} from '../dist/visual-analysis.mjs';

function surface() {
  const calls=[];
  const context={canvas:{},clearRect(){calls.push(['clear']);},fillRect(){calls.push(['fill']);},beginPath(){},moveTo(x,y){calls.push(['point',x,y]);},lineTo(x,y){calls.push(['point',x,y]);},stroke(){calls.push(['stroke']);},fillText(){calls.push(['text']);},drawImage(){calls.push(['image']);}};
  return {calls,context};
}
const state={...VISUAL_DEFAULTS,mode:'scope'};
const options={single:true,frameless:true,hideSilent:true,dither:false};
const wave=Float32Array.from({length:2048},(_,i)=>Math.sin(i*.1)*.4);
const quiet=new Float32Array(2048);

test('button Scope draws one unlabelled trace for right-only and opposite-phase audio',()=>{
  for(const [left,right] of [[quiet,wave],[wave,wave.map(v=>-v)]]) {
    const output=surface(), trail=surface();
    const renderer=createVisualRenderer(()=>({width:0,height:0,getContext:()=>trail.context}));
    renderer.draw({c:output.context,w:320,h:64},{left,right,rate:48000},state,1/30,options);
    assert.equal(output.calls.filter(c=>c[0]==='text'||c[0]==='stroke').length,0,'no grid or channel labels');
    assert.equal(trail.calls.filter(c=>c[0]==='stroke').length,1,'one waveform');
    const ys=trail.calls.filter(c=>c[0]==='point').map(c=>c[2]);
    assert(Math.max(...ys)-Math.min(...ys)>5,'audible stereo must not disappear in a mono cancellation');
  }
});

test('button Scope clears previous output and draws nothing for silence or negligible noise',()=>{
  const output=surface(),trail=surface();
  const renderer=createVisualRenderer(()=>({width:0,height:0,getContext:()=>trail.context}));
  renderer.draw({c:output.context,w:320,h:64},{left:wave,right:wave,rate:48000},state,1/30,options);
  for(const level of [0,1e-6]) {
    output.calls.length=trail.calls.length=0;
    const data=new Float32Array(2048).fill(level);
    renderer.draw({c:output.context,w:320,h:64},{left:data,right:data,rate:48000},state,1/30,options);
    assert.deepEqual(output.calls,[['fill']],'silence leaves only the black background');
    assert.deepEqual(trail.calls,[['clear']],'no stale trace survives');
  }
});
