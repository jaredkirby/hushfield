import assert from 'node:assert/strict';
import {createSoundState,patchFor,editSound,resetSound,restoreSoundState,soundMidi} from '../dist/sound-patches.mjs';
import {crossedPads} from '../dist/orbit-pads.mjs';

const s=createSoundState(),originalBall=structuredClone(s.balls);
editSound(s,'triggers',2,'attack',.45);
editSound(s,'triggers',2,'wave','square');
assert.equal(patchFor(s,'triggers',2).attack,.45);
assert.equal(patchFor(s,'triggers',1).attack,.01);
assert.deepEqual(s.balls,originalBall,'Trigger editing must not touch ball patches');
editSound(s,'triggers','all','level',65);
assert.equal(patchFor(s,'triggers',2).level,65);
assert.equal(patchFor(s,'triggers',2).wave,'square','All-level editing preserves unrelated individual fields');
editSound(s,'triggers','all','wave','noise');
assert.equal(patchFor(s,'triggers',2).wave,'noise','An All edit applies that field to every item');
editSound(s,'triggers',2,'delayTime',.7);
assert.equal(patchFor(s,'triggers',0).delayTime,.7,'Bank effects stay shared within that bank');
assert.equal(patchFor(s,'balls',0).delayTime,.42);
assert.deepEqual(restoreSoundState(JSON.parse(JSON.stringify(s))),s,'Independent patches survive JSON round trip');
resetSound(s,'triggers',2);
assert.equal(patchFor(s,'triggers',2).attack,.01);
assert.equal(patchFor(s,'triggers',2).level,65);
assert.deepEqual(s.balls,originalBall);
const migrated=restoreSoundState(undefined,{params:{orbitAttack:.3,orbitOctave:1,orbitVolume:51},controls:{orbitKey:'D',orbitScale:'major',orbitInstrument:'bell'}});
assert.equal(patchFor(migrated,'triggers',0).attack,.3);
assert.equal(patchFor(migrated,'balls',0).level,51);
assert.equal(soundMidi(patchFor(migrated,'triggers',0),0),62);
assert.equal(patchFor(restoreSoundState(undefined,{controls:{orbitKey:'D#',orbitInstrument:'pluck'}}),'balls',0).key,'Eb');
assert.equal(patchFor(restoreSoundState(undefined,{controls:{orbitInstrument:'pluck'}}),'balls',0).wave,'triangle');
const invalid=restoreSoundState({triggers:{base:{wave:'invalid',attack:-300,level:Infinity,enabled:false},items:{'100':{wave:'noise'},'1':{release:500}}}});
assert.equal(invalid.triggers.base.wave,'triangle');
assert.equal(invalid.triggers.base.attack,.002);
assert.equal(invalid.triggers.base.level,35);
assert.equal(invalid.triggers.base.enabled,false);
assert.equal(patchFor(invalid,'triggers',1).release,5);
assert.equal(invalid.triggers.items[100],undefined);
for(let count=1;count<=24;count++)for(const direction of [1,-1]){
  const hits=[];let phase=0;
  for(let f=1;f<=600;f++){const next=direction*f/600*Math.PI*2;hits.push(...crossedPads(phase,next,count));phase=next;}
  assert.equal(hits.length,count,`${count} triggers, direction ${direction}: one hit per mark per turn`);
  assert.equal(new Set(hits).size,count);
}
console.log('PASS: independent bank/item edits, field-wide All edits, persistence/migration, validation, and 1–24 trigger timing.');
