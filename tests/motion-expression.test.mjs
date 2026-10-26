import test from 'node:test';
import assert from 'node:assert/strict';
import {selectPiecePreset} from '../dist/piece-presets.mjs';
import {OrbitEngine} from '../dist/orbit-dsp.mjs';
import {createSoundState,editSound,patchFor,restoreSoundState} from '../dist/sound-patches.mjs';

function audition(soundState,bank,seconds=1.2,rate=48000,blockSize=128){
  const engine=new OrbitEngine(rate);engine.setPatches(soundState);
  assert(engine.audition(bank,0,60));
  const pcm=new Float32Array(Math.round(seconds*rate)),bus=bank==='triggers'?6:9;
  for(let at=0;at<pcm.length;at+=blockSize){
    const count=Math.min(blockSize,pcm.length-at),outputs=Array.from({length:12},()=>[new Float32Array(count),new Float32Array(count)]);
    engine.process(outputs);pcm.set(outputs[bus][0],at);
  }
  for(const value of pcm)assert(Number.isFinite(value));
  return pcm;
}
function rms(pcm,start=0,end=pcm.length){let energy=0;for(let i=start;i<end;i++)energy+=pcm[i]**2;return Math.sqrt(energy/(end-start));}
function difference(a,b){const ar=rms(a),br=rms(b);let energy=0;for(let i=0;i<a.length;i++)energy+=(a[i]/ar-b[i]/br)**2;return Math.sqrt(energy/a.length);}
function brightness(pcm,start,end,rate=48000){let energy=0,movement=0;for(let i=Math.round(start*rate)+1;i<Math.round(end*rate);i++){energy+=pcm[i]**2;movement+=(pcm[i]-pcm[i-1])**2;}return movement/energy;}

test('each complete Piece has audible independent Motion instruments at matched level',()=>{
  const voices=[];
  for(const key of ['still','cloud','shards','worn']){
    const selected=selectPiecePreset(key,{defaults:{},cancelPending:()=>{}});
    for(const bank of ['triggers','balls']){
      const pcm=audition(selected.soundState,bank);
      assert(rms(pcm)>.0001,`${key} ${bank} is audible`);
      for(const previous of voices)assert(difference(pcm,previous.pcm)>.2,`${key} ${bank} differs from ${previous.name} after loudness matching`);
      voices.push({name:`${key} ${bank}`,pcm});
    }
  }
});

test('Motion brightness opens and returns independently while amplitude remains held',()=>{
  const sounds=createSoundState();
  Object.assign(sounds.triggers.base,{wave:'sawtooth',attack:.002,decay:.01,sustain:100,gate:1,release:.1,cutoff:400,fmAmount:0,toneAttack:.002,toneDecay:.18,toneAmount:48});
  const shaped=audition(sounds,'triggers',1);
  const neutral=structuredClone(sounds);neutral.triggers.base.toneAmount=0;
  const steady=audition(neutral,'triggers',1);
  assert(brightness(shaped,.015,.06)>brightness(steady,.015,.06)*3,'Independent envelope adds a bright onset during held amplitude');
  assert(Math.abs(brightness(shaped,.65,.85)/brightness(steady,.65,.85)-1)<.02,'Tone returns to its base while the note is still held');
  sounds.triggers.base.toneAttack=.3;sounds.triggers.base.toneDecay=.3;
  const swell=audition(sounds,'triggers',1);
  assert(brightness(swell,.25,.3)>brightness(swell,.015,.04)*3,'Brightness attack can swell after amplitude reaches its sustain');
});

test('complete Piece instruments use editable brightness contours in their audible sound',()=>{
  for(const key of ['still','cloud','shards','worn'])for(const bank of ['triggers','balls']){
    const {soundState}=selectPiecePreset(key,{defaults:{},cancelPending:()=>{}});
    const shaped=audition(soundState,bank);
    soundState[bank].base.toneAmount=0;
    const neutral=audition(soundState,bank);
    assert(difference(shaped,neutral)>.005,`${key} ${bank} has an audible brightness contour`);
  }
});

