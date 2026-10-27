import test from 'node:test';
import assert from 'node:assert/strict';
import { TapeLoop, TAPE_WHEELS } from '../dist/tape-physics.mjs';
import { TapeVisualTransport } from '../dist/tape-physics-visual.mjs';
import { tapeHeadOffset, tapeVisualState } from '../dist/tape-visual-state.mjs';
import { tapeWow, tapeFlutter } from '../dist/tape-motion.mjs';
import { TAPE_DEFAULTS } from '../dist/tape-settings.mjs';

test('guided tape starts and ends on the wheel rims, with no rigid extensions', () => {
  const tape = new TapeLoop();
  for (const [index, s] of [0, tape.transportLength].entries()) {
    const p = tape.sample(s), wheel = TAPE_WHEELS[index];
    assert(Math.abs(Math.hypot(p.x-wheel.x,p.y-wheel.y)-wheel.radius) < 1e-8);
    assert(Math.abs(p.y-(wheel.y-wheel.radius)) < 1e-8);
  }
  for (let s = 0; s <= tape.transportLength; s += 2) {
    assert(tape.sample(s).y >= Math.min(...TAPE_WHEELS.map(w=>w.y-w.radius)) - 1e-8, 'guides cannot extend into the loose loop');
  }
});

test('approved tape engine keeps its return smooth and strips separated while circulating', () => {
  for (const [speed, bend] of [[.5, 1], [2, 0]]) {
    const tape = new TapeLoop();
    for (let frame = 0; frame < 120 * 20; frame++) {
      tape.step(1 / 120, speed, bend);
      if (frame % 120) continue;
      assert(tape.health().finite);
      assert(tape.health().lengthError < .02);
      for (const [i, j] of tape.pairs(13)) assert(tape.closest(i, j).d > 10.5, 'ribbon faces remain separated');
      for (let i = 0; i < tape.n; i++) if (tape.s[i] > tape.transportLength - 6 && tape.s[i] < tape.transportLength + 50) {
        const a = (i + tape.n - 1) % tape.n, b = (i + 1) % tape.n;
        const ux = tape.x[i] - tape.x[a], uy = tape.y[i] - tape.y[a], vx = tape.x[b] - tape.x[i], vy = tape.y[b] - tape.y[i];
        assert(Math.abs(Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy)) < .3, 'no return hinge');
      }
    }
    assert(tape.travel > 65 * speed * 19, 'contacts must not freeze the tape');
  }
});

test('continuous contact guard catches tunnelling between two non-overlapping frames', () => {
  const t = Object.create(TapeLoop.prototype);
  t.n = 8; t.x = Float64Array.from([0,20,100,110,5,15,120,130]);
  t.y = Float64Array.from([0,0,100,100,8,8,100,100]);
  t.sx = t.x.slice(); t.sy = t.y.slice(); t.sy[4] = t.sy[5] = -8;
  t.weight = new Float64Array(8).fill(1);
  assert(t.pairs(.01, true).some(([i,j]) => i === 0 && j === 4));
  t.pairs = () => [[0,4]];
  assert(t.crossesDuringStep());
  t.sy[4] = t.sy[5] = 6;
  assert(!t.crossesDuringStep());
});

test('lower tape uses the processor phase, smoothed controls, and measured signal', () => {
  const params = {...TAPE_DEFAULTS, tapeOn: true, wow: 100, flutter: 100};
  const snapshot = {phase: 20, audioTime: 100, outputRms: .05, echoRms: .02,
    params: {on: 1, delayTime: .25, wow: .15, flutter: .2, drive: .3, hiss: .1, tone: .5}};
  const state = tapeVisualState(params, snapshot, 99.96, 999);
  assert.equal(state.seconds, 19.959999999999994);
  assert.equal(state.wow, .15, 'use the audio slew, not the slider target');
  assert.equal(state.signal, .4); assert.equal(state.echo, .24);
  for (const x of [TAPE_WHEELS[0].x, 240, 354, 468, TAPE_WHEELS[1].x]) assert(Math.abs(tapeHeadOffset(x, state)) < 1e-10, 'guides and all three heads stay fixed');
  const x = 297;
  const expected = 20 * Math.tanh((tapeWow(state.seconds, .15) * 3000 + tapeFlutter(state.seconds, .2) * 11000) / 20);
  assert.equal(tapeHeadOffset(x, state), expected);
  const off = tapeVisualState({...params, tapeOn: false}, snapshot, 100);
  assert.equal(tapeHeadOffset(x, off), 0, 'bypass removes character motion');
});

