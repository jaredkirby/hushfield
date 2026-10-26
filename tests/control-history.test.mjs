import test from 'node:test';
import assert from 'node:assert/strict';
import { createControlHistory } from '../dist/control-history.mjs';

test('a whole gesture is one reversible settings change; navigation/no-ops are not changes', () => {
  let state = { cutoff: 14000, points: [{ x: .2 }] }, status;
  const h = createControlHistory({ capture: () => state, restore: value => state = value, onChange: value => status = value });
  h.begin('filter'); for (let i = 0; i < 100; i++) state.cutoff = 1000 + i; h.end();
  assert.equal(status.canUndo, true); assert.equal(h.undo(), true); assert.equal(state.cutoff, 14000);
  assert.equal(h.undo(), false); assert.equal(h.redo(), true); assert.equal(state.cutoff, 1099);
  h.begin(); h.end(); assert.equal(h.undo(), true); assert.equal(state.cutoff, 14000);
});
test('nested gestures, cancellation, branching and material replacement preserve history ownership', () => {
  let state = { pitch: 0, points: [{ x: .2 }] };
  const h = createControlHistory({ capture: () => state, restore: value => state = value, limit: 2 });
  h.begin('voice'); h.begin('nested'); state.points[0].x = .8; h.end(); assert.equal(h.undo(), false); h.end();
  h.undo(); assert.equal(state.points[0].x, .2); h.redo(); assert.equal(state.points[0].x, .8);
  h.begin(); state.pitch = 12; h.end({ cancelled: true }); assert.equal(state.pitch, 0);
  h.undo(); h.begin(); state.pitch = 7; h.end(); assert.equal(h.redo(), false);
  h.begin(); state.pitch = 8; h.clear(); h.end(); assert.equal(h.undo(), false);
});

test('cancellation remains sticky until all concurrent gestures finish', () => {
  let state = { a: 1, b: 2 };
  const h = createControlHistory({ capture: () => state, restore: value => state = value });
  h.begin('first'); state.a = 10; h.begin('second'); state.b = 20;
  h.end({ cancelled: true }); assert.equal(h.pending, true);
  h.end(); assert.deepEqual(state, { a: 1, b: 2 }); assert.equal(h.undo(), false);
});
