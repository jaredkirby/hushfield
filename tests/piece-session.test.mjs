import test from 'node:test';
import assert from 'node:assert/strict';
import { restorePiece, piecePlayback } from '../dist/piece-session.mjs';

test('the whole piece plays across every editor and solo leaves the saved blend intact', () => {
  const piece = restorePiece({foundation:80,texture:30,motion:20});
  for (const page of ['ambient','sample','grain','orbit','fx','tape','visual']) {
    const sound = piecePlayback(piece, true, null, page);
    assert.equal(sound.foundation,.8); assert.equal(sound.texture,.18);
    assert.ok(Math.abs(sound.motion-.09)<1e-10); assert.equal(sound.generate,true);
  }
  assert.deepEqual(piecePlayback(piece,true,'texture'),{foundation:0,texture:.6,motion:0,generate:true});
  assert.equal(piece.texture,30);
  assert.deepEqual(piecePlayback(piece,false),{foundation:0,texture:0,motion:0,generate:false});
  assert.deepEqual(restorePiece(null,{ambient:{enabled:false},params:{sampleLevel:65,orbitLevel:25}}),{foundation:0,texture:65,motion:25,source:'sample',followHarmony:false});
});

test('legacy blend migration bounds untrusted saved levels',()=>{
  const piece=restorePiece(null,{ambient:{enabled:false},params:{sampleLevel:999,orbitLevel:-20}});
  assert.equal(piece.texture,100);assert.equal(piece.motion,0);
});