test('periodic sway is reduced while retaining phase and bounded displacement', () => {
  for (const [wow, flutter] of [[.1, 0], [0, .06]]) {
    let previousEnergy = 0, currentEnergy = 0;
    for (let i = 0; i < 1200; i++) {
      const seconds = i / 120;
      const previous = 20 * Math.tanh((tapeWow(seconds, wow) * 6000 + tapeFlutter(seconds, flutter) * 22000) / 20);
      const current = tapeHeadOffset(297, {seconds, wow, flutter});
      previousEnergy += previous ** 2; currentEnergy += current ** 2;
      assert.equal(Math.sign(current), Math.sign(previous), 'retain the audio modulation phase');
      assert(Math.abs(tapeHeadOffset(297, {seconds, wow: 1, flutter: 1})) <= 20);
      assert.equal(Math.abs(tapeHeadOffset(297, {seconds, wow: 0, flutter: 0})), 0);
    }
    const ratio = Math.sqrt(currentEnergy / previousEnergy);
    assert(ratio > .48 && ratio < .53, 'default periodic sway is roughly halved');
  }
});

test('stopping preserves the physical loop, and resuming never catches up hidden time', () => {
  const t = new TapeVisualTransport();
  const motion = {seconds: 1, delayTime: .36, wow: .1, flutter: .06};
  t.advance(1 / 30, true, motion);
  const x = t.tape.x.slice(), y = t.tape.y.slice(), travel = t.tape.travel, phase = t.seconds;
  t.advance(60, false, {...motion, seconds: 61});
  assert.deepEqual(t.tape.x, x); assert.deepEqual(t.tape.y, y);
  assert.equal(t.tape.travel, travel); assert.equal(t.seconds, phase);
  t.advance(60, true, {...motion, seconds: 61});
  assert(t.tape.travel - travel < 7, 'resume is limited to a short physical step');
});

test('audio waveform adds local detail while supports, bypass and silence stay still', () => {
  const state = {seconds: 1, on: 1, wow: 0, flutter: 0,
    waveform: Float32Array.from({length:32}, (_, i) => .2 * Math.sin(i * .6))};
  const offsets = [175, 297, 411, 529].map(x => tapeHeadOffset(x, state));
  assert(offsets.some(value => value > .1) && offsets.some(value => value < -.1));
  assert(Math.max(...offsets.map(Math.abs)) > 4.5, 'waveform detail exceeds the previous amplitude cap');
  for (let x = 117; x <= 591; x++) assert(Math.abs(tapeHeadOffset(x, state)) < 6.75);
  for (const x of [117, 240, 354, 468, 591]) assert(Math.abs(tapeHeadOffset(x, state)) < 1e-10);
  assert.equal(Math.abs(tapeHeadOffset(297, {...state, on: 0})), 0);
  assert.equal(Math.abs(tapeHeadOffset(297, {...state, waveform: new Float32Array(32)})), 0);
  const transport = new TapeVisualTransport();
  transport.advance(1/30, true, {...state, delayTime:.36});
  const wave = transport.waveform.slice();
  transport.advance(2, false, {...state, waveform: new Float32Array(32)});
  assert.deepEqual(transport.waveform, wave, 'pause freezes waveform movement too');
});
