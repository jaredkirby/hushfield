import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {TEXTURE_ROLES} from '../dist/ambient-dsp.mjs';
import {TEXTURE_CHARACTERS, matchingTextureCharacter} from '../dist/texture-character.mjs';
import {HARMONIC_PITCHES} from '../dist/texture-harmony.mjs';

function grain(params, source = () => .3, rate = 8000) {
  let Processor;
  class Base { constructor() { this.messages = []; this.port = {postMessage: message => this.messages.push(message)}; } }
  const context = {AudioWorkletProcessor: Base, sampleRate: rate, Math: Object.assign(Object.create(Math), {random: () => .5}), Float32Array, registerProcessor: (id, C) => { if (id === 'grain-engine') Processor = C; }};
  vm.runInNewContext(readFileSync(new URL('../dist/grain-worklet.js', import.meta.url), 'utf8'), context);
  const engine = new Processor({processorOptions: {params: {size: 200, density: 20, spray: 0, width: 0, scanOn: false, ...params}, playing: true}});
  engine.port.onmessage({data: {type: 'sample', channels: [Float32Array.from({length: rate}, (_, i) => source(i))], sampleRate: rate}});
  let receiver;
  engine.port.onmessage({data: {type: 'phrasePort', port: {set onmessage(fn) { receiver = fn; }}}});
  return {engine, phrase: phrase => receiver({data: {phrase}}), params: value => engine.port.onmessage({data: {type: 'params', params: value}})};
}
function render(engine, seconds, rate = 8000) {
  const pcm = [];
  for (let at = 0; at < rate * seconds; at += 128) { const out = [[new Float32Array(128), new Float32Array(128)]]; engine.process([], out); pcm.push(...out[0][0]); }
  return pcm;
}
const rms = values => Math.sqrt(values.reduce((sum, v) => sum + v * v, 0) / values.length);

test('Tone 0 is exact; darker removes highs and airier removes lows', () => {
  assert.deepEqual(render(grain({textureTone: 0}).engine, 1), render(grain({}).engine, 1), 'Tone off leaves classic PCM untouched');
  const bright = i => Math.sin(i * Math.PI * .9) * .3, low = () => .3;
  const fullHigh = rms(render(grain({}, bright).engine, 2)), darkHigh = rms(render(grain({textureTone: -60}, bright).engine, 2));
  assert(darkHigh < fullHigh * .5, `Darker cuts a 3.6 kHz tone (${darkHigh} vs ${fullHigh})`);
  const fullLow = rms(render(grain({}, low).engine, 2)), airyLow = rms(render(grain({textureTone: 60}, low).engine, 2));
  assert(airyLow < fullLow * .7, `Airier thins steady low content (${airyLow} vs ${fullLow})`);
  const live = grain({});
  live.params({textureTone: -40}); render(live.engine, .2); live.params({textureTone: 0});
  assert.deepEqual(Array.from(live.engine.toneState), [0, 0, 0, 0], 'Turning Tone off clears filter state');
});

test('Follow arrangement scales the section role and 0 turns it off', () => {
  const role = {section: 'statement', ...TEXTURE_ROLES.statement, harmonic: true};
  for (const [follow, level] of [[100, TEXTURE_ROLES.statement.level], [50, 1 + (TEXTURE_ROLES.statement.level - 1) / 2], [0, 1]]) {
    const g = grain({textureFollow: follow}); g.phrase({textureDensity: 1, textureRole: role});
    assert(Math.abs(g.engine.roleLevelTarget - level) < 1e-9, `follow ${follow}`);
  }
  const g = grain({}); g.phrase({textureDensity: 1, textureRole: role});
  g.params({textureFollow: 0});
  assert.equal(g.engine.roleLevelTarget, 1, 'Changing Follow retargets the current role');
  assert.equal(g.engine.phraseDensityTarget, 1);
  assert.equal(g.engine.role.harmonic, true, 'Follow does not switch off harmonic pitch');
});

test('characters are recognisable, distinct and inside every control range', () => {
  const ranges = {size: [15, 1500], density: [1, 80], spray: [0, 100], pitch: [-24, 24], reverse: [0, 100], static: [0, 100], jump: [0, 100], hold: [0, 100], elastic: [0, 100], chaos: [0, 100], speed: [0, 2], wander: [0, 100], smooth: [0, 100], textureTone: [-100, 100]};
  const signatures = new Set();
  for (const [key, character] of Object.entries(TEXTURE_CHARACTERS)) {
    for (const [id, value] of Object.entries(character.params)) assert(value >= ranges[id][0] && value <= ranges[id][1], `${key}.${id}`);
    assert(HARMONIC_PITCHES.includes(character.params.pitch), `${key} pitch stays harmonic`);
    assert.equal(matchingTextureCharacter({position: 50, ...character.params}), key);
    signatures.add(JSON.stringify(character.params));
  }
  assert.equal(signatures.size, 4);
  assert.equal(matchingTextureCharacter({...TEXTURE_CHARACTERS.halo.params, size: 701}), null, 'Any edit becomes Custom');
});

test('Scenes set composition and character but keep the Sound preset voice levels', async () => {
  const {AMBIENT_DEFAULTS, AMBIENT_SCENES, applyAmbientScene, SCENE_VOICE_FIELDS} = await import('../dist/ambient-settings.mjs');
  const {applyFoundationPreset, matchingFoundationPreset, FOUNDATION_PRESETS} = await import('../dist/foundation-presets.mjs');
  for (const preset of FOUNDATION_PRESETS) {
    for (let scene = 0; scene < AMBIENT_SCENES.length; scene++) {
      const state = applyAmbientScene(applyFoundationPreset({...AMBIENT_DEFAULTS}, preset.id), scene);
      assert.equal(matchingFoundationPreset(state)?.id, preset.id, `${AMBIENT_SCENES[scene].name} keeps ${preset.label}`);
      for (const key of ['key', 'scale', 'change', 'activity', 'evolution', 'bell']) assert.equal(state[key], AMBIENT_SCENES[scene][key]);
      for (const key of SCENE_VOICE_FIELDS) assert.equal(state[key], preset.settings[key]);
    }
  }
});
