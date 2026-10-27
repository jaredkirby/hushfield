import test from 'node:test';
import assert from 'node:assert/strict';
import { serializeProject, decodeProject } from '../dist/project-file.mjs';
import { createSessionRecovery } from '../dist/session-recovery.mjs';
import { SPACE_DEFAULTS } from '../dist/space-settings.mjs';
import { selectPiecePreset } from '../dist/piece-presets.mjs';
const buffer = { numberOfChannels: 1, length: 4, sampleRate: 48000, duration: 4 / 48000, getChannelData: () => Float32Array.of(0, .25, -.25, 0) };
const decode = text => decodeProject(text, { decodeAudio: async () => buffer, defaults: SPACE_DEFAULTS, ranges: {}, controls: {} });
const vintage = { reverbModel: 'plate', reverbDecay: 5.7, reverbPredelay: 83, reverbTone: 29, reverbWidth: 91 };
const original = { reverbModel: 'original', reverbDecay: 3, reverbPredelay: 20, reverbTone: 50, reverbWidth: 75 };
const selected = params => Object.fromEntries(Object.keys(original).map(id => [id, params[id]]));
const save = params => serializeProject({ buffer, params, controls: {} });
test('fresh Stillwater starts with Plate and preserves it through save and restore', async () => {
  assert.equal(SPACE_DEFAULTS.reverbModel, 'plate');
  const fresh = selectPiecePreset('still', { defaults: SPACE_DEFAULTS, cancelPending() {} });
  assert.equal(fresh.params.reverbModel, 'plate');
  const restored = await decode(save(fresh.params));
  assert.equal(restored.params.reverbModel, 'plate');
});
test('schema seven preserves each selected room and its controls without app range registration', async () => {
  for (const reverbModel of ['original', 'plate', 'spring', 'chamber']) {
    const params = { ...vintage, reverbModel, spaceVersion: 1 };
    const text = save(params);
    assert.equal(JSON.parse(text).version, 7);
    const restored = await decode(text);
    assert.deepEqual(selected(restored.params), { ...vintage, reverbModel });
    assert.equal(restored.params.spaceVersion, 1, 'Hidden room settings cannot promote routing');
  }
});
test('versions one through six ignore stray vintage fields and retain prior sound after re-export', async () => {
  for (const version of [1, 2, 3, 4, 5, 6]) {
    const saved = JSON.parse(save({ ...vintage, spaceVersion: 1, tapeModel: 0 }));
    saved.version = version;
    saved.ambient = { compositionVersion: 1, instrument: 'current', scene: 2, seed: 777 };
    const restored = await decode(JSON.stringify(saved));
    assert.deepEqual(selected(restored.params), original);
    assert.equal(restored.params.spaceVersion, 1);
    const reopened = await decode(serializeProject(restored));
    assert.deepEqual(selected(reopened.params), original);
    assert.equal(reopened.params.spaceVersion, 1);
    assert.equal(reopened.params.tapeModel, restored.params.tapeModel);
    assert.equal(reopened.ambient.instrument, restored.ambient.instrument);
    assert.equal(reopened.ambient.compositionVersion, restored.ambient.compositionVersion);
  }
});
test('malformed room controls normalize safely and unknown models retain the original room', async () => {
  for (const reverbModel of [undefined, null, 'unknown', {}, 2]) {
    const restored = await decode(save({ reverbModel, reverbDecay: null, reverbPredelay: '80', reverbTone: [], reverbWidth: {} }));
    assert.deepEqual(selected(restored.params), original);
  }
  const restored = await decode(save({ reverbModel: 'chamber', reverbDecay: 9, reverbPredelay: -10, reverbTone: 105, reverbWidth: 21.6 }));
  assert.deepEqual(selected(restored.params), { reverbModel: 'chamber', reverbDecay: 8, reverbPredelay: 0, reverbTone: 100, reverbWidth: 22 });
  const rounded = await decode(save({ ...vintage, reverbDecay: 2.34 }));
  assert.equal(rounded.params.reverbDecay, 2.3);
});
test('local recovery offers a vintage Piece explicitly and restores its complete saved settings', async () => {
  let stored;
  const store = { read: async () => stored, write: async value => { stored = value; }, remove: async () => { stored = undefined; } };
  const draft = createSessionRecovery({ store, snapshot: () => save({ ...vintage, spaceVersion: 2 }), restore: async () => {}, schedule: () => 0, unschedule() {} });
  await draft.ready;
  draft.edited();
  await draft.flush();
  let recovered;
  const session = createSessionRecovery({ store, snapshot: () => '', restore: async text => { recovered = await decode(text); }, schedule: () => 0, unschedule() {} });
  await session.ready;
  assert.equal(session.available, true);
  assert.equal(recovered, undefined, 'Discovering a draft does not apply it');
  assert.equal(await session.recover(), true);
  assert.deepEqual(selected(recovered.params), vintage);
  assert.equal(session.status, 'recovered');
});
