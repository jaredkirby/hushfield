import test from 'node:test';
import assert from 'node:assert/strict';
import { AmbientEngine } from '../dist/ambient-dsp.mjs';
import { restoreAmbient, AMBIENT_DEFAULTS } from '../dist/ambient-settings.mjs';
import { FoundationArrangement } from '../dist/foundation-arrangement.mjs';
import { selectPiecePreset } from '../dist/piece-presets.mjs';

const MINOR = [0, 2, 3, 5, 7, 8, 10];

// Drive the arrangement directly: fast, and independent of audio rendering.
function perform(seed, { cycles = 40, evolution = 45, scale = 0, chordEvery = 6 } = {}) {
  const settings = { ...AMBIENT_DEFAULTS, seed, evolution, scale };
  const arrangement = new FoundationArrangement(seed), events = [], roots = [];
  let root = 0, count = 0;
  while (arrangement.cycle < cycles) {
    if (++count % chordEvery === 0) { root = arrangement.nextRoot(settings, root); roots.push(root); }
    events.push({ ...arrangement.next(settings, root, 2), root });
  }
  return { events, roots };
}

test('fresh sessions and complete presets use the developing arrangement; saved Pieces keep the loop', () => {
  assert.equal(restoreAmbient().arrangementVersion, 2);
  assert.equal(restoreAmbient(undefined, true).arrangementVersion, 1);
  assert.equal(restoreAmbient({ seed: 10, compositionVersion: 2 }).arrangementVersion, 1, 'Saved settings without the field keep the original loop');
  assert.equal(restoreAmbient({ arrangementVersion: 2 }).arrangementVersion, 2);
  assert.equal(restoreAmbient({ arrangementVersion: '2' }).arrangementVersion, 1);
  for (const key of ['still', 'cloud', 'shards', 'worn']) {
    const selected = selectPiecePreset(key, { defaults: {}, cancelPending() {} });
    assert.equal(selected.ambient.arrangementVersion, 2, `${key} uses the developing arrangement`);
  }
});

test('the motif develops instead of repeating one eight-step phrase', () => {
  const { events } = perform(7201, { cycles: 60 });
  const phrases = new Map();
  for (const event of events) {
    const key = `${event.cycle}`;
    if (!phrases.has(key)) phrases.set(key, []);
    phrases.get(key).push(event.rest ? '-' : event.midi);
  }
  const distinct = new Set([...phrases.values()].map(phrase => phrase.join(','))).size;
  assert.ok(distinct >= phrases.size * .5, `At least half of the cycles differ (${distinct}/${phrases.size})`);
  const sections = new Set(events.map(event => event.section));
  for (const section of ['statement', 'develop', 'sparse', 'rest']) assert.ok(sections.has(section), `Reaches a ${section} section`);
  const variations = new Set(events.map(event => event.variation));
  assert.ok(variations.size >= 5, 'Uses several variation techniques');
});

test('the melody voice-leads, stays in scale and register, and lands on chord tones', () => {
  for (const seed of [1, 381, 7201, 99999]) for (const scale of [0, 1, 2]) {
    const { events } = perform(seed, { scale });
    const notes = events.filter(event => !event.rest);
    let leaps = 0;
    for (let i = 1; i < notes.length; i++) if (Math.abs(notes[i].midi - notes[i - 1].midi) > 7) leaps++;
    assert.ok(leaps / notes.length < .1, `Leaps larger than a fifth are rare (seed ${seed}, scale ${scale}: ${leaps}/${notes.length})`);
    assert.ok(notes.every(event => event.midi >= 55 && event.midi <= 84), 'Melody stays in a restrained register');
    if (scale === 0) assert.ok(notes.every(event => MINOR.includes(event.midi % 12)), 'Notes stay in the scale');
    const length = scale === 2 ? 5 : 7;
    for (const event of notes.filter(event => event.strong)) {
      const offset = ((event.degree % length) + length) % length;
      assert.ok([0, 2, 4, 6].map(tone => tone % length).includes(offset), `Strong steps are chord tones (offset ${offset})`);
    }
  }
});

test('the chord progression varies without a fixed period and avoids immediate repeats', () => {
  const { roots } = perform(7201, { cycles: 120 });
  assert.ok(roots.length >= 60);
  for (let i = 1; i < roots.length; i++) assert.notEqual(roots[i], roots[i - 1], 'Never repeats the current chord');
  for (const period of [4, 8, 16]) {
    const matches = roots.slice(period).filter((root, index) => root === roots[index]).length;
    assert.ok(matches < (roots.length - period) * .6, `Does not loop every ${period} chords`);
  }
});

test('the developing arrangement is seed- and block-repeatable in the engine', () => {
  const settings = { pads: 30, melody: 100, activity: 100, change: 20, seed: 4242 };
  const render = (blockSize) => {
    const engine = new AmbientEngine(4000);
    engine.set(settings);
    engine.play(true);
    const output = [];
    for (let frame = 0; frame < 4000 * 90; frame += blockSize) {
      const block = [new Float32Array(blockSize), new Float32Array(blockSize)];
      engine.process(block);
      output.push(...block[0]);
    }
    return { output, events: engine.status().melodyEvents };
  };
  const a = render(128), b = render(97 * 2);
  assert.ok(a.events.length > 20);
  assert.deepEqual(a.events, b.events);
  assert.ok(a.output.some(value => Math.abs(value) > 1e-4), 'Produces sound');
});
