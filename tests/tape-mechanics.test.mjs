import test from 'node:test';
import assert from 'node:assert/strict';
import { TapeVisualTransport, drawPhysicsTape } from '../dist/tape-physics-visual.mjs';
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

function tapeRenderer() {
  const layers = [];
  function context(canvas) {
    const calls = [], c = {canvas, calls};
    for (const name of ['clearRect', 'fillRect', 'save', 'restore', 'translate', 'scale', 'rotate',
      'beginPath', 'moveTo', 'lineTo', 'arc', 'closePath', 'fill', 'stroke', 'roundRect']) {
      c[name] = (...args) => calls.push([name, ...args]);
    }
    c.drawImage = () => calls.push(['drawImage']);
    c.createLinearGradient = () => ({addColorStop() {}});
    return c;
  }
  const doc = {createElement() {
    const canvas = {}, c = context(canvas);
    canvas.getContext = () => c; layers.push(c); return canvas;
  }};
  const canvas = {ownerDocument: doc, dataset: {}}, c = context(canvas);
  return {layers, draw(params, runtime, seconds = 1, angle = 0) {
    c.calls.length = 0;
    drawPhysicsTape({c, w: 600, h: 480}, params, angle, .8, seconds, {dt: 1/30, ...runtime});
    return {receipt: JSON.parse(canvas.dataset.tapeMotion), geometry: structuredClone(c.calls)};
  }};
}

function telemetry(phase) {
  return {phase, audioTime: phase,
    params: {on: 1, delayTime: .36, wow: .7, flutter: .4, drive: .3, hiss: .1, tone: .5},
    waveform: Array.from({length: 32}, (_, i) => Math.sin(i) * .1),
    headWeights: [1, .5, 1], headRms: [.01, .04, .03], outputRms: .1, echoRms: .04, springRms: .02};
}

test('Tape artwork stays still before Start and while bypassed or reduced, even with animate and telemetry', () => {
  for (const gate of [
    {running: false, tapeOn: true},
    {running: true, tapeOn: false},
    {running: true, tapeOn: true, reducedMotion: true},
    {tapeOn: true}
  ]) {
    const renderer = tapeRenderer(), params = {...TAPE_DEFAULTS, ...SPACE_ECHO_DEFAULTS, tapeOn: gate.tapeOn};
    const frame = (seconds, angle) => renderer.draw(params, {...gate, animate: true,
      telemetry: telemetry(seconds), audioTime: seconds}, seconds, angle);
    const first = frame(1, 0), later = frame(50, 70);
    assert.equal(first.receipt.moving, false);
    assert.equal(first.receipt.source, 'held');
    assert.equal(first.receipt.signal, 0, 'Inactive renderer ignores advancing audio energy');
    assert.deepEqual(later, first, 'Static redraws do not integrate, turn wheels, move heads or consume telemetry');
  }
});

test('Stop holds the actual playing picture and afterglow, then Start resumes the same loop', () => {
  const renderer = tapeRenderer(), params = {...TAPE_DEFAULTS, ...SPACE_ECHO_DEFAULTS, tapeOn: true};
  renderer.draw(params, {running: true, telemetry: telemetry(1), audioTime: 1}, 1);
  const playing = renderer.draw(params, {running: true, telemetry: telemetry(1.1), audioTime: 1.1}, 1.1, 1);
  assert.equal(playing.receipt.moving, true); assert(playing.receipt.travel > 0);
  assert(playing.receipt.waveformPeak > 0); assert(playing.receipt.signal > 0);
  const glowCalls = renderer.layers[0].calls.length;
  const stopped = renderer.draw(params, {running: false, animate: true, telemetry: telemetry(20), audioTime: 20}, 20, 50);
  const later = renderer.draw(params, {running: false, animate: true, telemetry: telemetry(90), audioTime: 90}, 90, 150);
  assert.deepEqual(stopped.geometry, playing.geometry, 'Stop freezes the actual head position and wheel angle');
  assert.deepEqual(later, stopped);
  assert.equal(stopped.receipt.travel, playing.receipt.travel);
  assert.equal(stopped.receipt.phase, playing.receipt.phase);
  assert.equal(stopped.receipt.moving, false);
  assert.equal(renderer.layers[0].calls.length, glowCalls, 'Held afterglow does not fade between stopped redraws');
  const resumed = renderer.draw(params, {running: true, telemetry: telemetry(91), audioTime: 91}, 91, 151);
  assert(resumed.receipt.travel > stopped.receipt.travel);
  assert.notDeepEqual(resumed.geometry, stopped.geometry);
});

test('turning Tape off freezes solver travel and prevents stale head activity until re-enabled', () => {
  const renderer = tapeRenderer(), params = {...TAPE_DEFAULTS, ...SPACE_ECHO_DEFAULTS, tapeOn: true};
  const playing = renderer.draw(params, {running: true, telemetry: telemetry(1), audioTime: 1}, 1);
  params.tapeOn = false;
  const bypassed = renderer.draw(params, {running: true, animate: true, telemetry: telemetry(2), audioTime: 2}, 2, 1);
  params.tapeStiffness = 0; params.tapeSurfaceTension = 100;
  const later = renderer.draw(params, {running: true, animate: true, telemetry: telemetry(30), audioTime: 30}, 30, 60);
  assert.deepEqual(later, bypassed, 'Stopped mechanics controls remain settings without moving the artwork');
  assert.equal(bypassed.receipt.travel, playing.receipt.travel);
  assert.equal(bypassed.receipt.phase, playing.receipt.phase);
  assert.equal(bypassed.receipt.signal, 0); assert.equal(bypassed.receipt.echo, 0);
  assert.equal(bypassed.receipt.headOffset, 0); assert.deepEqual(bypassed.receipt.headSignal, [0, 0, 0]);
  params.tapeOn = true;
  const resumed = renderer.draw(params, {running: true, telemetry: telemetry(31), audioTime: 31}, 31, 61);
  assert.equal(resumed.receipt.moving, true); assert(resumed.receipt.travel > later.receipt.travel);
});
