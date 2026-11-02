import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Run the production orchestration functions with browser/audio boundaries faked.
const source = fs.readFileSync(new URL('../dist/app.js', import.meta.url), 'utf8');
function production(start, end) {
  const at = source.indexOf(start);
  assert(at >= 0, `Missing production function ${start}`);
  const until = source.indexOf(end, at + start.length);
  assert(until > at, `Missing end marker ${end}`);
  return source.slice(at, until);
}
const outputSource = production('function ensureOutput() {', '\nasync function ensureAudio()');
const testSource = production('async function testSound() {', '\nasync function restartAudio()');
const restartSource = production('async function restartAudio() {', '\nfunction inspectAudioClock(');
const resetSource = production('function resetAudioGraph() {', '\nlet audioInitialization;');
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return {promise, resolve, reject};
}
function harness() {
  const route = deferred(), events = [], notes = [], errors = [];
  const elements = new Map();
  const $ = id => {
    if (!elements.has(id)) elements.set(id, {value: id === 'volume' ? '0.55' : '', textContent: '', disabled: false});
    return elements.get(id);
  };
  let created = 0;
  const node = () => ({gain: {value: 0}, connect() {}});
  class Audio {
    constructor() { created++; events.push('create'); this.state = 'running'; this.destination = {}; }
    createGain() { return node(); }
    createAnalyser() { return node(); }
    createDynamicsCompressor() {
      return {...node(), threshold: {}, knee: {}, ratio: {}, attack: {}, release: {}};
    }
  }
  const state = vm.createContext({
    window: {AudioContext: Audio}, ctx: null, master: null, analyser: null, limiter: null, visuals: null, $, Promise,
    requestPlaybackSession() { events.push('playback-session'); },
    resumeFromTap(context) { events.push('resume'); assert.equal(context, state.ctx); return Promise.resolve(); },
    outputRouting: {bindContext(context) { events.push(context ? 'bind' : 'unbind'); return context ? route.promise : Promise.resolve(); }},
    playTestNotes(context, destination) { notes.push({context, destination}); events.push('notes'); },
    verifyAudioClock() { events.push('clock'); return Promise.resolve(); },
    updateAudioState(message) { if (message) errors.push(message); }, toast(message) { errors.push(message); },
    running: false, playPending: false, restartPending: false, audioGeneration: 0,
    outputRecording: false, micRecording: false, captureStarting: false, previewNode: null,
    syncPlayback() {}, silenceOrbit() {}, updateTransport() {},
    resetAudioGraph() { state.ctx = null; events.push('reset'); },
    ensureAudio() { events.push('ensureAudio'); return Promise.resolve(); }
  });
  vm.runInContext(outputSource + '\n' + testSource + '\n' + restartSource, state);
  return {state, route, events, notes, errors, $, created: () => created};
}

test('output activation resumes in the gesture and waits for route readiness', async () => {
  const h = harness();
  const activation = h.state.ensureOutput();
  assert.equal(h.created(), 1);
  assert.deepEqual(h.events, ['playback-session', 'create', 'resume', 'bind']);
  let ready = false;
  activation.then(() => { ready = true; });
  await Promise.resolve();
  assert.equal(ready, false);
  h.route.resolve();
  await activation;
  assert.equal(ready, true);
});

test('test notes use the selected output only after routing succeeds', async () => {
  const h = harness();
  const audition = h.state.testSound();
  const active = h.state.ctx;
  assert.equal(h.notes.length, 0);
  h.route.resolve();
  const result = await audition;
  assert.match(result, /Test notes sent.*audio clock OK/);
  assert.equal(h.notes.length, 1);
  assert.equal(h.notes[0].context, active);
  assert.equal(h.notes[0].destination, h.state.master);
  assert.equal(h.state.running, false, 'Test sound must not start the Piece');
  assert.match(h.$('audioDetail').textContent, /audio clock OK/);
});

test('zero-volume Test sound returns guidance for the open Output dialog', async () => {
  const h = harness();
  h.$('volume').value = '0';
  const result = await h.state.testSound();
  assert.match(result, /VOL is 0%.*Raise the volume/);
  assert.equal(h.notes.length, 0);
  assert.equal(h.state.running, false);
  h.route.resolve();
});

test('a denied retained route prevents test notes and reports the failure', async () => {
  const h = harness();
  const audition = h.state.testSound();
  h.route.reject(new Error('Speaker permission denied'));
  assert.equal(await audition, 'Speaker permission denied');
  assert.equal(h.notes.length, 0);
  assert.equal(h.state.running, false);
  assert(h.errors.includes('Speaker permission denied'));
});

test('test notes from a retired context cannot sound or overwrite replacement status', async () => {
  const h = harness();
  const audition = h.state.testSound();
  h.state.ctx = {state: 'running', replacement: true};
  h.$('audioDetail').textContent = 'Replacement ready';
  h.route.resolve();
  await audition;
  assert.equal(h.notes.length, 0);
  assert.equal(h.$('audioDetail').textContent, 'Replacement ready');
  assert.deepEqual(h.errors, []);
});

