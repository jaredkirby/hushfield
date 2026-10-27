import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
import {createSessionDefaults} from '../dist/session-defaults.mjs';
import {resetEditorSettings} from '../dist/editor-reset.mjs';
import {createControlHistory} from '../dist/control-history.mjs';
import {createResetTransition} from '../dist/reset-transition.mjs';
import {FOUNDATION_WAVE_DEFAULTS} from '../dist/foundation-wave-settings.mjs';

// Exercise the production functions together, leaving unrelated audio startup
// and the browser's native layout outside this focused DOM harness.
const app = readFileSync(new URL('../dist/app.js', import.meta.url), 'utf8');
const resetStart = app.indexOf('function captureControlSettings()');
const resetEnd = app.indexOf('function setupPlaybackCheck()', resetStart);
assert.ok(resetStart >= 0 && resetEnd > resetStart, 'Production reset function boundaries must exist');
const resetFunctions = app.slice(resetStart, resetEnd);
const copy = value => JSON.parse(JSON.stringify(value));
const tick = () => new Promise(resolve => setImmediate(resolve));

function fixture({playing = false, priorInert = false} = {}) {
  const nodes = new Map();
  class Element {
    attributes = {}; children = []; inert = false; disabled = false;
    set id(value) { this.name = value; nodes.set(value, this); }
    get id() { return this.name; }
    append(child) { this.children.push(child); child.parentElement = this; }
    prepend(child) { this.children.unshift(child); child.parentElement = this; }
    setAttribute(key, value) { this.attributes[key] = value; }
    removeAttribute(key) { delete this.attributes[key]; }
    focus() { document.activeElement = this; }
  }
  const node = id => { const element = new Element(); element.id = id; return element; };
  const document = {createElement: () => new Element(), body: node('body')};
  document.activeElement = document.body;
  for (const id of ['displayStage', 'controlsScroll', 'playBtn', 'volume']) node(id);
  nodes.get('displayStage').inert = priorInert;
  for (const page of ['ambientPage', 'grainPage', 'orbitPage', 'fxPage', 'tapePage']) nodes.get('controlsScroll').append(node(page));
  document.body.append(nodes.get('displayStage')); document.body.append(nodes.get('controlsScroll'));
  document.body.append(nodes.get('playBtn'));
  const defaults = createSessionDefaults();
  const initial = copy(defaults);
  Object.assign(initial.params, {drive: 70, feedback: 42, tapeOn: false,
    size: 710, orbitBalls: 9, reverbModel: 'chamber', reverbDecay: 6,
    trimStart: 13, trimEnd: 82, denoise: 21});
  Object.assign(initial.ambient, {seed: 8119, color: 82});
  Object.assign(initial.piece, {foundation: 54, texture: 63, motion: 18, source: 'frozen', followHarmony: false});
  Object.assign(initial.visual, {mode: 'vector', gain: 3, foundationLines: 10, waveformSmoothing: 11});
  initial.sound.triggers.base.level = 91;
  initial.controls.filterType = 'highpass';
  initial.controls.orbitShape = '8';
  for (const [id, value] of Object.entries(initial.controls)) node(id).value = value;
  nodes.get('volume').value = '.23';
  let visualState = copy(initial.visual), heldPicture = true, restores = 0, cancelCount = 0;
  const messages = [], calls = [], waits = [];
  const gain = {value: .23,
    cancelAndHoldAtTime(time) { calls.push(['hold', time]); },
    cancelScheduledValues(time) { calls.push(['cancel', time]); },
    setValueAtTime(value, time) { calls.push(['set', value, time]); },
    linearRampToValueAtTime(value, time) { calls.push(['ramp', value, time]); },
    setTargetAtTime(value, time) { calls.push(['target', value, time]); }};
  const audioContext = {state: 'running', currentTime: 5};
  const buffer = {material: 'frozen phrase'}, solo = 'texture';
  const context = vm.createContext({document, $: id => nodes.get(id), structuredClone,
    params: initial.params, piece: initial.piece, ambientState: initial.ambient,
    soundState: initial.sound, master: {gain}, ctx: audioContext, running: playing,
    buffer, solo, FOUNDATION_WAVE_DEFAULTS, resetEditorSettings,
    projectControls: Object.keys(initial.controls),
    visuals: {settings: () => copy(visualState), restore(value) { visualState = copy(value); heldPicture = false; restores++; },
      setFoundationWaves(patch) { Object.assign(visualState, patch); },
      setWaveformSmoothing(value) { visualState.waveformSmoothing = value; }},
    tapeInteraction: {cancel() { cancelCount++; }}, visualEditors: {cancel() { cancelCount++; }},
    resizeBalls() {}, refreshControls() {}, syncTextureSource() {}, syncAmbient() {}, markEdited() {},
    toast: message => messages.push(message)});
  context.resetTransition = createResetTransition({
    getAudio: () => ({playing: context.running, context: audioContext, gain}),
    getVolume: () => Number(nodes.get('volume').value),
    wait: milliseconds => new Promise(resolve => waits.push({milliseconds, resolve}))});
  vm.runInContext(resetFunctions, context);
  context.controlHistory = createControlHistory({capture: context.captureControlSettings, restore: context.restoreControlSettings});
  context.setupEditorResets();
  return {context, nodes, messages, calls, waits, buffer, solo,
    snapshot: () => copy(context.captureControlSettings()),
    get heldPicture() {return heldPicture;}, get restores() {return restores;}, get cancelCount() {return cancelCount;},
    reset(editor) { return nodes.get('reset-' + editor).onclick(); },
    async releaseFade() {
      const wait = waits.shift(); assert.ok(wait, 'Expected a pending fade');
      audioContext.currentTime += wait.milliseconds / 1000; wait.resolve(); await tick();
    }};
}

