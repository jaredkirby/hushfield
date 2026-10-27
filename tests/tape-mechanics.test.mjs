import test from 'node:test';
import assert from 'node:assert/strict';
import { TapeVisualTransport } from '../dist/tape-physics-visual.mjs';
import { TAPE_PHYSICS_DEFAULTS } from '../dist/tape-physics-settings.mjs';
import { TAPE_DEFAULTS, SPACE_ECHO_DEFAULTS } from '../dist/tape-settings.mjs';
import { applyTapePreset } from '../dist/tape-presets.mjs';
import { decodeProject, serializeProject } from '../dist/project-file.mjs';
import { createControlHistory } from '../dist/control-history.mjs';

const motion = { seconds: 1, delayTime: .36, wow: 0, flutter: 0 };

test('mechanics controls change the moving loop while preserving separation at both extremes', () => {
  const baseline = new TapeVisualTransport();
  const loops = [[0, 0], [100, 0], [0, 100], [100, 100]].map(([tapeSurfaceTension, tapeStiffness]) => ({
    transport: new TapeVisualTransport(), params: {tapeSurfaceTension, tapeStiffness}
  }));
  for (let frame = 0; frame < 60; frame++) {
    baseline.advance(1/30, true, motion);
    for (const {transport, params} of loops) transport.advance(1/30, true, motion, params);
  }
  for (const {transport} of loops) {
    const tape = transport.tape;
    assert(tape.health().finite);
    assert(tape.health().lengthError < .02, 'tape retains its length');
    for (const [i, j] of tape.pairs(13)) assert(tape.closest(i, j).d > 10.5, 'ribbon faces stay apart');
    assert(tape.travel > baseline.tape.travel - 1, 'tray resistance does not stop the drive');
  }
  const difference = (a, b) => Math.max(...a.tape.x.map((x, i) => Math.hypot(x - b.tape.x[i], a.tape.y[i] - b.tape.y[i])));
  assert(difference(loops[0].transport, loops[1].transport) > .01, 'surface tension changes loose tape motion');
  assert(difference(loops[0].transport, loops[2].transport) > .1, 'stiffness changes the folds');
  const paused = loops[0].transport, shape = paused.tape.x.slice();
  paused.advance(60, false, motion, loops[3].params);
  assert.deepEqual(paused.tape.x, shape, 'adjusting paused mechanics preserves the held picture');
});

test('mechanics survive project loading and undo, and sound presets keep their values', async () => {
  const defaults = {...TAPE_DEFAULTS, ...SPACE_ECHO_DEFAULTS, ...TAPE_PHYSICS_DEFAULTS};
  let params = {...defaults};
  const history = createControlHistory({capture: () => params, restore: value => params = value});
  history.begin('Surface tension'); params.tapeSurfaceTension = 87; history.end();
  history.begin('Tape stiffness'); params.tapeStiffness = 23; history.end();
  assert(history.undo()); assert.equal(params.tapeStiffness, 80);
  assert.equal(params.tapeSurfaceTension, 87);
  assert(history.redo()); assert.equal(params.tapeStiffness, 23);
  params = applyTapePreset(params, 'dub');
  assert.equal(params.tapeSurfaceTension, 87); assert.equal(params.tapeStiffness, 23);
  const buffer = {length: 4, duration: 4/48000, sampleRate: 48000, numberOfChannels: 1, getChannelData: () => Float32Array.of(0, .1, -.1, 0)};
  const ranges = Object.fromEntries(Object.keys(TAPE_PHYSICS_DEFAULTS).map(id => [id, {min: 0, max: 100, step: 1}]));
  const decode = saved => decodeProject(JSON.stringify(saved), {defaults, ranges, controls: {}, decodeAudio: async () => buffer});
  const saved = JSON.parse(serializeProject({name: 'Mechanics', buffer, params, controls: {}}));
  const restored = await decode(saved);
  assert.equal(restored.params.tapeSurfaceTension, 87); assert.equal(restored.params.tapeStiffness, 23);
  delete saved.params.tapeSurfaceTension; delete saved.params.tapeStiffness;
  const legacy = await decode(saved);
  for (const [id, value] of Object.entries(TAPE_PHYSICS_DEFAULTS)) assert.equal(legacy.params[id], value);
  saved.params.tapeSurfaceTension = 500; saved.params.tapeStiffness = -10;
  const bounded = await decode(saved);
  assert.equal(bounded.params.tapeSurfaceTension, 100); assert.equal(bounded.params.tapeStiffness, 0);
});
