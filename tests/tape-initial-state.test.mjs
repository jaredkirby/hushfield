import test from 'node:test';
import assert from 'node:assert/strict';
import { TapeLoop } from '../dist/tape-physics.mjs';
import { TapeVisualTransport } from '../dist/tape-physics-visual.mjs';
import { TAPE_INITIAL_STATE } from '../dist/tape-initial-state.mjs';

test('the Tape tab loads the captured arrangement immediately and holds it while paused', () => {
  const transport = new TapeVisualTransport(), tape = transport.tape;
  assert.deepEqual(Array.from(tape.x), TAPE_INITIAL_STATE.x);
  assert.deepEqual(Array.from(tape.y), TAPE_INITIAL_STATE.y);
  assert.equal(tape.travel, TAPE_INITIAL_STATE.travel);
  assert.equal(tape.time, 0, 'no startup warm-up');
  assert.equal(tape.velocity, 0);
  assert.deepEqual(tape.px, tape.x);
  transport.advance(60, false, {seconds:60});
  assert.deepEqual(Array.from(tape.x), TAPE_INITIAL_STATE.x);
  assert.deepEqual(Array.from(tape.y), TAPE_INITIAL_STATE.y);
});

test('starting from the paused snapshot preserves separation and has no large first-frame jump', () => {
  const transport = new TapeVisualTransport(), tape = transport.tape;
  const x = tape.x.slice(), y = tape.y.slice(), travel = tape.travel;
  for(let frame=0;frame<120;frame++) {
    transport.advance(1/30,true,{seconds:frame/30,delayTime:.36,wow:.1,flutter:.06});
    if(frame===0) for(let i=0;i<tape.n;i++) {
      assert(Math.hypot(tape.x[i]-x[i],tape.y[i]-y[i])<tape.rest, 'start stays within one tape segment');
    }
    if(frame%30===0) {
      assert(tape.health().finite && tape.health().lengthError<.02);
      for(const [i,j] of tape.pairs(13)) assert(tape.closest(i,j).d>10.5);
    }
  }
  assert(tape.travel-travel>200, 'tape resumes from the saved material phase');
});

test('an incompatible saved shape falls back to a valid generated loop', () => {
  const fresh = new TapeLoop();
  const incompatible = new TapeLoop({...TAPE_INITIAL_STATE,length:TAPE_INITIAL_STATE.length+1});
  assert.deepEqual(incompatible.x,fresh.x);
  assert.equal(incompatible.travel,0);
});
