import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {AmbientEngine, TEXTURE_ROLES} from '../dist/ambient-dsp.mjs';
import {snapHarmonicPitch, formatTexturePitch, HARMONIC_PITCHES} from '../dist/texture-harmony.mjs';

function grain(params, random = () => .5, rate = 8000) {
  let Processor;
  class Base { constructor() { this.messages = []; this.port = {postMessage: message => this.messages.push(structuredClone(message))}; } }
  const context = {AudioWorkletProcessor: Base, sampleRate: rate, Math: Object.assign(Object.create(Math), {random}), Float32Array, registerProcessor: (id, C) => { if (id === 'grain-engine') Processor = C; }};
  vm.runInNewContext(readFileSync(new URL('../dist/grain-worklet.js', import.meta.url), 'utf8'), context);
  const engine = new Processor({processorOptions: {params: {size: 20, density: 20, spray: 0, width: 0, scanOn: false, ...params}, playing: true}});
  engine.port.onmessage({data: {type: 'sample', channels: [new Float32Array(rate).fill(.3)], sampleRate: rate}});
  let receiver;
  engine.port.onmessage({data: {type: 'phrasePort', port: {set onmessage(fn) { receiver = fn; }}}});
  return {engine, phrase: phrase => receiver({data: {phrase}})};
}
function render(engine, seconds, rate = 8000) {
  const pcm = [];
  for (let at = 0; at < rate * seconds; at += 128) { const out = [[new Float32Array(128), new Float32Array(128)]]; engine.process([], out); pcm.push(...out[0][0]); }
  return pcm;
}
const rms = values => Math.sqrt(values.reduce((sum, v) => sum + v * v, 0) / values.length);
const firstRate = (params, phrase) => { const g = grain(params); if (phrase) g.phrase(phrase); render(g.engine, 128 / 8000); return g.engine.grains[0].rate; };

test('only developing arrangements publish a Texture role, following the arrangement section', () => {
  const classic = new AmbientEngine(8000); classic.set({arrangementVersion: 1, compositionVersion: 2});
  assert.equal(classic.phrase().textureRole, undefined, 'Saved Pieces without the arrangement keep their Texture');
  const developing = new AmbientEngine(8000); developing.set({arrangementVersion: 2, compositionVersion: 2, activity: 100}); developing.play(true);
  const seen = new Set();
  const out = [new Float32Array(512), new Float32Array(512)];
  for (let i = 0; i < 8000 * 600 / 512; i++) {
    developing.process(out);
    const role = developing.phrase().textureRole;
    assert.equal(role.section, developing.arrangement.section);
    assert.deepEqual({level: role.level, density: role.density}, TEXTURE_ROLES[role.section]);
    assert.equal(role.harmonic, true);
    seen.add(role.section);
  }
  assert(seen.size >= 3, 'Texture changes role across ten minutes: ' + [...seen]);
  assert(TEXTURE_ROLES.rest.level > TEXTURE_ROLES.statement.level * 2, 'Texture steps back for statements and fills rests');
});

test('Texture role swells level smoothly and leaves classic output exact', () => {
  const classic = grain({}), unity = grain({});
  unity.phrase({textureDensity: 1});
  assert.deepEqual(render(unity.engine, 1), render(classic.engine, 1), 'No role means classic PCM');
  const quiet = grain({}), loud = grain({});
  quiet.phrase({textureDensity: 1, textureRole: {section: 'statement', ...TEXTURE_ROLES.statement, harmonic: true}});
  loud.phrase({textureDensity: 1, textureRole: {section: 'rest', ...TEXTURE_ROLES.rest, harmonic: true}});
  const early = rms(render(quiet.engine, .25));
  render(quiet.engine, 10); render(loud.engine, 10.25);
  const settledQuiet = rms(render(quiet.engine, 2)), settledLoud = rms(render(loud.engine, 2));
  assert(early > settledQuiet * 1.4, 'Level glides down instead of jumping');
  assert(settledLoud > settledQuiet * 2, `Rest swells well above statement (${settledLoud} vs ${settledQuiet})`);
  quiet.phrase({textureDensity: 1});
  render(quiet.engine, 20);
  assert(Math.abs(quiet.engine.roleLevel - 1) < 1e-3, 'Losing the role returns to unity');
  assert(quiet.engine.messages.some(message => message.roleSection === 'statement' && message.harmonic));
});

test('harmonic Texture keeps pitch on octaves and fifths and matches the UI readout', () => {
  const role = {section: 'develop', ...TEXTURE_ROLES.develop, harmonic: true};
  assert.equal(firstRate({pitch: 3}), 2 ** (3 / 12), 'Classic Texture keeps any semitone');
  for (let pitch = -24; pitch <= 24; pitch++) {
    const snapped = snapHarmonicPitch(pitch);
    assert(HARMONIC_PITCHES.includes(snapped));
    assert(Math.abs(firstRate({pitch}, {textureDensity: 1, textureRole: role}) - 2 ** (snapped / 12)) < 1e-12, `pitch ${pitch} → ${snapped}`);
  }
  assert.equal(snapHarmonicPitch(-5), -5, 'Worn memory keeps its fifth below');
  assert.equal(formatTexturePitch(3, true), '+3 → +0 st');
  assert.equal(formatTexturePitch(7, true), '+7 st');
  assert.equal(formatTexturePitch(3, false), '+3 st');
  // Pitch variation leaps between consonant intervals instead of detuning.
  const g = grain({pitch: 0, elastic: 100}, Math.random);
  g.phrase({textureDensity: 1, textureRole: role});
  render(g.engine, 2);
  const intervals = new Set(g.engine.grains.map(entry => Math.round(12 * Math.log2(Math.abs(entry.rate)) * 1000) / 1000));
  for (const interval of intervals) assert([0, 7, 12, -12].includes(interval), 'interval ' + interval);
});