test('Restart waits for selected-output readiness before audition and Piece activation', async () => {
  const h = harness();
  h.state.running = true;
  const restarting = h.state.restartAudio();
  assert.equal(h.state.running, false);
  assert.equal(h.notes.length, 0);
  assert.equal(h.state.restartPending, true);
  assert.equal(h.events.includes('ensureAudio'), false);
  h.route.resolve();
  await restarting;
  assert.equal(h.notes.length, 1);
  assert.equal(h.state.running, true);
  assert.equal(h.state.restartPending, false);
  assert(h.events.indexOf('resume') < h.events.indexOf('bind'));
  assert(h.events.indexOf('notes') < h.events.indexOf('ensureAudio'));
});

test('Restart routing failure leaves the Piece stopped without an audition', async () => {
  const h = harness();
  const restarting = h.state.restartAudio();
  h.route.reject(new Error('Output unavailable'));
  await restarting;
  assert.equal(h.state.running, false);
  assert.equal(h.notes.length, 0);
  assert.equal(h.state.restartPending, false);
  assert.equal(h.$('playBtn').disabled, false);
  assert(h.errors.includes('Output unavailable'));
});

test('retiring a context during Restart routing suppresses its audition', async () => {
  const h = harness();
  const restarting = h.state.restartAudio();
  h.state.audioGeneration++;
  h.state.ctx = {replacement: true};
  h.route.resolve();
  await restarting;
  assert.equal(h.notes.length, 0);
  assert.equal(h.state.running, false);
});

test('a retired Restart failure cannot stop or relabel replacement playback', async () => {
  const h = harness();
  const restarting = h.state.restartAudio();
  h.state.audioGeneration++;
  h.state.ctx = {replacement: true};
  h.state.running = true;
  h.$('audioDetail').textContent = 'Replacement playing';
  h.route.reject(new Error('Old speaker disconnected'));
  await restarting;
  assert.equal(h.state.running, true);
  assert.equal(h.$('audioDetail').textContent, 'Replacement playing');
  assert.deepEqual(h.errors, []);
});

test('graph retirement invalidates device requests before closing the old context', () => {
  const h = harness(), oldContext = {old: true};
  Object.assign(h.state, {
    ctx: oldContext, phraseRequest: null, harmonyChannel: null, texturePhraseChannel: null,
    processorGuard: {clear() {}},
    releaseAudioGraph({context}) { assert.equal(context, oldContext); h.events.push('release'); },
    engine: null, tapeNode: null, ambientNode: null, recordDestination: null, orbitAudio: null,
    renderClock: {invalidate() {}}
  });
  vm.runInContext(resetSource, h.state);
  h.state.resetAudioGraph();
  assert.deepEqual(h.events, ['unbind', 'release']);
  assert.equal(h.state.ctx, undefined);
});

test('output choice events stay outside recovery edits while sound settings still mark edits', () => {
  const handlers = {}, edits = [];
  const start = source.indexOf('document.addEventListener("input", (event) => {');
  const end = source.indexOf('document.addEventListener("visibilitychange", () => {', start);
  assert(start >= 0 && end > start);
  vm.runInNewContext(source.slice(start, end), {
    document: {addEventListener(type, handler) { handlers[type] = handler; }},
    markEdited() { edits.push('edit'); }
  });
  const outputTarget = {id: 'outputDevice', closest(selector) { return selector.split(',').includes('[data-output-ui]') ? {} : null; }};
  handlers.input({target: outputTarget});
  handlers.change({target: outputTarget});
  assert.deepEqual(edits, []);
  const settingTarget = {id: 'feedback', closest() { return null; }};
  handlers.input({target: settingTarget});
  handlers.change({target: settingTarget});
  assert.deepEqual(edits, ['edit', 'edit']);
});

test('keyboard use inside the Output modal cannot toggle the Piece or freeze state', () => {
  const handlers = {}, commands = [];
  let modalOpen = true;
  const start = source.indexOf('document.addEventListener("keydown", (e) => {');
  const end = source.indexOf('document.addEventListener("dragover",', start);
  assert(start >= 0 && end > start);
  vm.runInNewContext(source.slice(start, end), {
    document: {addEventListener(type, handler) { handlers[type] = handler; }, querySelector() { return modalOpen ? {} : null; }},
    $() { return {open: false}; },
    togglePlay() { commands.push('play'); }, toggleFreeze() { commands.push('freeze'); }
  });
  const key = code => ({code, target: {tagName: 'SUMMARY'}, preventDefault() { commands.push('prevent'); }});
  handlers.keydown(key('Space'));
  handlers.keydown(key('KeyF'));
  assert.deepEqual(commands, []);
  modalOpen = false;
  handlers.keydown(key('Space'));
  assert.deepEqual(commands, ['prevent', 'play']);
});
