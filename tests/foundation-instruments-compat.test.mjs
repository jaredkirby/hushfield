import test from 'node:test';
import assert from 'node:assert/strict';
import { AmbientEngine } from '../dist/ambient-dsp.mjs';
import { restoreAmbient } from '../dist/ambient-settings.mjs';
import { AmbientEngine as ExpressiveReference } from './fixtures/foundation-expressive-v2/ambient-dsp.mjs';
import { restoreAmbient as restoreReference } from './fixtures/foundation-expressive-v2/ambient-settings.mjs';
import { AmbientEngine as ClassicReference } from './fixtures/foundation-classic-v1/ambient-dsp.mjs';

// Expectations come from immutable pre-instrument engines, in the same runtime.
// Deliberately omit instrument: saved Pieces must retain their original sound.
const savedPieces = [
  { seed: 719, compositionVersion: 1, change: 20, activity: 100, pads: 71, melody: 63, air: 21 },
  { seed: 381, compositionVersion: 2, change: 20, activity: 100, pads: 83, melody: 68, air: 17, color: 91, drift: 76, bloom: 88 },
];
function render(engine, seconds, blockSize = 128) {
  const frames = Math.round(seconds * engine.rate);
  const channels = [new Float32Array(frames), new Float32Array(frames)];
  for (let frame = 0; frame < frames; frame += blockSize) {
    const size = Math.min(blockSize, frames - frame);
    const output = [new Float32Array(size), new Float32Array(size)];
    engine.process(output);
    channels.forEach((channel, index) => channel.set(output[index], frame));
  }
  return channels;
}
for (const saved of savedPieces) for (const rate of [8000, 44100, 48000]) {
  const model = saved.compositionVersion === 1 ? 'classic' : 'expressive';
  test(`saved ${model} Foundation without instrument preserves exact stereo PCM at ${rate} Hz`, () => {
    const current = new AmbientEngine(rate);
    const Reference = saved.compositionVersion === 1 ? ClassicReference : ExpressiveReference;
    const reference = new Reference(rate);
    current.set(restoreAmbient(saved));
    reference.set(restoreReference(saved));
    current.play(true);
    reference.play(true);
    // Cross a melody event and a harmony transition, not just the initial pad.
    assert.deepEqual(render(current, 22), render(reference, 22));
    // Public live settings and stop behavior remain compatible as well.
    const edit = { key: 5, hold: true, pads: 49, air: 9 };
    current.set(edit);
    reference.set(edit);
    assert.deepEqual(render(current, 1, 97), render(reference, 1, 97));
    current.play(false);
    reference.play(false);
    assert.deepEqual(render(current, 2), render(reference, 2));
  });
}
