import test from 'node:test';
import assert from 'node:assert/strict';
import {createSessionRecovery} from '../dist/session-recovery.mjs';

function storage(initial) { let value=initial;return {read:async()=>value,write:async next=>{value=next;},remove:async()=>{value=undefined;},value:()=>value}; }
test('an existing recovery draft is offered explicitly and survives edits until a choice', async()=>{
  const disk=storage({project:'previous session',savedAt:1}), restored=[];
  const session=createSessionRecovery({store:disk,snapshot:()=> 'current session',restore:async project=>{restored.push(project);},schedule:()=>0,unschedule(){}});
  await session.ready;
  assert.equal(session.available,true);assert.deepEqual(restored,[]);
  session.edited();await session.flush();
  assert.equal(disk.value().project,'previous session');
  await session.recover();
  assert.deepEqual(restored,['previous session']);
  assert.equal(session.status,'recovered');
});

test('storage failure is visible and leaves changes unsaved; retry preserves the latest revision',async()=>{
  let rejectWrite,resolveWrite,value='one',stored;
  const store={read:async()=>undefined,remove:async()=>{},write:project=>new Promise((resolve,reject)=>{resolveWrite=()=>{stored=project;resolve();};rejectWrite=reject;})};
  const errors=[];
  const session=createSessionRecovery({store,snapshot:()=>value,restore:async()=>{},schedule:()=>0,unschedule(){},onError:e=>errors.push(e.message)});
  await session.ready;session.edited();const failed=session.flush();await new Promise(resolve=>setImmediate(resolve));rejectWrite(Error('Quota exceeded'));await failed;
  assert.equal(session.status,'error');assert.equal(session.dirty,true);assert.deepEqual(errors,['Quota exceeded']);
  const retry=session.flush();await new Promise(resolve=>setImmediate(resolve));
  value='two';session.edited();resolveWrite();await retry;
  assert.equal(session.status,'unsaved');
  const latest=session.flush();await new Promise(resolve=>setImmediate(resolve));resolveWrite();await latest;
  assert.equal(stored.project,'two');assert.equal(session.status,'draft');assert.equal(session.dirty,true);
});

test('edits during draft deletion remain eligible for a later save',async()=>{
  let value='old',stored,finishRemove;
  const store={read:async()=>undefined,write:async next=>{stored=next;},remove:()=>new Promise(resolve=>finishRemove=()=>{stored=undefined;resolve();})};
  const session=createSessionRecovery({store,snapshot:()=>value,restore:async()=>{},schedule:()=>0,unschedule(){}});
  await session.ready;session.edited();await session.flush();
  const removal=session.discard();await new Promise(resolve=>setImmediate(resolve));
  value='new';session.edited();finishRemove();await removal;await session.flush();
  assert.equal(stored?.project,'new');
});

test('a recovery guard prevents late decoding from overwriting a newer parameter edit',async()=>{
  let finishDecode,current='current session';
  const session=createSessionRecovery({store:storage({project:'old draft'}),snapshot:()=>current,schedule:()=>0,unschedule(){},
    restore:async(project,canApply)=>{const decoded=await new Promise(resolve=>finishDecode=resolve);if(!canApply())return false;current=decoded;return true;}});
  await session.ready;const pending=session.recover();await new Promise(resolve=>setImmediate(resolve));
  current='new edit';session.edited();finishDecode('old draft');
  assert.equal(await pending,false);assert.equal(current,'new edit');assert.equal(session.available,true);assert.equal(session.status,'unsaved');
});
