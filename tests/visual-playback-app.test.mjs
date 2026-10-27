import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createRenderClock } from '../dist/render-clock.mjs';

const app = await readFile(new URL('../dist/app.js', import.meta.url), 'utf8');
const start = app.indexOf('function frame(time) {'), end = app.indexOf('function download(', start);
assert.ok(start >= 0 && end > start);
const production = app.slice(start, end);

function fixture(page = 'ambient') {
  const draws = [], elements = new Map();
  const $ = id => {
    if (!elements.has(id)) elements.set(id, {value: 'circle', style: {}, textContent: ''});
    return elements.get(id);
  };
  const record = kind => (...args) => draws.push({kind, args});
  const sandbox = {
    $, document: {hidden: false, body: {dataset: {spacePanel: 'reverb'}}},
    ctx: undefined, running: false, previewNode: null, activeTab: page,
    reducedMotion: {matches: false}, renderClock: createRenderClock(),
    lastFrame: 0, lastMeter: 0, artSeconds: 0, tapeSeconds: 0, tapeAngle: 0, visualFrameTime: 0,
    params: {tapeOn: true, delayTime: .36, orbitRotation: 0},
    orbitState: {phase: 0}, ambientState: {enabled: true}, ambientStats: {notes: 0,section: 1},
    ambientPoints: {render: (...args) => { draws.push({kind: 'points', args}); return []; }},
    ambientPointsDirty: false, ambientNode: null, balls: [], orbitVoices: {size: 0}, stats: {count: 0},
    tapeVisualSnapshot: null, tapeLayout: 'space-echo', spaceAnalyser: null, analyser: null,
    visuals: {settings: () => ({trail: 50}), frame: record('visual'), outputFrame() {}},
    fitCanvas: () => ({c: {}, w: 400, h: 400}),
    drawAmbient: record('foundation'), drawFoundationStars: record('stars'), drawTape: record('tape'),
    drawSpaceReverb: record('space'), drawOrbit: record('motion'), drawWave: record('texture'),
    inspectAudioClock() {}, syncTapeVisualSubscription() {}, requestAnimationFrame() {},
    boundary: value => value, shapePoints: () => [], outputAudioTime: () => 12,
    updateAmbientDisplay() {}, ditherCanvas() {}
  };
  vm.createContext(sandbox); vm.runInContext(production, sandbox);
  return {app: sandbox, draws, elements, frame(time, invalidate = false) {
    if (invalidate) sandbox.renderClock.invalidate();
    sandbox.frame(time);
  }};
}

test('all editors remain still before Start and stopped redraws keep visual clocks fixed', () => {
  for (const page of ['ambient','grain','orbit','fx','tape','visual']) {
    const f = fixture(page);
    f.frame(0);
    const initial = f.draws.length;
    f.frame(1000); f.frame(2000);
    assert.equal(f.draws.length, initial, page + ' must not animate while stopped');
    f.frame(3000, true);
    assert.equal(f.app.artSeconds, 0);
    assert.equal(f.app.tapeSeconds, 0);
    assert.equal(f.app.tapeAngle, 0);
    if (page === 'ambient') {
      assert.equal(f.draws.filter(d => d.kind === 'stars').at(-1).args[2], 0);
    }
  }
});

test('playing visuals freeze on Stop and browser interruption, including invalidated frames', () => {
  for (const page of ['ambient','orbit','fx','tape']) {
    const f = fixture(page); f.app.running = true; f.app.ctx = {state: 'running'};
    f.frame(0); f.frame(100);
    assert.ok(f.app.artSeconds > 0);
    const time = f.app.artSeconds, tapeTime = f.app.tapeSeconds, angle = f.app.tapeAngle;
    f.app.ctx.state = 'interrupted'; f.frame(200, true);
    assert.equal(f.app.artSeconds, time, page + ' interruption');
    f.app.running = false; f.app.ctx.state = 'running'; f.frame(300, true); f.frame(400, true);
    assert.equal(f.app.artSeconds, time, page + ' explicit Stop');
    assert.equal(f.app.tapeSeconds, tapeTime);
    assert.equal(f.app.tapeAngle, angle);
    if (page === 'orbit') assert.equal(f.draws.at(-1).args[1], .1, 'Motion hit flashes use the held last-playing time');
    if (page === 'tape') assert.equal(f.draws.at(-1).args[6].running, false);
  }
});

test('Tape needs both active playback and Tape On; reduced motion also keeps it still', () => {
  const f = fixture('tape'); f.app.running = true; f.app.ctx = {state: 'running'};
  f.app.params.tapeOn = false; f.frame(0); f.frame(100);
  assert.equal(f.app.tapeSeconds, 0);
  assert.equal(f.draws.at(-1).args[6].running, false);
  f.app.params.tapeOn = true; f.frame(200);
  assert.ok(f.app.tapeSeconds > 0);
  assert.equal(f.draws.at(-1).args[6].running, true);
  const time = f.app.tapeSeconds;
  f.app.reducedMotion.matches = true; f.frame(300);
  assert.equal(f.app.tapeSeconds, time);
  assert.equal(f.draws.at(-1).args[6].running, false);
});
