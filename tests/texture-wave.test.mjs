import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareTextureWave} from '../dist/texture-wave.mjs';
import {restoreVisual, VISUAL_DEFAULTS} from '../dist/visual-analysis.mjs';

test('display smoothing removes sharp alternation without changing source samples or DC', () => {
  const source = Float32Array.from({length:160}, (_,i)=>.4*Math.sin(i*.08)+(i%2?.2:-.2));
  const original = new Float32Array(source);
  const roughness = data => data.reduce((sum,x,i)=>sum+(i?Math.abs(x-data[i-1]):0),0);
  const raw=prepareTextureWave(source,0,640), smooth=prepareTextureWave(source,80,640);
  assert(roughness(smooth)<roughness(raw)*.3);
  assert(smooth.some(x=>x>.1)&&smooth.some(x=>x<-.1),'the signed slow wave remains visible');
  assert.deepEqual(source,original);
  const dc=prepareTextureWave(new Float32Array(160).fill(.25),100,640);
  assert(dc.every(x=>Math.abs(x-.25)<1e-6));
});
test('smoothed source geometry is finite, bounded and stable at empty and short inputs', () => {
  for (const source of [new Float32Array(),new Float32Array([.3]),new Float32Array([-1,1]),new Float32Array(160)]) {
    for (const amount of [0,65,100]) {
      const out=prepareTextureWave(source,amount,100000);
      assert.equal(out.length,1024); assert(out.every(x=>Number.isFinite(x)&&Math.abs(x)<=1));
      if (!source.length) assert(out.every(x=>x===0));
    }
  }
});
test('wave smoothing restores with visual settings, with a smooth default for older projects', () => {
  assert.equal(VISUAL_DEFAULTS.waveformSmoothing,65);
  assert.equal(restoreVisual({mode:'scope',waveformSmoothing:27}).waveformSmoothing,27);
  assert.equal(restoreVisual({waveformSmoothing:900}).waveformSmoothing,100);
  assert.equal(restoreVisual({waveformSmoothing:NaN}).waveformSmoothing,65);
});
