import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { AmbientEngine } from '../dist/ambient-dsp.mjs';
import { restoreAmbient } from '../dist/ambient-settings.mjs';

function make(settings = {}, rate = 8000) {
  const engine = new AmbientEngine(rate);
  engine.set({ activity: 0, melody: 0, air: 0, ...settings });
  engine.play(true);
  return engine;
}

function render(engine, seconds, blockSize = 128) {
  const frames = Math.round(seconds * engine.rate);
  const left = new Float32Array(frames), right = new Float32Array(frames);
  for (let frame = 0; frame < frames; frame += blockSize) {
    const size = Math.min(blockSize, frames - frame);
    const output = [new Float32Array(size), new Float32Array(size)];
    engine.process(output);
    left.set(output[0], frame);
    right.set(output[1], frame);
  }
  return [left, right];
}

function difference(a, b) {
  return Math.sqrt(a.reduce((sum, value, index) => sum + (value - b[index]) ** 2, 0) / a.length);
}

test('Foundation Color changes audible harmonic character without a level jump', () => {
  const low = render(make({ color: 0, drift: 0, bloom: 0 }), 3)[0];
  const high = render(make({ color: 100, drift: 0, bloom: 0 }), 3)[0];
  const rms = values => Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length);
  assert.ok(difference(low, high) > .005, 'Color changes the rendered sound');
  assert.ok(rms(high) / rms(low) > .7 && rms(high) / rms(low) < 1.4, 'Color primarily changes timbre');
});

test('saved classic Foundations retain captured baseline PCM and new controls validate', () => {
  assert.equal(restoreAmbient().compositionVersion, 2, 'New Pieces use expressive synthesis');
  assert.equal(restoreAmbient(undefined, true).compositionVersion, 1, 'Projects predating Foundation retain classic synthesis');
  const saved = restoreAmbient({ seed: 719 });
  assert.equal(saved.compositionVersion, 1, 'Saved settings lacking a version retain classic synthesis');
  const engine = new AmbientEngine(8000);
  engine.set(saved);
  engine.play(true);
  const hash = createHash('sha256');
  for (let frame = 0; frame < 32000; frame += 128) {
    const output = [new Float32Array(128), new Float32Array(128)];
    engine.process(output);
    for (const channel of output) hash.update(new Uint8Array(channel.buffer));
  }
  assert.equal(hash.digest('hex'), '5248ba72dd5eec62d4a0b0639e7319ef38e3ecd9a57dd361d1bbeac9dbe0618d', 'Captured pre-change PCM remains exact');
  const restored = restoreAmbient({ compositionVersion: 2, color: 200, drift: -20, bloom: NaN });
  assert.equal(restored.color, 100);
  assert.equal(restored.drift, 0);
  assert.equal(restored.bloom, 45);
  assert.equal(restoreAmbient({ compositionVersion: '2' }).compositionVersion, 1);
});

test('Drift and Bloom each evolve an otherwise identical held Foundation', () => {
  const neutral = render(make({ hold: true, drift: 0, bloom: 0 }), 12)[0];
  const drift = render(make({ hold: true, drift: 100, bloom: 0 }), 12)[0];
  const bloom = render(make({ hold: true, drift: 0, bloom: 100 }), 12)[0];
  assert.ok(difference(neutral, drift) > .003, 'Drift creates audible independent voice movement');
  assert.ok(difference(neutral, bloom) > .0005, 'Bloom changes harmonic color even while harmony is held');
});

test('expressive Foundation is deterministic across blocks and smooth under live edits', () => {
  const settings = { seed: 219, color: 83, drift: 65, bloom: 72 };
  assert.deepEqual(render(make(settings), 5, 128), render(make(settings), 5, 97), 'Block size does not change a seeded Piece');
  assert.ok(difference(render(make(settings), 5)[0], render(make({ ...settings, seed: 220 }), 5)[0]) > .003, 'Voice motion differs between seeds even without melody');
  for (const rate of [44100, 48000]) {
    const engine = make({}, rate);
    render(engine, .25);
    engine.set({ color: 100, drift: 100, bloom: 100, key: 8 });
    const output = render(engine, .5);
    for (const values of output) {
      assert.ok(values.every(Number.isFinite));
      assert.ok(Math.max(...values.map(Math.abs)) < .5, 'Expressive voices retain headroom');
      assert.ok(values.slice(1).every((value, index) => Math.abs(value - values[index]) < .08), 'Live sound edits do not click');
    }
    engine.play(false);
    render(engine, 2);
    const paused = engine.status().elapsed;
    assert.ok(render(engine, .1).every(channel => channel.every(value => value === 0)), 'Stopped sound fades to silence');
    assert.equal(engine.status().elapsed, paused);
  }
});

test('bright Foundation omits harmonics above Nyquist at reduced render rates', () => {
  const engine = make({ color: 100, drift: 0, bloom: 0 }, 3000);
  render(engine, 4);
  const values = render(engine, 2)[0];
  const frequency = 440 * 2 ** ((engine.status().chordNotes[3] - 69) / 12);
  const magnitude = at => {
    let real = 0, imaginary = 0;
    for (let i = 0; i < values.length; i++) {
      const window = .5 - .5 * Math.cos(2 * Math.PI * i / (values.length - 1));
      real += values[i] * window * Math.cos(2 * Math.PI * at * i / engine.rate);
      imaginary += values[i] * window * Math.sin(2 * Math.PI * at * i / engine.rate);
    }
    return Math.hypot(real, imaginary);
  };
  assert.ok(frequency * 8 > engine.rate / 2, 'The bright eighth partial would alias at this rate');
  assert.ok(magnitude(engine.rate - frequency * 8) < magnitude(frequency) * .005, 'No audible folded eighth partial');
});

