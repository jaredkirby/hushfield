import assert from 'node:assert/strict';
import {test} from 'node:test';
import {tapeLoopDrag, setupTapeLoopInteraction} from '../dist/tape-loop-interaction.mjs';
import {createControlHistory} from '../dist/control-history.mjs';

test('Tape artwork preserves the touched setting and changes time rightward and feedback upward', () => {
  const start = {delayTime: .36, feedback: 28};
  assert.deepEqual(tapeLoopDrag(start), start);
  assert.deepEqual(tapeLoopDrag(start, .1, -.2), {delayTime: .51, feedback: 41});
  assert.deepEqual(tapeLoopDrag(start, -.1, .2), {delayTime: .22, feedback: 15});
  assert.deepEqual(start, {delayTime: .36, feedback: 28});
  for (const tapeModel of [1, 2]) {
    assert.deepEqual(tapeLoopDrag({...start, tapeModel}, -100, 100), {delayTime: .05, feedback: 0});
    assert.deepEqual(tapeLoopDrag({...start, tapeModel}, 100, -100), {delayTime: 1.5, feedback: 65});
  }
  const deliberate = {delayTime: 1.2, feedback: 80};
  assert.deepEqual(tapeLoopDrag(deliberate), deliberate, 'touch does not replace a deliberately extreme saved sound');
  assert.equal(tapeLoopDrag(deliberate, .1, 0).feedback, 80, 'horizontal dragging preserves feedback');
  assert.equal(tapeLoopDrag(deliberate, 0, -.2).feedback, 80, 'artwork cannot raise feedback above an existing extreme');
  assert.equal(tapeLoopDrag(deliberate, 0, .02).feedback, 79, 'feedback lowers from the current setting without jumping to 65');
});

class Target {
  listeners = new Map();
  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(fn);
  }
  removeEventListener(type, fn) { this.listeners.get(type)?.delete(fn); }
  emit(type, values = {}) {
    const event = {target: this, button: 0, pointerId: 1, clientX: 100, clientY: 100,
      preventDefault() {}, stopPropagation() {}, ...values};
    for (const fn of this.listeners.get(type) || []) fn(event);
  }
}

function setup(width = 600, height = 400) {
  const canvas = new Target(), doc = new Target(), host = new Target();
  canvas.ownerDocument = doc; doc.defaultView = host;
  canvas.getBoundingClientRect = () => ({width, height});
  canvas.focus = () => {};
  canvas.setPointerCapture = id => canvas.captured = id;
  canvas.hasPointerCapture = id => canvas.captured === id;
  canvas.releasePointerCapture = id => { canvas.captured = null; canvas.emit('lostpointercapture', {pointerId: id}); };
  let params = {delayTime: .36, feedback: 28, tapeOn: false, drive: 16}, active = true, begins = 0, ends = [];
  const writes = [];
  const history = createControlHistory({capture: () => params, restore: state => params = state});
  const ui = setupTapeLoopInteraction({canvas, getParams: () => params,
    setParams: patch => { writes.push(patch); params = {...params, ...patch}; },
    onBegin: detail => { begins++; history.begin(detail.label); },
    onEnd: detail => { ends.push(detail); history.end({cancelled: detail.cancelled}); },
    isActive: () => active});
  return {canvas, doc, host, ui, history, writes, get params() {return params;}, get begins() {return begins;}, ends,
    deactivate() { active = false; ui.refresh(); }};
}

test('one artwork drag is one undoable edit while stopped, with unchanged surrounding settings', () => {
  const s = setup();
  s.canvas.emit('pointerdown');
  assert.equal(s.writes.length, 0, 'pointerdown never writes or starts playback');
  for (let i = 1; i <= 20; i++) s.canvas.emit('pointermove', {clientX: 100 + i * 3, clientY: 100 - i * 4});
  s.canvas.emit('pointerup');
  assert.equal(s.begins, 1); assert.equal(s.ends.length, 1); assert.equal(s.ends[0].cancelled, false);
  assert.deepEqual(s.params, {delayTime: .51, feedback: 41, tapeOn: false, drive: 16});
  assert(s.history.undo()); assert.equal(s.params.delayTime, .36); assert.equal(s.params.feedback, 28);
  assert.equal(s.history.undo(), false, 'all pointer moves belong to one transaction');
  assert(s.history.redo()); assert.equal(s.params.delayTime, .51); assert.equal(s.params.feedback, 41);
  s.ui.destroy();
});

