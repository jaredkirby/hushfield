import test from 'node:test';
import assert from 'node:assert/strict';
import { serializeProject, decodeProject } from '../dist/project-file.mjs';
import { AMBIENT_DEFAULTS, restoreAmbient } from '../dist/ambient-settings.mjs';
import { createSoundState } from '../dist/sound-patches.mjs';

const buffer = {
  numberOfChannels: 1, length: 4, sampleRate: 48000, duration: 4 / 48000,
  getChannelData: () => Float32Array.of(0, .25, -.25, 0)
};
const defaults = { spaceVersion: 2, foundationRoom: 22, textureRoom: 65, motionRoom: 30, roomLow: 180, roomHigh: 7500 };
const ranges = Object.fromEntries([
  ['foundationRoom', 0, 100, 1], ['textureRoom', 0, 100, 1], ['motionRoom', 0, 100, 1],
  ['roomLow', 20, 2000, 10], ['roomHigh', 1000, 20000, 100]
].map(([name, min, max, step]) => [name, { min, max, step }]));
const decode = async text => decodeProject(text, { decodeAudio: async () => buffer, defaults, ranges, controls: {} });

test('a new exported Piece retains expression, depth and editable Motion brightness', async () => {
  const orbitSound = createSoundState();
  Object.assign(orbitSound.triggers.base, { toneAttack: .4, toneDecay: 1.1, toneAmount: 18 });
  const ambient = restoreAmbient({ ...AMBIENT_DEFAULTS, compositionVersion: 2, color: 65, drift: 25, bloom: 75 });
  const params = { spaceVersion: 2, foundationRoom: 10, textureRoom: 70, motionRoom: 35, roomLow: 240, roomHigh: 6800 };
  const text = serializeProject({ buffer, name: 'Bloom take', params, controls: {}, ambient, orbitSound });
  assert.equal(JSON.parse(text).version, 7, 'The new format makes the compatibility boundary explicit');
  const restored = await decode(text);
  assert.deepEqual(restored.params, { ...params, reverbModel: 'original', reverbDecay: 3, reverbPredelay: 20, reverbTone: 50, reverbWidth: 75, tapeModel: 1, echoMode: 4, springMix: 12 });
  assert.equal(restored.ambient.compositionVersion, 2);
  assert.equal(restored.ambient.color, 65);
  assert.equal(restored.ambient.drift, 25);
  assert.equal(restored.ambient.bloom, 75);
  assert.equal(restored.orbitSound.triggers.base.toneAttack, .4);
  assert.equal(restored.orbitSound.triggers.base.toneDecay, 1.1);
  assert.equal(restored.orbitSound.triggers.base.toneAmount, 18);
});

test('versions one through four retain their classic sound and shared room routing', async () => {
  for (const version of [1, 2, 3, 4]) {
    const saved = JSON.parse(serializeProject({ buffer, params: {}, controls: {}, ambient: { scene: 2, seed: 777, pads: 80 } }));
    saved.version = version;
    const restored = await decode(JSON.stringify(saved));
    assert.equal(restored.ambient.compositionVersion, 1, 'Old Pieces retain the original synthesis model');
    assert.equal(restored.ambient.seed, 777);
    assert.equal(restored.params.spaceVersion, 1, 'Old Pieces retain the original shared room route');
    assert.equal(restored.params.foundationRoom, 100);
    assert.equal(restored.params.textureRoom, 100);
    assert.equal(restored.params.motionRoom, 100);
    assert.equal(restored.orbitSound.triggers.base.toneAmount, 0);
  }
});

test('legacy project versions cannot silently opt into newer expression or depth fields', async () => {
  const saved = JSON.parse(serializeProject({ buffer, params: { ...defaults, textureRoom: 12 }, controls: {}, ambient: { ...AMBIENT_DEFAULTS, compositionVersion: 2, color: 95 } }));
  saved.version = 4;
  const restored = await decode(JSON.stringify(saved));
  assert.equal(restored.ambient.compositionVersion, 1);
  assert.equal(restored.params.spaceVersion, 1);
  const exportedAgain = serializeProject({ ...restored, buffer });
  const reopened = await decode(exportedAgain);
  assert.equal(reopened.ambient.compositionVersion, 1, 'Re-exporting an old Piece does not promote its sound');
  assert.equal(reopened.params.spaceVersion, 1);
});
