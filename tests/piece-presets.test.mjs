import test from 'node:test';
import assert from 'node:assert/strict';
import { selectPiecePreset } from '../dist/piece-presets.mjs';
import { createSampleSelection } from '../dist/sample-selection.mjs';
import { TAPE_DEFAULTS } from '../dist/tape-settings.mjs';

test('selecting Stillwater supersedes a pending source or project decode',async()=>{
  const selection=createSampleSelection();let finish,applied=false;
  const pending=selection.run(()=>new Promise(resolve=>finish=resolve),()=>{applied=true;});
  const preset=selectPiecePreset('still',{defaults:{cutoff:14000},cancelPending:selection.cancel});
  finish('old decoded material');assert.equal(await pending,false);assert.equal(applied,false);
  assert.equal(preset.piece.source,'foundation');assert.equal(preset.piece.foundation,100);
});

test('complete-piece presets restore finishing and fresh audible Motion patches',()=>{
  for(const key of ['still','cloud','shards','worn']){
    const preset=selectPiecePreset(key,{defaults:{cutoff:14000,tapeOn:false},cancelPending:()=>{}});
    assert.equal(preset.controls.filterType,'lowpass');assert.equal(preset.controls.orbitShape,'0');
    assert.equal(preset.soundState.triggers.base.enabled,true);assert.equal(preset.soundState.balls.base.enabled,true);
    preset.soundState.triggers.base.enabled=false;
    const selectedAgain=selectPiecePreset(key,{defaults:{cutoff:14000,tapeOn:false},cancelPending:()=>{}});
    assert.equal(selectedAgain.soundState.triggers.base.enabled,true);
  }
});

test('Worn memory keeps its established tape character when new-piece defaults change',()=>{
  const {params}=selectPiecePreset('worn',{defaults:TAPE_DEFAULTS,cancelPending:()=>{}});
  assert.equal(params.tapeOn,true);
  assert.deepEqual({drive:params.drive,wow:params.wow,flutter:params.flutter,hiss:params.hiss,mix:params.delayMix,feedback:params.feedback,tone:params.tapeTone},
    {drive:55,wow:65,flutter:35,hiss:22,mix:23,feedback:38,tone:35});
});

test('complete-piece selection opts into the new Foundation voice and part depth', () => {
  for (const key of ['still', 'cloud', 'shards', 'worn']) {
    const preset = selectPiecePreset(key, { defaults: { spaceVersion: 1 }, cancelPending: () => {} });
    assert.equal(preset.ambient.compositionVersion, 2);
    assert.equal(preset.params.spaceVersion, 2);
    assert.ok(preset.params.textureRoom > preset.params.foundationRoom, 'Texture starts farther back than Foundation');
  }
});

test('Stillwater starts with Chorus synth and enabled Space Echo while other Whole piece presets keep their voices and Tape', () => {
  const defaults = { ...TAPE_DEFAULTS, tapeModel: 2, echoMode: 4, springMix: 12 };
  const still = selectPiecePreset('still', { defaults, cancelPending() {} });
  assert.equal(still.ambient.scene, 0);
  assert.equal(still.ambient.instrument, 'juno');
  assert.equal(still.params.tapeOn, true);
  assert.equal(still.params.tapeModel, 2);
  assert.equal(still.params.echoMode, 4);
  for (const key of ['cloud', 'shards', 'worn']) {
    const selected = selectPiecePreset(key, { defaults, cancelPending() {} });
    assert.equal(selected.ambient.instrument, 'current');
    assert.equal(selected.params.tapeOn, key === 'worn');
  }
});