test('a two-minute audio-clock phrase trades Texture and Motion and freezes on pause', () => {
  const engine = make({ evolution: 100, hold: true }, 1000);
  const start = engine.status().phrase;
  render(engine, 60);
  const crest = engine.status().phrase;
  assert.ok(Math.abs(crest.phase - .5) < .00001, 'Phrase reaches its crest at 60 seconds');
  assert.ok(crest.texture > start.texture && crest.textureDensity > start.textureDensity, 'Texture develops toward the crest');
  assert.ok(crest.motion < start.motion && crest.motionDensity < start.motionDensity, 'Motion makes room for Texture');
  assert.deepEqual(engine.status().chordNotes, [36, 51, 55, 58], 'Hold preserves harmony while the phrase develops');
  render(engine, 60);
  const returned = engine.status().phrase;
  for (const part of ['foundation', 'texture', 'motion', 'textureDensity', 'motionDensity']) assert.ok(Math.abs(returned[part] - start[part]) < .00001, 'The phrase returns gradually to its starting balance');
  engine.play(false);
  render(engine, 2);
  assert.deepEqual(engine.status().phrase, returned, 'Pause stops musical development');
  const classic = make({ compositionVersion: 1 }, 1000);
  render(classic, 60);
  for (const part of ['foundation', 'texture', 'motion', 'textureDensity', 'motionDensity']) assert.equal(classic.status().phrase[part], 1, 'Classic pieces have neutral phrase factors');
});

test('melodic motifs return with changed endings and audible rests', () => {
  const engine = make({ pads: 0, melody: 100, activity: 100, hold: true, seed: 381 }, 4000);
  const output = render(engine, 45)[0];
  const events = engine.status().melodyEvents;
  const first = events.filter(event => event.cycle === 0);
  const second = events.filter(event => event.cycle === 1);
  assert.equal(first.length, 8);
  assert.equal(second.length, 8);
  assert.deepEqual(first.slice(0, 3).map(event => event.degree), second.slice(0, 3).map(event => event.degree), 'A recognizable opening returns');
  assert.notEqual(first[7].degree, second[7].degree, 'The ending varies across cycles');
  assert.ok(first.some(event => event.rest && event.midi === null), 'The motif includes intentional rests');
  const rest = first.find(event => event.rest);
  const gap = output.slice(Math.ceil((rest.time + .9) * engine.rate), Math.floor((rest.time + 1.3) * engine.rate));
  assert.ok(gap.every(value => Math.abs(value) < 1e-6), 'A rest leaves actual space after the melody tail');
  assert.ok(events.every(event => event.rest || [0, 2, 3, 5, 7, 8, 10].includes(event.midi % 12)), 'Motif notes remain in the selected scale');
  const repeated = make({ pads: 0, melody: 100, activity: 100, hold: true, seed: 381 }, 4000);
  assert.deepEqual(output, render(repeated, 45, 97)[0], 'Motifs remain seed- and block-repeatable');
});

test('expressive harmony chooses closer in-scale chord voices without coupling dot gestures', () => {
  const expressive = make({ change: 20, evolution: 0 }, 1000);
  const classic = make({ change: 20, evolution: 0, compositionVersion: 1 }, 1000);
  let previous = expressive.status().chordNotes, previousClassic = classic.status().chordNotes;
  let distance = 0, classicDistance = 0;
  for (let chord = 0; chord < 8; chord++) {
    render(expressive, 20.01);
    render(classic, 20.01);
    const next = expressive.status().chordNotes, nextClassic = classic.status().chordNotes;
    distance += next.reduce((sum, note, index) => sum + Math.abs(note - previous[index]), 0);
    classicDistance += nextClassic.reduce((sum, note, index) => sum + Math.abs(note - previousClassic[index]), 0);
    assert.ok(next.every(note => note >= 36 && note <= 84 && [0, 2, 3, 5, 7, 8, 10].includes(note % 12)), 'Inversions preserve scale and a restrained register');
    previous = next;
    previousClassic = nextClassic;
  }
  assert.ok(distance < classicDistance * .85, 'Nearby voicing reduces aggregate movement by at least 15 percent');
  const before = expressive.status().chordNotes;
  expressive.set({ points: [{ x: .9, y: .18 }] });
  assert.deepEqual(expressive.status().chordNotes.slice(1), before.slice(1), 'Moving one dot preserves the other voices and their inversions');
  assert.ok(expressive.status().chordNotes[0] > before[0]);
});

test('loading classic settings replaces expressive inversions even when key and seed match', () => {
  const expressive = make({ change: 20, evolution: 0 }, 1000);
  const classic = make({ change: 20, evolution: 0, compositionVersion: 1 }, 1000);
  render(expressive, 20.01);
  render(classic, 20.01);
  assert.notDeepEqual(expressive.status().chordNotes, classic.status().chordNotes);
  expressive.set(restoreAmbient({ change: 20, evolution: 0 }));
  assert.deepEqual(expressive.status().chordNotes, classic.status().chordNotes, 'Changing sound model restores classic chord registers');
});
