import test from 'node:test';
import assert from 'node:assert/strict';
import { createSoundState, editSound, patchFor } from '../dist/sound-patches.mjs';
import { mixedSoundFields, envelopeGeometry, envelopeDragValue } from '../dist/sound-editor-model.mjs';
import { normalizeOrientation, orientationAt } from '../dist/motion-controls.mjs';

test('mixed fields use audible item patches, ignore inactive items and shared bank effects', () => {
  const state = createSoundState();
  editSound(state, 'triggers', 1, 'attack', .5);
  editSound(state, 'triggers', 1, 'enabled', false);
  editSound(state, 'triggers', 4, 'wave', 'square');
  editSound(state, 'triggers', 1, 'delayTime', .8);
  assert.deepEqual([...mixedSoundFields(state, 'triggers', 2)].sort(), ['attack', 'enabled']);
  editSound(state, 'triggers', 'all', 'attack', .2);
  assert.equal(mixedSoundFields(state, 'triggers', 2).has('attack'), false);
  assert.equal(patchFor(state, 'triggers', 1).enabled, false);
  assert.equal(patchFor(state, 'triggers', 4).wave, 'square');
});

test('envelope plots real stage times with exponential release', () => {
  const p = { attack: .5, decay: 1, sustain: 50, gate: .5, release: 2 };
  const geometry = envelopeGeometry(p);
  assert.equal(geometry.total, 4);
  assert.equal(geometry.handles.attack[1], 20);
  assert.equal(geometry.handles.decay[1], 54);
  assert.equal(geometry.handles.gate[0] - 6, (geometry.handles.release[0] - 6) / 2);
  assert(geometry.points[19][1] > 87, 'Release has substantially decayed at its midpoint');
  const heldDomain = envelopeGeometry({ ...p, release: 1 }, geometry.duration);
  assert.equal(heldDomain.handles.attack[0], geometry.handles.attack[0]);
  assert(envelopeGeometry({ ...p, release: 5 }, geometry.duration).handles.release[0] < 94, 'Expansion keeps the release handle inside the chart');
});

test('release shape uses the DSP level-dependent exponential floor', () => {
  for (const level of [1, 35, 100]) {
    const p = { attack: .1, decay: .2, sustain: 40, gate: .3, release: 1, level };
    const geometry = envelopeGeometry(p), peak = level / 100 * .18;
    const held = Math.max(1e-5, peak * .4);
    const normalizedMidpoint = held * Math.exp(Math.log(1e-5 / held) * .5) / peak;
    assert(Math.abs(geometry.points[19][1] - (88 - normalizedMidpoint * 68)) < 1e-10);
  }
});

test('envelope drag changes only the selected field and clamps at DSP bounds', () => {
  assert.equal(envelopeDragValue('attack', .5, 44, 0, 100, 100, 2), 1.5);
  assert.equal(envelopeDragValue('sustain', 50, 100, -34, 100, 100, 2), 100);
  assert.equal(envelopeDragValue('release', 1, -1000, 0, 100, 100, 2), .02);
});

test('orientation dial cardinal points match clockwise phase convention', () => {
  const rect = { left: 0, top: 0, width: 100, height: 100 };
  assert.equal(orientationAt(50, 0, rect), 0);
  assert.equal(orientationAt(100, 50, rect), 90);
  assert.equal(orientationAt(50, 100, rect), -180);
  assert.equal(orientationAt(0, 50, rect), -90);
  assert.equal(normalizeOrientation(181), -179);
});