test('pointer speed, event frequency, canvas backing resolution and CSS size do not change the endpoint', () => {
  const results = [];
  for (const [width, height, events, backing] of [[600, 400, 1, 600], [600, 400, 120, 1200], [300, 200, 60, 900]]) {
    const s = setup(width, height); s.canvas.width = backing;
    s.canvas.emit('pointerdown', {clientX: 51, clientY: 71});
    for (let i = 1; i <= events; i++) s.canvas.emit('pointermove', {clientX: 51 + width * .2 * i / events, clientY: 71 - height * .1 * i / events});
    s.canvas.emit('pointerup'); results.push(s.params); s.ui.destroy();
  }
  assert.deepEqual(results[0], results[1]); assert.deepEqual(results[0], results[2]);
});

test('cancelled capture, Escape, blur, hidden page, resize and page exit restore the original sound once', () => {
  for (const cancel of [s => s.canvas.emit('pointercancel'), s => s.canvas.emit('lostpointercapture'),
    s => s.canvas.emit('keydown', {key: 'Escape'}), s => s.doc.emit('keydown', {key: 'Escape'}),
    s => s.canvas.emit('blur'), s => s.host.emit('blur'), s => s.host.emit('resize'),
    s => { s.doc.hidden = true; s.doc.emit('visibilitychange'); }, s => s.deactivate(), s => s.ui.destroy()]) {
    const s = setup(); s.canvas.emit('pointerdown'); s.canvas.emit('pointermove', {clientX: 250, clientY: 30});
    assert.notEqual(s.params.delayTime, .36); cancel(s);
    assert.deepEqual(s.params, {delayTime: .36, feedback: 28, tapeOn: false, drive: 16});
    assert.equal(s.ends.length, 1); assert.equal(s.ends[0].cancelled, true); assert.equal(s.canvas.captured, null);
    assert.equal(s.history.undo(), false); s.ui.destroy();
  }
});

test('only primary canvas gestures act, keyboard edits share history and destroy removes listeners', () => {
  const s = setup();
  for (const event of [{target: {}}, {button: 2}, {isPrimary: false}]) s.canvas.emit('pointerdown', event);
  assert.equal(s.begins, 0);
  s.canvas.emit('pointerdown');
  s.canvas.emit('pointermove', {pointerId: 2, clientX: 600});
  s.canvas.emit('pointerup', {pointerId: 2});
  assert.equal(s.writes.length, 0); assert.equal(s.ends.length, 0);
  s.canvas.emit('pointerup'); assert.equal(s.history.undo(), false);
  s.canvas.emit('keydown', {key: 'ArrowRight'}); assert.equal(s.params.delayTime, .37);
  s.canvas.emit('keydown', {key: 'ArrowUp', shiftKey: true}); assert.equal(s.params.feedback, 38);
  s.canvas.emit('keydown', {key: 'ArrowLeft', ctrlKey: true}); assert.equal(s.params.delayTime, .37);
  assert(s.history.undo()); assert.equal(s.params.feedback, 28);
  assert(s.history.undo()); assert.equal(s.params.delayTime, .36);
  s.deactivate(); s.canvas.emit('pointerdown'); s.canvas.emit('keydown', {key: 'ArrowRight'});
  assert.equal(s.params.delayTime, .36);
  s.ui.destroy();
  for (const target of [s.canvas, s.doc, s.host]) assert([...target.listeners.values()].every(listeners => listeners.size === 0));
});
