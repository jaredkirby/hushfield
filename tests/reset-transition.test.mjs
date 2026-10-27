import test from 'node:test';
import assert from 'node:assert/strict';
import { createResetTransition } from '../dist/reset-transition.mjs';

function fixture({ state = 'running', playing = true, hold = true } = {}) {
  const calls = [], waits = [];
  const context = { state, currentTime: 5,
    resume() { throw new Error('A reset must never resume audio'); },
    createGain() { throw new Error('A reset must never create audio'); } };
  const gain = { value: .55,
    cancelScheduledValues(time) { calls.push(['cancel', time]); },
    setValueAtTime(value, time) { calls.push(['set', value, time]); },
    linearRampToValueAtTime(value, time) { calls.push(['ramp', value, time]); } };
  if (hold) gain.cancelAndHoldAtTime = time => calls.push(['hold', time]);
  let audio = { context, gain, playing }, volume = .55;
  const transition = createResetTransition({ getAudio: () => audio, getVolume: () => volume,
    wait: milliseconds => new Promise(resolve => waits.push({ milliseconds, resolve })) });
  return { calls, waits, context, gain, transition,
    setAudio(value) { audio = value; }, setVolume(value) { volume = value; },
    async finishWait() {
      const next = waits.shift();
      assert.ok(next, 'Expected a pending transition wait');
      context.currentTime += next.milliseconds / 1000;
      next.resolve();
      // Complete perform's continuation and its promise queue bookkeeping.
      await new Promise(resolve => setImmediate(resolve));
    }
  };
}

test('stopped, missing and suspended graphs apply immediately without waits or audio calls', async () => {
  for (const options of [{ playing: false }, { state: 'suspended' }, { state: 'interrupted' }, { state: 'closed' }]) {
    const f = fixture(options); let applied = false;
    const pending = f.transition.run(() => { applied = true; return 'done'; });
    assert.equal(applied, true);
    assert.equal(await pending, 'done');
    assert.deepEqual(f.calls, []);
    assert.deepEqual(f.waits, []);
  }
  const f = fixture(); f.setAudio(null); let applied = false;
  await f.transition.run(() => { applied = true; });
  assert.equal(applied, true); assert.deepEqual(f.calls, []);
});

test('playing reset waits for its fade before applying, then ramps to the latest master volume', async () => {
  const f = fixture(); let applied = false, finished = false;
  const pending = f.transition.run(() => {
    applied = true; f.calls.push(['apply']); return 'reset';
  }).then(value => { finished = true; return value; });
  assert.equal(applied, false);
  assert.deepEqual(f.calls, [['hold', 5], ['ramp', 0, 5.06]]);
  assert.equal(f.waits[0].milliseconds, 60);
  f.setVolume(.27);
  await f.finishWait();
  assert.equal(applied, true);
  assert.equal(finished, false);
  assert.deepEqual(f.calls.slice(2), [['apply'], ['cancel', 5.06], ['set', 0, 5.06], ['ramp', .27, 5.06 + .18]]);
  assert.equal(f.waits[0].milliseconds, 180);
  await f.finishWait();
  assert.equal(await pending, 'reset');
  assert.equal(finished, true);
});

test('queued resets capture current state at application time and wait for the preceding return fade', async () => {
  const f = fixture(); let value = 1;
  const seen = [];
  const first = f.transition.run(() => { seen.push(value); value += 10; });
  const second = f.transition.run(() => { seen.push(value); value *= 2; });
  assert.equal(f.waits.length, 1);
  value = 4; // A gesture made during fade-out must be included in reset history.
  await f.finishWait();
  assert.deepEqual(seen, [4]);
  assert.equal(f.waits[0].milliseconds, 180);
  await f.finishWait();
  await first;
  assert.deepEqual(seen, [4], 'Second reset is still fading out');
  assert.equal(f.waits[0].milliseconds, 60);
  value = 23;
  await f.finishWait();
  assert.deepEqual(seen, [4, 23]);
  await f.finishWait(); await second;
  assert.equal(value, 46);
});

test('replacement graphs remain untouched, while the settings callback still executes', async () => {
  for (const replaceInCallback of [false, true]) {
    const f = fixture(); let applied = false;
    const replacement = { context: { state: 'running', currentTime: 12 },
      gain: { cancelScheduledValues() { throw new Error('Touched new graph'); } }, playing: true };
    const pending = f.transition.run(() => {
      applied = true;
      if (replaceInCallback) f.setAudio(replacement);
    });
    if (!replaceInCallback) f.setAudio(replacement);
    await f.finishWait(); await pending;
    assert.equal(applied, true);
    assert.deepEqual(f.calls, [['hold', 5], ['ramp', 0, 5.06]], 'Retired graph is not touched after wait');
    assert.deepEqual(f.waits, []);
  }
});

test('a suspension or explicit Stop during fade-out restores the same gain without resuming playback', async () => {
  for (const suspend of [true, false]) {
    const f = fixture(); let applied = false;
    const pending = f.transition.run(() => { applied = true; });
    f.setVolume(.31);
    if (suspend) f.context.state = 'suspended';
    else f.setAudio({ context: f.context, gain: f.gain, playing: false });
    await f.finishWait(); await pending;
    assert.equal(applied, true);
    assert.deepEqual(f.calls.slice(-2), [['cancel', 5.06], ['set', .31, 5.06]]);
    assert.deepEqual(f.waits, []);
  }
});

test('a thrown callback still restores the graph and does not poison queued reset actions', async () => {
  const f = fixture(); let nextApplied = false;
  const failure = f.transition.run(() => { throw new Error('Reset failed'); });
  const rejected = assert.rejects(failure, /Reset failed/);
  const next = f.transition.run(() => { nextApplied = true; });
  await f.finishWait();
  assert.deepEqual(f.calls.slice(-3), [['cancel', 5.06], ['set', 0, 5.06], ['ramp', .55, 5.06 + .18]]);
  await f.finishWait(); await rejected;
  assert.equal(nextApplied, false);
  await f.finishWait();
  assert.equal(nextApplied, true);
  await f.finishWait(); await next;
});

test('AudioParam fallback anchors the current gain before fading when hold is unavailable', async () => {
  const f = fixture({ hold: false });
  const pending = f.transition.run(() => {});
  assert.deepEqual(f.calls.slice(0, 3), [['cancel', 5], ['set', .55, 5], ['ramp', 0, 5.06]]);
  await f.finishWait(); await f.finishWait(); await pending;
});
