import test from 'node:test';
import assert from 'node:assert/strict';
import { resetEditorSettings } from '../dist/editor-reset.mjs';
import { createSessionDefaults, INITIAL_PARAMS } from '../dist/session-defaults.mjs';
import { selectPiecePreset } from '../dist/piece-presets.mjs';
import { VISUAL_DEFAULTS } from '../dist/visual-analysis.mjs';
import { createControlHistory } from '../dist/control-history.mjs';
import { serializeProject, decodeProject } from '../dist/project-file.mjs';

function editedSession() {
  const selected = selectPiecePreset('worn', { defaults: INITIAL_PARAMS, cancelPending() {} });
  return {
    params: { ...selected.params, trimStart: 13, trimEnd: 82, denoise: 27,
      orbitBalls: 9, orbitSpin: -30, reverbModel: 'chamber', reverbDecay: 6,
      tapeSurfaceTension: 85, tapeStiffness: 30 },
    piece: { ...selected.piece, foundation: 54, texture: 63, motion: 18,
      source: 'frozen', followHarmony: false },
    ambient: { ...selected.ambient, seed: 8119, compositionVersion: 1,
      points: [{ x: .2, y: .6 }, { x: .3, y: .3 }, { x: .4, y: .2 }, { x: .8, y: .7 }] },
    sound: selected.soundState,
    visual: { ...VISUAL_DEFAULTS, mode: 'vector', gain: 3, trail: 20,
      waveformSmoothing: 11, foundationLines: 10, foundationStars: 90 },
    volume: .23,
    controls: { ...selected.controls, filterType: 'highpass', orbitShape: '8',
      orbitKey: 'F', orbitScale: 'major', orbitInstrument: 'bell' }
  };
}

test('reset defaults are the actual fresh Stillwater session, including sound banks and Plate', () => {
  const defaults = createSessionDefaults();
  const startup = selectPiecePreset('still', { defaults: INITIAL_PARAMS, cancelPending() {} });
  assert.deepEqual(defaults.params, startup.params);
  assert.deepEqual(defaults.ambient, startup.ambient);
  assert.deepEqual(defaults.sound, startup.soundState);
  assert.deepEqual(defaults.visual, VISUAL_DEFAULTS);
  assert.equal(defaults.ambient.instrument, 'juno');
  assert.equal(defaults.params.tapeOn, true);
  assert.equal(defaults.params.reverbModel, 'plate');
  assert.equal(defaults.sound.triggers.base.level, 30);
  assert.equal(defaults.sound.balls.base.cutoff, 1400);
  defaults.sound.triggers.base.level = 95;
  defaults.ambient.points[0].x = .9;
  assert.equal(createSessionDefaults().sound.triggers.base.level, 30);
  assert.equal(createSessionDefaults().ambient.points[0].x, .17);
});

test('Foundation restores its fresh sound and artwork while keeping this Piece and all other editors', () => {
  const before = editedSession();
  const after = resetEditorSettings('foundation', before);
  const defaults = createSessionDefaults();
  assert.deepEqual(after.ambient, { ...defaults.ambient, seed: before.ambient.seed });
  assert.equal(after.visual.foundationLines, 24);
  assert.equal(after.visual.foundationStars, 36);
  assert.deepEqual({ ...after.visual, foundationLines: 10, foundationStars: 90 }, before.visual);
  for (const section of ['params', 'piece', 'sound', 'volume', 'controls']) {
    assert.deepEqual(after[section], before[section], section);
  }
});

test('Texture resets grain development and its waveform without changing selected material or its trim', () => {
  const before = editedSession();
  before.params.scanOn = false;
  before.params.scanMode = 'reverse';
  before.params.freeze = true;
  const after = resetEditorSettings('texture', before);
  assert.equal(after.params.pitch, 0);
  assert.equal(after.params.size, 320);
  assert.equal(after.params.reverse, 15);
  assert.equal(after.params.scanOn, true);
  assert.equal(after.params.scanMode, 'forward');
  assert.equal(after.params.freeze, false);
  assert.equal(after.visual.waveformSmoothing, 65);
  for (const key of ['trimStart', 'trimEnd', 'denoise', 'sampleLevel', 'orbitLevel',
    'orbitBalls', 'orbitSpin', 'cutoff', 'reverbModel', 'delayMix', 'tapeStiffness']) {
    assert.equal(after.params[key], before.params[key], key);
  }
  assert.deepEqual({ ...after.visual, waveformSmoothing: 11 }, before.visual);
  for (const section of ['piece', 'ambient', 'sound', 'volume', 'controls']) {
    assert.deepEqual(after[section], before[section], section);
  }
});

test('Motion resets its geometry and both editable sound banks while preserving Blend and harmony link', () => {
  const before = editedSession();
  before.sound.triggers.items[2] = { level: 90, enabled: false };
  const after = resetEditorSettings('motion', before);
  assert.equal(after.params.orbitBalls, 5);
  assert.equal(after.params.orbitSpin, 12);
  assert.equal(after.params.orbitTriggers, 8);
  assert.deepEqual(after.sound, createSessionDefaults().sound);
  assert.deepEqual(after.controls, { ...createSessionDefaults().controls, filterType: 'highpass' });
  assert.deepEqual(after.piece, before.piece);
  assert.deepEqual(after.ambient, before.ambient);
  assert.deepEqual(after.visual, before.visual);
  for (const key of ['pitch', 'trimStart', 'denoise', 'cutoff', 'reverbModel', 'delayMix']) {
    assert.equal(after.params[key], before.params[key], key);
  }
  assert.equal(after.volume, before.volume);
});

