import test from 'node:test';
import assert from 'node:assert/strict';
import { createMicrophoneTake } from '../dist/microphone-take.mjs';

function device() {
  const streams = [], requests = [], takes = [];
  class Recorder {
    constructor(stream) { this.stream = stream; this.state = 'inactive'; this.mimeType = 'audio/webm'; takes.push(this); }
    start() { this.state = 'recording'; }
    stop() { this.state = 'inactive'; queueMicrotask(() => { this.ondataavailable?.({data: new Blob(['audio'])}); this.onstop?.(); }); }
  }
  function allow() {
    const track = { stopped: false, stop() { this.stopped = true; } };
    const stream = { getTracks: () => [track] }; streams.push(stream); requests.shift()(stream); return track;
  }
  return {streams, takes, allow, Recorder, getUserMedia: () => new Promise(resolve => requests.push(resolve))};
}

test('repeated starts own a single microphone take and Stop releases its track', async () => {
  const hardware = device(), completed = [];
  const microphone = createMicrophoneTake({ensureAudio: async () => {}, getUserMedia: hardware.getUserMedia, Recorder: hardware.Recorder, onComplete: blob => completed.push(blob)});
  const first = microphone.start();
  microphone.start();
  await Promise.resolve();
  const track = hardware.allow();
  await first;
  assert.equal(hardware.takes.length, 1);
  assert.equal(microphone.state, 'recording');
  microphone.stop();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(track.stopped, true);
  assert.equal(microphone.state, 'idle');
  assert.equal(completed.length, 1);
});

test('cancelled permission results release their stream without creating a recorder', async () => {
  const hardware = device(), completed = [];
  const microphone = createMicrophoneTake({ensureAudio: async () => {}, getUserMedia: hardware.getUserMedia, Recorder: hardware.Recorder, onComplete: blob => completed.push(blob)});
  const pending = microphone.start();
  await Promise.resolve();
  microphone.cancel();
  const track = hardware.allow();
  await pending;
  assert.equal(track.stopped, true);
  assert.equal(hardware.takes.length, 0);
  assert.equal(microphone.state, 'idle');
  assert.deepEqual(completed, []);
});

test('recorder construction failure releases the acquired device', async () => {
  const hardware = device(), errors = [];
  const microphone = createMicrophoneTake({ensureAudio: async () => {}, getUserMedia: hardware.getUserMedia, Recorder: class { constructor() { throw Error('Unsupported format'); } }, onError: error => errors.push(error.message)});
  const pending = microphone.start(); await Promise.resolve(); const track = hardware.allow(); await pending;
  assert.equal(track.stopped, true);
  assert.equal(microphone.busy, false);
  assert.deepEqual(errors, ['Unsupported format']);
});
