import test from 'node:test';
import assert from 'node:assert/strict';
import { TAPE_DEFAULTS, SPACE_ECHO_DEFAULTS, SPACE_ECHO_MODES, restoreTape } from '../dist/tape-settings.mjs';
import { decodeProject, serializeProject } from '../dist/project-file.mjs';
import { createSessionRecovery } from '../dist/session-recovery.mjs';
import { selectPiecePreset } from '../dist/piece-presets.mjs';

const audio = { length: 8, duration: 8 / 48000, sampleRate: 48000, numberOfChannels: 1, getChannelData: () => Float32Array.from([0, .1, -.1, 0, 0, 0, 0, 0]) };
const defaults = { ...TAPE_DEFAULTS, ...SPACE_ECHO_DEFAULTS };
const decodeOptions = { defaults, ranges: {}, controls: {}, decodeAudio: async bytes => {
  assert.equal(new DataView(bytes).getUint32(0), 0x52494646, 'embedded audio survives the project round trip');
  return audio;
} };
const savedText = params => serializeProject({ name: 'Tape test', buffer: audio, params, controls: {} });

test('saved projects require an explicit valid Tape model even when fresh defaults use Space Echo', async () => {
  assert.equal(defaults.tapeModel, 2);
  for (const version of [1, 2, 3, 4, 5]) {
    for (const tapeModel of [undefined, null, '2', 0, 3, 1.5]) {
      const saved = JSON.parse(savedText({ ...TAPE_DEFAULTS, tapeModel }));
      saved.version = version;
      const project = await decodeProject(JSON.stringify(saved), decodeOptions);
      assert.equal(project.params.tapeModel, 1, `schema ${version}, model ${String(tapeModel)} remains Classic`);
      const exported = JSON.parse(serializeProject(project));
      assert.equal(exported.version, 5);
      assert.equal(exported.params.tapeModel, 1, 're-export does not silently promote Classic');
    }
  }
});

test('Space Echo settings round trip with Tape Off and retain all twelve hardware modes', async () => {
  for (const echoMode of SPACE_ECHO_MODES.map(mode => mode.value)) {
    const project = await decodeProject(savedText({ ...defaults, tapeOn: false, echoMode, springMix: 37 }), decodeOptions);
    assert.equal(project.params.tapeModel, 2);
    assert.equal(project.params.tapeOn, false);
    assert.equal(project.params.echoMode, echoMode);
    assert.equal(project.params.springMix, 37);
    assert.deepEqual(restoreTape(JSON.parse(serializeProject(project)).params), { tapeModel: 2, echoMode, springMix: 37 });
  }
  assert.deepEqual(SPACE_ECHO_MODES.map(mode => mode.heads), [[1], [2], [3], [2, 3], [1], [2], [3], [1, 2], [2, 3], [1, 3], [1, 2, 3], []]);
  assert.deepEqual(SPACE_ECHO_MODES.map(mode => mode.spring), [false, false, false, false, true, true, true, true, true, true, true, true]);
});

test('mode and spring values are validated independently of caller slider ranges', async () => {
  for (const [params, expected] of [
    [{ tapeModel: 2, echoMode: 99, springMix: -50 }, { tapeModel: 2, echoMode: 12, springMix: 0 }],
    [{ tapeModel: 2, echoMode: -8, springMix: 100 }, { tapeModel: 2, echoMode: 1, springMix: 70 }],
    [{ tapeModel: 2, echoMode: 7.6, springMix: 36.6 }, { tapeModel: 2, echoMode: 8, springMix: 37 }],
    [{ tapeModel: '2', echoMode: '8', springMix: null }, { tapeModel: 1, echoMode: 4, springMix: 12 }]
  ]) {
    const project = await decodeProject(savedText(params), decodeOptions);
    assert.deepEqual(restoreTape(project.params), expected);
  }
  assert.deepEqual(restoreTape({ tapeModel: 2, echoMode: NaN, springMix: Infinity }), { tapeModel: 2, echoMode: 4, springMix: 12 });
});

test('explicit local recovery restores Space Echo settings and legacy drafts retain Classic', async () => {
  for (const [params, model] of [[{ ...defaults, echoMode: 10, springMix: 31 }, 2], [{ ...TAPE_DEFAULTS }, 1]]) {
    let restored;
    const recovery = createSessionRecovery({
      store: { read: async () => ({ project: savedText(params), savedAt: 1 }), write: async () => {}, remove: async () => {} },
      snapshot: () => savedText(defaults),
      restore: async (text, canApply) => {
        const project = await decodeProject(text, decodeOptions);
        if (!canApply()) return false;
        restored = project;
      },
      schedule: () => 0, unschedule() {}
    });
    await recovery.ready;
    assert.equal(restored, undefined, 'a draft never changes the Piece before explicit recovery');
    assert.equal(await recovery.recover(), true);
    assert.equal(restored.params.tapeModel, model);
    if (model === 2) {
      assert.equal(restored.params.echoMode, 10);
      assert.equal(restored.params.springMix, 31);
    }
  }
});

test('Worn memory opts into Classic while fresh piece presets can use Space Echo', () => {
  assert.deepEqual(TAPE_DEFAULTS, { delayTime: .36, feedback: 28, delayMix: 16, tapeOn: false, drive: 16, wow: 10, flutter: 6, hiss: 4, tapeTone: 42 });
  for (const key of ['still', 'cloud', 'shards', 'worn']) {
    const preset = selectPiecePreset(key, { defaults, cancelPending() {} });
    assert.equal(preset.params.tapeModel, key === 'worn' ? 1 : 2);
    if (key === 'worn') {
      assert.equal(preset.params.tapeOn, true);
      assert.equal(preset.params.wow, 65);
      assert.equal(preset.params.drive, 55);
    }
  }
});