test('Space restores filter, depth and Plate settings without touching Foundation, Texture, Motion or Tape', () => {
  const before = editedSession();
  before.params.spaceVersion = 1;
  before.params.foundationRoom = 100;
  before.params.reverbPredelay = 95;
  const after = resetEditorSettings('space', before);
  assert.equal(after.params.cutoff, 14000);
  assert.equal(after.params.spaceVersion, 2);
  assert.equal(after.params.foundationRoom, 22);
  assert.equal(after.params.reverbModel, 'plate');
  assert.equal(after.params.reverbDecay, 3);
  assert.equal(after.params.reverbPredelay, 20);
  assert.equal(after.controls.filterType, 'lowpass');
  assert.deepEqual({ ...after.controls, filterType: 'highpass' }, before.controls);
  for (const section of ['piece', 'ambient', 'sound', 'visual', 'volume']) {
    assert.deepEqual(after[section], before[section], section);
  }
  for (const key of ['size', 'pitch', 'trimStart', 'denoise', 'orbitBalls', 'orbitSpin',
    'delayMix', 'drive', 'tapeSurfaceTension']) assert.equal(after.params[key], before.params[key], key);
});

test('Tape restores fresh enabled Space Echo and visual mechanics without changing the rest of the Piece', () => {
  const before = editedSession();
  before.params.tapeOn = false;
  const after = resetEditorSettings('tape', before);
  assert.equal(after.params.tapeOn, true);
  assert.equal(after.params.tapeModel, 2);
  assert.equal(after.params.delayMix, 16);
  assert.equal(after.params.echoMode, 4);
  assert.equal(after.params.springMix, 12);
  assert.equal(after.params.tapeSurfaceTension, 50);
  assert.equal(after.params.tapeStiffness, 80);
  for (const section of ['piece', 'ambient', 'sound', 'visual', 'volume', 'controls']) {
    assert.deepEqual(after[section], before[section], section);
  }
  for (const key of ['pitch', 'trimStart', 'denoise', 'orbitBalls', 'cutoff', 'reverbModel']) {
    assert.equal(after.params[key], before.params[key], key);
  }
});

test('reset is pure, returns independent nested settings and supports a supplied fresh configuration', () => {
  const defaults = createSessionDefaults();
  const before = editedSession(), saved = structuredClone(before);
  defaults.ambient.color = 52;
  const after = resetEditorSettings('foundation', before, defaults);
  assert.equal(after.ambient.color, 52);
  after.ambient.points[0].x = .8;
  after.sound.triggers.base.level = 95;
  after.piece.source = 'sample';
  assert.deepEqual(before, saved);
  assert.equal(defaults.ambient.points[0].x, .17);
  assert.throws(() => resetEditorSettings('visual', before), /Unknown editor/);
  assert.throws(() => resetEditorSettings('__proto__', before), /Unknown editor/);
});

test('each editor reset is one Undo action and one Redo action; resetting defaults is a no-op', () => {
  for (const editor of ['foundation', 'texture', 'motion', 'space', 'tape']) {
    let state = editedSession();
    const before = structuredClone(state);
    const history = createControlHistory({ capture: () => state, restore: value => state = value });
    history.begin(`Reset ${editor}`);
    state = resetEditorSettings(editor, state);
    history.end();
    const after = structuredClone(state);
    assert.equal(history.undo(), true, editor);
    assert.deepEqual(state, before);
    assert.equal(history.undo(), false, 'Reset contributes only one action');
    assert.equal(history.redo(), true);
    assert.deepEqual(state, after);
    history.clear();
    history.begin('Already reset'); state = resetEditorSettings(editor, state); history.end();
    assert.equal(history.undo(), false, 'Unchanged defaults do not create history');
  }
});

test('reset and save only opt the chosen editor into fresh sound models', async () => {
  const buffer = { numberOfChannels: 1, length: 4, sampleRate: 48000,
    duration: 4 / 48000, getChannelData: () => Float32Array.of(0, .25, -.25, 0) };
  for (const editor of ['foundation', 'texture', 'motion', 'space', 'tape']) {
    const legacy = editedSession();
    Object.assign(legacy.params, { spaceVersion: 1, tapeModel: 1, reverbModel: 'original' });
    const reset = resetEditorSettings(editor, legacy);
    const saved = serializeProject({ ...reset, orbitSound: reset.sound, buffer });
    const reopened = await decodeProject(saved, {
      decodeAudio: async () => buffer, defaults: INITIAL_PARAMS, ranges: {},
      controls: Object.fromEntries(Object.entries(reset.controls).map(([key, value]) => [key, [value]]))
    });
    assert.equal(reopened.ambient.compositionVersion, editor === 'foundation' ? 2 : 1, editor);
    assert.equal(reopened.params.spaceVersion, editor === 'space' ? 2 : 1, editor);
    assert.equal(reopened.params.reverbModel, editor === 'space' ? 'plate' : 'original', editor);
    assert.equal(reopened.params.tapeModel, editor === 'tape' ? 2 : 1, editor);
    assert.deepEqual(reopened.piece, legacy.piece);
    assert.equal(reopened.ambient.seed, legacy.ambient.seed);
  }
});
