import test from 'node:test';
import assert from 'node:assert/strict';
import { selectPiecePreset } from '../dist/piece-presets.mjs';
import { createSampleSelection } from '../dist/sample-selection.mjs';

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