test('production editor resets preserve surrounding state and contribute one Undo and Redo', async () => {
  for (const editor of ['foundation', 'texture', 'motion', 'space', 'tape']) {
    const f = fixture(), before = f.snapshot();
    const expected = copy(resetEditorSettings(editor, before));
    await f.reset(editor);
    assert.deepEqual(f.snapshot(), expected, editor);
    assert.equal(f.context.buffer, f.buffer); assert.equal(f.context.solo, f.solo);
    assert.equal(f.context.running, false); assert.equal(f.waits.length, 0);
    assert.equal(f.heldPicture, true, 'Local reset preserves the separate held Visual');
    assert.equal(f.restores, 0, 'Editor appearance uses its local setter');
    assert.equal(f.context.controlHistory.undo(), true, editor);
    assert.deepEqual(f.snapshot(), before);
    assert.equal(f.context.controlHistory.undo(), false, 'Exactly one history entry');
    assert.equal(f.context.controlHistory.redo(), true);
    assert.deepEqual(f.snapshot(), expected);
    assert.match(f.messages.at(-1), /defaults restored/);
  }
});

test('running reset locks editing throughout both fades, preserves Stop, and then unlocks', async () => {
  const f = fixture({playing: true}), before = f.snapshot();
  const pending = f.reset('tape'), button = f.nodes.get('reset-tape');
  for (const id of ['displayStage', 'controlsScroll']) assert.equal(f.nodes.get(id).inert, true);
  assert.equal(f.nodes.get('playBtn').inert, false, 'Transport remains outside the locked editors');
  assert.equal(button.disabled, true); assert.equal(button.attributes['aria-busy'], 'true');
  assert.equal(f.snapshot().params.drive, 70, 'Settings wait for fade-out');
  await f.releaseFade();
  assert.equal(f.snapshot().params.drive, 16);
  assert.equal(f.nodes.get('controlsScroll').inert, true, 'Return fade still owns the edit lock');
  await f.releaseFade(); await pending;
  for (const id of ['displayStage', 'controlsScroll']) assert.equal(f.nodes.get(id).inert, false);
  assert.equal(button.disabled, false); assert.equal(button.attributes['aria-busy'], undefined);
  assert.equal(f.cancelCount, 2);
  assert.equal(f.context.controlHistory.pending, false);
  assert(f.context.controlHistory.undo()); assert.deepEqual(f.snapshot(), before);
});

test('pending gesture before reset blocks the action without disturbing the current transaction', async () => {
  const f = fixture({playing: true});
  f.context.controlHistory.begin('Active adjustment'); f.context.params.feedback = 59;
  await f.reset('tape');
  assert.equal(f.snapshot().params.drive, 70); assert.equal(f.snapshot().params.feedback, 59);
  assert.equal(f.waits.length, 0); assert.equal(f.context.controlHistory.pending, true);
  assert.equal(f.nodes.get('controlsScroll').inert, false);
  assert.match(f.messages.at(-1), /Finish the current adjustment/);
  f.context.controlHistory.end(); assert(f.context.controlHistory.undo());
  assert.equal(f.snapshot().params.feedback, 42);
});

test('a transaction entering during fade-out cannot absorb the reset or produce a success toast', async () => {
  const f = fixture({playing: true}), pending = f.reset('tape');
  // Simulate a late event from another integration despite the native inert lock.
  f.context.controlHistory.begin('Late adjustment'); f.context.params.feedback = 59;
  await f.releaseFade();
  assert.equal(f.snapshot().params.drive, 70, 'Guard prevents reset from nesting');
  await f.releaseFade(); await pending;
  assert.equal(f.context.controlHistory.pending, true, 'Unrelated transaction stays owned by its gesture');
  assert.equal(f.messages.some(message => message.includes('defaults restored')), false);
  assert.match(f.messages.at(-1), /Could not reset Tape: An adjustment is still active/);
  assert.equal(f.nodes.get('controlsScroll').inert, false);
  f.context.controlHistory.end({cancelled: true});
  assert.equal(f.snapshot().params.drive, 70); assert.equal(f.snapshot().params.feedback, 42);
  assert.equal(f.context.controlHistory.undo(), false, 'Rejected reset creates no history');
});

test('Stop during fade-out stays stopped, completes reset and restores pre-existing inert state', async () => {
  const f = fixture({playing: true, priorInert: true}), pending = f.reset('space');
  f.context.running = false;
  await f.releaseFade(); await pending;
  assert.equal(f.context.running, false); assert.equal(f.snapshot().params.reverbModel, 'plate');
  assert.equal(f.waits.length, 0, 'No playing return fade after Stop');
  assert.equal(f.nodes.get('displayStage').inert, true);
  assert.equal(f.nodes.get('controlsScroll').inert, false);
  assert.deepEqual(f.calls.at(-1), ['set', .23, 5.06]);
});
