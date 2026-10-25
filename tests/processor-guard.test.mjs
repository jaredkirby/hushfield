import test from 'node:test';
import assert from 'node:assert/strict';
import {createProcessorGuard} from '../dist/audio-lifecycle.mjs';
test('a processor failure reports once and retired processors cannot fail the replacement graph',()=>{
  const failures=[],guard=createProcessorGuard(error=>failures.push(error.message));
  const retired={},active={};
  guard.watch([retired]);const stale=retired.onprocessorerror;
  guard.watch([active]);stale();
  assert.deepEqual(failures,[]);
  active.onprocessorerror();active.onprocessorerror?.();
  assert.deepEqual(failures,['Sound engine stopped. Tap Restart audio.']);
});