test('brightness edits survive save/restore without leaking between banks, items or preset selections',()=>{
  const {soundState}=selectPiecePreset('cloud',{defaults:{},cancelPending:()=>{}}),untouched=structuredClone(soundState.balls);
  editSound(soundState,'triggers',2,'toneAmount',-19);
  editSound(soundState,'triggers',2,'toneAttack',.24);
  editSound(soundState,'triggers','all','toneDecay',1.7);
  const restored=restoreSoundState(JSON.parse(JSON.stringify(soundState)));
  assert.equal(patchFor(restored,'triggers',2).toneAmount,-19);
  assert.equal(patchFor(restored,'triggers',2).toneAttack,.24);
  assert.equal(patchFor(restored,'triggers',2).toneDecay,1.7);
  assert.deepEqual(restored.balls,untouched);
  const again=selectPiecePreset('cloud',{defaults:{},cancelPending:()=>{}}).soundState;
  assert.equal(patchFor(again,'triggers',2).toneAmount,24);
  const malformed=restoreSoundState({triggers:{base:{toneAttack:-1,toneDecay:Infinity,toneAmount:900},items:{0:{toneAmount:-900}}}});
  assert.equal(patchFor(malformed,'triggers',0).toneAmount,-48);
  assert.equal(patchFor(malformed,'triggers',1).toneAmount,48);
  assert.equal(patchFor(malformed,'triggers',1).toneAttack,.002);
  assert.equal(patchFor(malformed,'triggers',1).toneDecay,.18);
});

// Captured from the pre-expression 6e5c607 engine through audition/process.
const classicEnergy={44100:{triggers:2.4637874784762666,balls:1.0726429882834332},48000:{triggers:2.681613091560057,balls:1.1674751734176565}};
for(const rate of [44100,48000])test(`legacy patches retain classic PCM and shaped brightness follows audio samples at ${rate} Hz`,()=>{
  const legacy=createSoundState();
  for(const bank of ['triggers','balls']){
    delete legacy[bank].base.toneAttack;delete legacy[bank].base.toneDecay;delete legacy[bank].base.toneAmount;
    const pcm=audition(legacy,bank,.4,rate);
    let energy=0;for(const sample of pcm)energy+=sample**2;
    assert(Math.abs(energy-classicEnergy[rate][bank])<1e-8,`${bank} retains baseline PCM energy`);
    const neutral=structuredClone(legacy);neutral[bank].base.toneAmount=0;neutral[bank].base.toneAttack=1.9;neutral[bank].base.toneDecay=2.9;
    assert.deepEqual(audition(neutral,bank,.4,rate),pcm,'Zero depth leaves the classic static filter path unchanged');
  }
  const shaped=createSoundState();Object.assign(shaped.triggers.base,{wave:'sawtooth',toneAttack:.3,toneDecay:.5,toneAmount:-48,cutoff:16000});
  const pcm=audition(shaped,'triggers',1,rate,128);
  assert.deepEqual(audition(shaped,'triggers',1,rate,257),pcm,'Brightness progression is independent of processing block size');
  assert(brightness(pcm,.27,.32,rate)<brightness(pcm,.015,.04,rate)*.4,'Signed depth can close the filter after the note onset');
});

test('extreme brightness sweeps remain finite and all 24 overlapping voices release',()=>{
  for(const rate of [44100,48000])for(const toneAmount of [-48,48]){
    const engine=new OrbitEngine(rate),sounds=createSoundState();
    Object.assign(sounds.triggers.base,{wave:'square',level:100,resonance:12,cutoff:toneAmount>0?80:20000,toneAmount,toneAttack:.002,toneDecay:.01,attack:.002,decay:.01,sustain:100,gate:.1,release:.1});
    engine.setPatches(sounds);for(let i=0;i<24;i++)assert(engine.audition('triggers',i,48+i));
    const outputs=Array.from({length:12},()=>[new Float32Array(128),new Float32Array(128)]);
    for(let at=0;at<rate*.4;at+=128){engine.process(outputs);for(const channel of outputs[6])for(const sample of channel)assert(Number.isFinite(sample)&&Math.abs(sample)<4,'Maximum-depth/resonance polyphony remains bounded before finishing');}
    assert.equal(engine.status().voices,0);
  }
});
