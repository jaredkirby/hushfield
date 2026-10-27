import test from 'node:test';
import assert from 'node:assert/strict';
import {serializeProject, decodeProject} from '../dist/project-file.mjs';
import {createSoundState, editSound} from '../dist/sound-patches.mjs';
import {restoreAmbient} from '../dist/ambient-settings.mjs';
import {SPACE_DEFAULTS} from '../dist/space-settings.mjs';

function buffer(channels, rate = 48000) {
  return {numberOfChannels:channels.length, length:channels[0].length, sampleRate:rate, duration:channels[0].length/rate, getChannelData:i=>Float32Array.from(channels[i])};
}
async function decode(bytes) {
  const v = new DataView(bytes), count=v.getUint16(22,true), rate=v.getUint32(24,true), length=v.getUint32(40,true)/(count*2);
  const channels=Array.from({length:count},()=>[]);
  for(let i=0;i<length;i++)for(let c=0;c<count;c++)channels[c].push(v.getInt16(44+(i*count+c)*2,true)/32768);
  return buffer(channels,rate);
}

test('a project roundtrip retains stereo sample, overrides, voices, visuals, controls and volume', async () => {
  const sounds=createSoundState();editSound(sounds,'triggers',2,'wave','square');
  const ambient=restoreAmbient({key:2,orbit:30,points:[{x:.3,y:.4},{x:.4,y:.5},{x:.6,y:.6},{x:.8,y:.5}]});
  const session={piece:{foundation:45,texture:25,motion:15,source:'frozen',followHarmony:true},name:'My take',buffer:buffer([[.5,-.5,0],[-.25,.25,1]]),params:{...SPACE_DEFAULTS,position:23,orbitBalls:7,scanMode:'reverse',freeze:true},ambient,visual:{mode:'vector',gain:2,trail:40,waveformSmoothing:38},orbitSound:sounds,controls:{filterType:'highpass',orbitShape:'6'},volume:.35};
  const serialized=serializeProject(session);
  const restored=await decodeProject(serialized,{decodeAudio:decode,defaults:{position:50,orbitBalls:5,scanMode:'forward',freeze:false},ranges:{position:{min:0,max:100,step:.1},orbitBalls:{min:1,max:12,step:1}},controls:{filterType:['lowpass','highpass'],orbitShape:['0','6']}});
  assert.equal(restored.name,'My take');
  assert.deepEqual(restored.piece,session.piece);
  assert.equal(JSON.parse(serialized).version,6);
  assert.deepEqual(restored.params,{...session.params,tapeModel:1,echoMode:4,springMix:12});
  assert.deepEqual(restored.ambient,ambient);
  assert.deepEqual(restored.orbitSound,sounds);
  assert.equal(restored.visual.mode,'vector');assert.equal(restored.visual.gain,2);assert.equal(restored.visual.waveformSmoothing,38);
  assert.deepEqual(restored.controls,session.controls);assert.equal(restored.volume,.35);
  assert.deepEqual([...restored.buffer.getChannelData(0)],[16383/32768,-.5,0]);
  assert.deepEqual([...restored.buffer.getChannelData(1)],[-.25,8191/32768,32767/32768]);
});

test('Stillwater favorites survive save/load while missing legacy instrument and Tape retain compatibility', async () => {
  const { selectPiecePreset } = await import('../dist/piece-presets.mjs');
  const { TAPE_DEFAULTS, SPACE_ECHO_DEFAULTS } = await import('../dist/tape-settings.mjs');
  const defaults = { ...TAPE_DEFAULTS, ...SPACE_ECHO_DEFAULTS };
  const selected = selectPiecePreset('still', { defaults, cancelPending() {} });
  const serialized = serializeProject({ ...selected, buffer: buffer([[0, .1]]), orbitSound: selected.soundState });
  const options = { decodeAudio: decode, defaults, ranges: { tapeModel: {min:1,max:2,step:1} }, controls: {} };
  const restored = await decodeProject(serialized, options);
  assert.equal(restored.ambient.instrument, 'juno');
  assert.equal(restored.params.tapeOn, true);
  assert.equal(restored.params.tapeModel, 2);
  const older = JSON.parse(serialized);
  older.version = 4;
  delete older.ambient.instrument;
  delete older.params.tapeOn;
  delete older.params.tapeModel;
  const legacy = await decodeProject(JSON.stringify(older), options);
  assert.equal(legacy.ambient.instrument, 'current');
  assert.equal(legacy.ambient.compositionVersion, 1);
  assert.equal(legacy.params.tapeOn, false);
  assert.equal(legacy.params.tapeModel, 1);
});
