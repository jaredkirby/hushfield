import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createPlaybackIntent } from '../dist/playback-intent.mjs';
import { createSampleSelection } from '../dist/sample-selection.mjs';

const app = await readFile(new URL('../dist/app.js', import.meta.url), 'utf8');
function region(start, end) {
  const from = app.indexOf(start), to = app.indexOf(end, from);
  if (from < 0 || to < 0) throw Error('Production playback function boundary changed: ' + start);
  return app.slice(from, to);
}
const production = [
  region('function updateTransport()', 'async function testSound()'),
  region('async function restartAudio()', 'function inspectAudioClock('),
  region('function applyProject(project)', 'const outputCapture ='),
  region('async function previewSource()', '$("previewSource").onclick = previewSource;')
].join('\n');
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const settle = () => new Promise(resolve => setImmediate(resolve));

// Run the production functions with browser activation, DOM and decode boundaries.
// These fakes record output commands; they contain no playback-policy decisions.
function fixture() {
  const elements = new Map(), sources = [], gains = [], messages = [], events = [], samples = [];
  let activation = deferred(), decoding = deferred(), activationCalls = 0, decodeCalls = 0;
  const element = id => {
    if (!elements.has(id)) elements.set(id, { textContent: '', value: .55, disabled: false,
      attributes: {}, classList: { toggle() {} }, setAttribute(key, value) { this.attributes[key] = value; } });
    return elements.get(id);
  };
  function context() {
    return { state: 'suspended', currentTime: 3, createBufferSource() {
      const source = { started: 0, stopped: 0, connect() {}, start() { this.started++; }, stop() { this.stopped++; } };
      sources.push(source); return source;
    } };
  }
  const sandbox = {
    $: element, navigator: { mediaSession: {} }, document: { body: { dataset: {}, classList: { toggle() {} } } },
    playbackIntent: createPlaybackIntent(), playbackDiagnostics: { record: (...args) => events.push(args) },
    audioGeneration: 0, auditionRevision: 0, activeStartToken: undefined,
    running: false, playPending: false, restartPending: false, audioReady: true,
    ctx: context(), previewNode: null, buffer: {}, master: { gain: { value: .55 } },
    ambientState: { hold: false }, solo: null, clockSnapshot: undefined,
    outputRecording: false, micRecording: false, captureStarting: false,
    tapeInteraction: { cancel() {} }, piece: {}, params: {}, soundState: {},
    visuals: { restore() {} }, orbitAudio: { sync() {} },
    refreshPieceUI() {}, refreshControls() {}, resetBalls() {}, syncAmbient() {}, syncTextureSource() {},
    syncPlayback() { gains.push(sandbox.running); }, silenceOrbit() {},
    toast: message => messages.push(message),
    ensureAudio() { activationCalls++; return activation.promise; },
    ensureOutput() { return Promise.resolve(); }, verifyAudioClock: async () => {}, playTestNotes() {},
    resetAudioGraph() { sandbox.ctx = context(); },
    sampleSelection: createSampleSelection(), decodeContext: () => sandbox.ctx, projectDecodeOptions: () => ({}),
    decodeProject() { decodeCalls++; return decoding.promise; },
    setSample: (...args) => samples.push(args)
  };
  vm.createContext(sandbox);
  vm.runInContext(production, sandbox, { filename: 'app-playback-functions.js' });
  return { sandbox, elements, sources, gains, messages, events, samples,
    get activationCalls() { return activationCalls; }, get decodeCalls() { return decodeCalls; },
    finishActivation(state = 'running') {
      sandbox.ctx.state = state;
      sandbox.updateAudioState(); // Deliver the browser's context-state event.
      activation.resolve();
    },
    rejectActivation(error) { activation.reject(error); },
    nextActivation() { activation = deferred(); },
    finishDecode(project) { decoding.resolve(project); },
    element
  };
}

test('actual app Stop stays available during Start and defeats late activation', async () => {
  const f = fixture(), app = f.sandbox;
  const pending = app.togglePlay();
  assert.equal(f.element('playLabel').textContent, 'STOP');
  assert.equal(f.element('playBtn').disabled, false);
  assert.equal(app.playPending, true);
  app.togglePlay();
  assert.equal(app.playbackIntent.status().desired, false);
  assert.equal(app.running, false);
  assert.equal(f.activationCalls, 1, 'Stop must not request another audio activation');
  f.finishActivation();
  await pending;
  assert.equal(app.running, false);
  assert.equal(f.gains.includes(true), false);
  assert.equal(f.element('audioStatus').textContent, 'AUDIO READY');
});

