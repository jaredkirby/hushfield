import assert from 'node:assert/strict';
import { crossedPads, padSound, padGeometry, padAngle, PAD_COUNT } from '../dist/orbit-pads.mjs';
import { makeOrbitState, stepOrbit } from '../dist/orbit-physics.mjs';

const turn = Math.PI * 2;
const mark = turn / PAD_COUNT;
assert.deepEqual(crossedPads(0, 0), []);
assert.deepEqual(crossedPads(.01, mark - .01), []);
assert.deepEqual(crossedPads(mark - .01, mark), [1]);
assert.deepEqual(crossedPads(mark, mark + .01), [], 'A mark is not retriggered on the next frame');
assert.deepEqual(crossedPads(.01, mark * 2 + .01), [1, 2]);
assert.deepEqual(crossedPads(mark * 2 + .01, .01), [2, 1]);
assert.deepEqual(crossedPads(turn - .01, .01), [0], 'Forward wrap crosses the top pad');
assert.deepEqual(crossedPads(-turn + .01, -.01), [0], 'Reverse wrap crosses the top pad');

function sequence(rpm, seconds, orientation = 0) {
  const state = makeOrbitState(), hits = [];
  const offset = orientation * Math.PI / 180;
  for (let frame = 0; frame < Math.round(seconds * 60); frame++) {
    const from = state.phase + offset;
    stepOrbit(state, {rpm, points: 5}, 1 / 60);
    hits.push(...crossedPads(from, state.phase + offset));
  }
  return hits;
}
assert.deepEqual(sequence(12, 5), [1, 2, 3, 4, 5, 6, 7, 0]);
assert.deepEqual(sequence(24, 2.5), sequence(12, 5), 'Double speed gives the same pad phrase in half the time');
assert.deepEqual(sequence(-12, 5), [7, 6, 5, 4, 3, 2, 1, 0]);
assert.deepEqual(sequence(0, 5), [], 'Stopped spin generates no automatic pad notes');
assert.equal(sequence(60, 10).length, 80, 'Fast rotations do not drop or duplicate marks');
assert.equal(sequence(-60, 10, 135).length, 80, 'Reverse spin with orientation still crosses every mark');

const notes = Array.from({length: PAD_COUNT}, (_, i) => padSound(i));
assert.deepEqual(notes.map(n => n.note), ['C3', 'D3', 'Eb3', 'F3', 'G3', 'Ab3', 'Bb3', 'C4']);
assert.equal(new Set(notes.map(n => n.tone)).size, PAD_COUNT);
assert.equal(new Set(notes.map(n => n.midi)).size, PAD_COUNT);
assert.equal(padSound(2, {scale: 'major'}).note, 'E3');
assert.equal(padSound(0, {key: 2, octave: 1}).note, 'D4');
assert.equal(padSound(5, {scale: 'pentatonic'}).note, 'C4');

for (const [width, height] of [[300, 146], [370, 167], [391, 355], [480, 300]]) {
  const {cx, cy, ring} = padGeometry(width, height);
  for (let i = 0; i < PAD_COUNT; i++) {
    const x = cx + Math.cos(padAngle(i)) * ring, y = cy + Math.sin(padAngle(i)) * ring;
    assert(x >= 20 && x <= width - 20 && y >= 20 && y <= height - 20, 'Pad targets fit within the canvas');
  }
}
console.log('PASS: pad crossings, wrap/reverse/stop, RPM scaling, transposed notes, distinct tones and portrait pad geometry.');
