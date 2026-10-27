import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlaybackDiagnostics } from '../dist/playback-diagnostics.mjs';

test('records lifecycle state at event time with both clocks', () => {
  let audioTime = 12;
  const diagnostics = createPlaybackDiagnostics({
    readState: () => ({ visibility: 'visible', contextState: 'running', audioTime,
      audioSessionState: 'active', audioSessionType: 'playback', desired: true, pending: false, shouldRun: true }),
    now: () => ({ wallTime: 1700000000000, monotonicTime: 456 })
  });
  diagnostics.record('context-state', 'running');
  audioTime = 18;
  diagnostics.record('visibility', 'hidden');
  const [first, second] = diagnostics.entries();
  assert.equal(first.wallTime, 1700000000000);
  assert.equal(first.monotonicTime, 456);
  assert.equal(first.state.audioTime, 12);
  assert.equal(second.state.audioTime, 18);
  assert.deepEqual(first.state, { visibility: 'visible', contextState: 'running', audioTime: 12,
    audioSessionState: 'active', audioSessionType: 'playback', desired: true, pending: false, shouldRun: true });
});

test('retains only the newest bounded events and supports clearing and markers', () => {
  const diagnostics = createPlaybackDiagnostics({ limit: 3, now: () => 5 });
  for (let i = 0; i < 10; i++) diagnostics.record('event', i);
  assert.deepEqual(diagnostics.entries().map(entry => entry.detail), [7, 8, 9]);
  diagnostics.mark('Call answered, observed manually');
  assert.equal(diagnostics.entries().length, 3);
  assert.equal(diagnostics.entries().at(-1).event, 'marker');
  assert.equal(diagnostics.entries().at(-1).detail, 'Call answered, observed manually');
  assert.equal(diagnostics.entries()[0].wallTime, 5);
  assert.equal(diagnostics.entries()[0].monotonicTime, null);
  diagnostics.clear();
  assert.deepEqual(diagnostics.entries(), []);
  diagnostics.record('after-clear');
  assert.equal(diagnostics.entries().length, 1);
});

test('state whitelisting omits project contents, buffers and arbitrary objects', () => {
  const buffer = new Float32Array([.1, .2]);
  const source = { contextState: 'running', audioTime: 1, type: 'playback', desired: true,
    buffer, project: { name: 'Private title' }, microphoneName: 'Private device', other: 'secret' };
  const diagnostics = createPlaybackDiagnostics({ readState: () => source, now: () => 0 });
  const returned = diagnostics.record('start', source);
  source.audioTime = 99;
  assert.equal(returned.state.audioTime, 1);
  assert.equal(returned.state.audioSessionType, 'playback');
  assert.equal('detail' in returned, false);
  const text = JSON.stringify(diagnostics.entries());
  for (const forbidden of ['Private', 'secret', 'buffer', 'project', 'microphoneName']) assert.equal(text.includes(forbidden), false);
});

test('callers cannot mutate stored evidence through record or entries results', () => {
  const diagnostics = createPlaybackDiagnostics({ readState: () => ({ desired: true }), now: () => 0 });
  const returned = diagnostics.record('start', 'tap');
  returned.state.desired = false;
  returned.event = 'changed';
  const entries = diagnostics.entries();
  entries[0].state.desired = false;
  entries[0].detail = 'changed';
  entries.push(returned);
  assert.equal(diagnostics.entries().length, 1);
  assert.equal(diagnostics.entries()[0].state.desired, true);
  assert.equal(diagnostics.entries()[0].event, 'start');
  assert.equal(diagnostics.entries()[0].detail, 'tap');
});

test('only bounded primitive details are retained, without coercing objects', () => {
  const diagnostics = createPlaybackDiagnostics({ now: () => 0 });
  const hostile = { toString() { throw Error('Do not coerce detail'); } };
  for (const detail of [hostile, new Error('private'), [1], new Uint8Array([1]), Infinity, NaN, undefined]) {
    assert.equal('detail' in diagnostics.record('event', detail), false);
  }
  for (const detail of [false, true, 0, 3.5, null]) assert.equal(diagnostics.record('event', detail).detail, detail);
  const clipped = diagnostics.record('e'.repeat(300), 'd'.repeat(500));
  assert.equal(clipped.event.length, 80);
  assert.equal(clipped.detail.length, 160);
  assert.equal(diagnostics.record(hostile).event, 'unknown');
});

test('missing APIs, invalid state and failed readers do not interrupt playback code', () => {
  let fail = false;
  const diagnostics = createPlaybackDiagnostics({
    readState: () => { if (fail) throw Error('unavailable'); return { contextState: {}, audioTime: Infinity,
      desired: 1, shouldRun: 'yes', pending: null, visibility: 'private state', audioSessionState: 'unknown' }; },
    now: () => { throw Error('clock unavailable'); }
  });
  const entry = diagnostics.record('unsupported');
  assert.equal(entry.wallTime, null);
  assert.equal(entry.monotonicTime, null);
  assert.equal(Object.values(entry.state).every(value => value === null), true);
  fail = true;
  assert.doesNotThrow(() => diagnostics.record('reader-error'));
  assert.doesNotThrow(() => createPlaybackDiagnostics().record('default-clock'));
});

test('invalid or extreme limits still bound memory', () => {
  for (const [limit, expected] of [[0, 1], [-5, 1], [2.9, 2], [NaN, 200], [Infinity, 200], [100000, 2000]]) {
    const diagnostics = createPlaybackDiagnostics({ limit, now: () => 0 });
    for (let i = 0; i < 2100; i++) diagnostics.record('event', i);
    assert.equal(diagnostics.entries().length, expected);
    assert.equal(diagnostics.entries().at(-1).detail, 2099);
  }
});
