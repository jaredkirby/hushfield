import test from 'node:test';
import assert from 'node:assert/strict';
import {createSampleSelection} from '../dist/sample-selection.mjs';

test('a later selection owns the sample even when an older decode finishes last', async () => {
  const shown = [], selection = createSampleSelection();
  let finishOld;
  const old = selection.run(() => new Promise(resolve => finishOld = resolve), value => shown.push(value));
  await selection.run(async () => 'new project', value => shown.push(value));
  finishOld('old import'); await old;
  assert.deepEqual(shown,['new project']);
  let finishImport;
  const pending = selection.run(() => new Promise(resolve => finishImport = resolve), value => shown.push(value));
  selection.cancel(); shown.push('demo'); finishImport('import'); await pending;
  assert.deepEqual(shown,['new project','demo']);
});

test('a microphone take reserves ownership before capture, so a later demo is retained',async()=>{
  const selected=[],selection=createSampleSelection();
  const take=selection.reserve();
  selection.cancel();selected.push('new demo');
  const applied=await take.run(async()=> 'old microphone take',value=>selected.push(value));
  assert.equal(applied,false);assert.deepEqual(selected,['new demo']);
});