test('app context restoration follows intent and cannot override explicit Stop', async () => {
  const f = fixture(), app = f.sandbox;
  const start = app.startPlayback(); f.finishActivation(); await start;
  assert.equal(app.running, true);
  app.ctx.state = 'interrupted'; app.updateAudioState();
  assert.equal(app.running, false);
  assert.equal(app.playbackIntent.status().desired, true);
  assert.equal(f.element('playLabel').textContent, 'STOP');
  app.ctx.state = 'running'; app.updateAudioState();
  assert.equal(app.running, true);
  app.ctx.state = 'interrupted'; app.updateAudioState();
  app.stopPlayback('system-pause');
  app.ctx.state = 'running'; app.updateAudioState();
  assert.equal(app.running, false);
});

test('app does not run engines if interrupted before Start finishes', async () => {
  const f = fixture(), app = f.sandbox;
  const pending = app.startPlayback();
  f.finishActivation('interrupted');
  await pending;
  assert.equal(app.running, false);
  assert.equal(app.playbackIntent.status().desired, true);
  assert.equal(f.gains.includes(true), false);
  app.ctx.state = 'running'; app.updateAudioState();
  assert.equal(app.running, true);
});

test('Stop cancels a pending restart before its readiness checks complete', async () => {
  const f = fixture(), app = f.sandbox;
  const pending = app.restartAudio();
  assert.equal(app.restartPending, true);
  assert.equal(f.element('playLabel').textContent, 'STOP');
  app.stopPlayback();
  f.finishActivation(); await pending;
  assert.equal(app.running, false);
  assert.equal(app.restartPending, false);
  assert.equal(f.gains.includes(true), false);
});

test('pending source audition cannot start audio after explicit Stop', async () => {
  const f = fixture(), app = f.sandbox;
  const pending = app.previewSource();
  app.stopPlayback();
  f.finishActivation(); await pending;
  assert.equal(f.sources.length, 0);
  assert.equal(app.running, false);
});

test('a newer Start suppresses the pending source audition instead of mixing both', async () => {
  const f = fixture(), app = f.sandbox;
  const audition = app.previewSource();
  const start = app.startPlayback();
  f.finishActivation(); await Promise.all([audition, start]);
  assert.equal(app.running, true);
  assert.equal(f.sources.length, 0);
  assert.equal(app.previewNode, null);
});

test('an audition from a retired graph cannot start or report a stale failure', async () => {
  for (const fails of [false, true]) {
    const f = fixture(), app = f.sandbox;
    const pending = app.previewSource();
    app.audioGeneration++;
    if (fails) f.rejectActivation(new Error('retired graph'));
    else f.finishActivation();
    await pending;
    assert.equal(f.sources.length, 0);
    assert.equal(f.messages.length, 0);
  }
});

test('an active source audition stops synchronously without activating audio again', async () => {
  const f = fixture(), app = f.sandbox;
  const pending = app.previewSource(); f.finishActivation(); await pending;
  assert.equal(f.sources[0].started, 1);
  await app.previewSource();
  assert.equal(f.sources[0].stopped, 1);
  assert.equal(f.activationCalls, 1);
  assert.equal(app.previewNode, null);
});

test('project loading stops a pending Start before file reading or decoding completes', async () => {
  const f = fixture(), app = f.sandbox, reading = deferred();
  const start = app.startPlayback();
  const loading = app.loadProject({ size: 100, text: () => reading.promise });
  assert.equal(app.playbackIntent.status().desired, false);
  assert.equal(f.decodeCalls, 0);
  f.finishActivation(); await start;
  assert.equal(app.running, false);
  assert.equal(f.gains.includes(true), false);
  reading.resolve('project JSON'); await settle();
  assert.equal(f.decodeCalls, 1);
  assert.equal(f.samples.length, 0);
  f.finishDecode({ piece: {}, buffer: {}, name: 'Loaded Piece', params: {}, controls: {}, volume: .4,
    ambient: {}, visual: {}, orbitSound: {} });
  await loading;
  assert.equal(f.samples.length, 1);
  assert.equal(app.running, false);
  assert.equal(app.playbackIntent.status().desired, false);
});
