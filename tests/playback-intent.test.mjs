import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlaybackIntent } from '../dist/playback-intent.mjs';

function playing() {
  const intent = createPlaybackIntent();
  const token = intent.requestStart();
  assert.equal(intent.reconcileContext('running').shouldRun, false);
  assert.equal(intent.finishStart(token).shouldRun, true);
  return intent;
}

test('Start waits for both activation completion and an operational audio context', () => {
  const intent = createPlaybackIntent();
  assert.equal(intent.status().shouldRun, false);
  const token = intent.requestStart();
  assert.equal(intent.reconcileContext('running').shouldRun, false);
  assert.equal(intent.finishStart(token).accepted, true);
  assert.equal(intent.status().shouldRun, true);
  assert.equal(intent.finishStart(token).accepted, false);
});

test('an interruption before activation settles cannot start the engines', async () => {
  const intent = createPlaybackIntent();
  const token = intent.requestStart();
  intent.reconcileContext('running');
  let finishActivation;
  const activation = new Promise(resolve => { finishActivation = resolve; });
  const result = activation.then(() => intent.finishStart(token));
  intent.reconcileContext('interrupted');
  finishActivation();
  assert.equal((await result).shouldRun, false);
  assert.equal(intent.status().desired, true);
  assert.equal(intent.reconcileContext('running').shouldRun, true);
});

test('Stop during pending activation wins over a late successful activation', async () => {
  const intent = createPlaybackIntent();
  const token = intent.requestStart();
  let finishActivation;
  const activation = new Promise(resolve => { finishActivation = resolve; });
  const result = activation.then(() => intent.finishStart(token));
  assert.equal(intent.stop().desired, false);
  intent.reconcileContext('running');
  finishActivation();
  assert.deepEqual(await result, { accepted: false, ...intent.status() });
  assert.equal(intent.status().shouldRun, false);
});

test('platform interruption retains intent, while an explicit pause prevents later recovery', () => {
  const intent = playing();
  for (const state of ['interrupted', 'suspended', 'running', 'interrupted']) {
    const current = intent.reconcileContext(state);
    assert.equal(current.desired, true);
    assert.equal(current.shouldRun, state === 'running');
  }
  assert.equal(intent.stop('system-pause').shouldRun, false);
  assert.equal(intent.reconcileContext('running').shouldRun, false);
  assert.equal(intent.status().reason, 'system-pause');
});

test('a context becoming available cannot start a Piece that was never started', () => {
  const intent = createPlaybackIntent();
  for (const state of ['interrupted', 'running', 'suspended', 'running']) {
    assert.equal(intent.reconcileContext(state).shouldRun, false);
  }
});

test('restore, source audition and microphone pauses invalidate pending and prior playback', () => {
  for (const reason of ['restore', 'source-preview', 'microphone', 'processor-failure']) {
    const intent = playing();
    intent.reconcileContext('interrupted');
    const token = intent.requestStart();
    intent.stop(reason);
    intent.reconcileContext('running');
    assert.equal(intent.finishStart(token).accepted, false, reason);
    assert.equal(intent.status().shouldRun, false, reason);
  }
});

test('a newer Start survives stale success and failure from the previous attempt', () => {
  const intent = createPlaybackIntent();
  const old = intent.requestStart();
  intent.stop();
  const current = intent.requestStart();
  intent.reconcileContext('running');
  assert.equal(intent.finishStart(old).accepted, false);
  assert.equal(intent.failStart(old).accepted, false);
  assert.equal(intent.status().pending, true);
  assert.equal(intent.finishStart(current).shouldRun, true);
});

test('a failed activation clears intent and cannot revive on later context events', () => {
  const intent = createPlaybackIntent();
  const token = intent.requestStart();
  assert.equal(intent.failStart(token).accepted, true);
  assert.equal(intent.reconcileContext('running').shouldRun, false);
  assert.equal(intent.finishStart(token).accepted, false);
});

test('closed contexts clear playback intent and invalidate outstanding activation', () => {
  const intent = playing();
  const token = intent.requestStart();
  assert.equal(intent.reconcileContext('closed').desired, false);
  assert.equal(intent.finishStart(token).accepted, false);
  assert.equal(intent.reconcileContext('running').shouldRun, false);
  const fresh = intent.requestStart();
  assert.equal(intent.finishStart(fresh).shouldRun, true);
});

test('unknown states fail silent, and returned snapshots cannot mutate controller state', () => {
  const intent = playing();
  assert.equal(intent.reconcileContext(undefined).shouldRun, false);
  const snapshot = intent.status();
  snapshot.desired = false;
  assert.equal(intent.status().desired, true);
  assert.equal(intent.reconcileContext('running').shouldRun, true);
});
