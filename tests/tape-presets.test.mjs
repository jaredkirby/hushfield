import test from 'node:test';
import assert from 'node:assert/strict';
import { TAPE_DEFAULTS, SPACE_ECHO_DEFAULTS } from '../dist/tape-settings.mjs';
import { TAPE_PRESETS, applyTapePreset, matchingTapePreset } from '../dist/tape-presets.mjs';
import { TapeDelay } from '../dist/tape-dsp.mjs';
import { decodeProject, serializeProject } from '../dist/project-file.mjs';
import { createControlHistory } from '../dist/control-history.mjs';

const defaults = { ...TAPE_DEFAULTS, ...SPACE_ECHO_DEFAULTS };
const ranges = Object.fromEntries(Object.keys(defaults).filter(key => key !== 'tapeOn').map(key => [key, key === 'delayTime' ? {min:.05,max:1.5,step:.01} : {min:0,max:100,step:1}]));
const buffer = { length:4, duration:4/48000, sampleRate:48000, numberOfChannels:1, getChannelData:()=>Float32Array.of(0,.1,-.1,0) };

test('Tape presets replace only sound settings and preserve bypass and the rest of the Piece', () => {
  assert.equal(matchingTapePreset(defaults)?.id, 'gentle', 'fresh settings have an honest starting label');
  for (const tapeOn of [true,false]) for (const preset of TAPE_PRESETS) {
    const original = { ...defaults, tapeModel:1, tapeOn, cutoff:9500, reverb:44, width:82, orbitSpin:-7 };
    const result = applyTapePreset(original,preset.id);
    assert.deepEqual(original,{...defaults,tapeModel:1,tapeOn,cutoff:9500,reverb:44,width:82,orbitSpin:-7},'selection does not mutate the current snapshot');
    assert.deepEqual(result,{...original,...preset.params});
    assert.equal(result.tapeOn,tapeOn);
    assert.equal(result.tapeModel,2,'choosing one explicitly selects Space Echo');
    assert.equal(matchingTapePreset(result)?.id,preset.id);
    assert.equal(matchingTapePreset({...result,drive:result.drive+1}),null,'a manual character change is Custom');
    assert.equal(matchingTapePreset({...result,feedback:result.feedback+1}),null,'a manual echo change is Custom');
  }
  assert.equal(matchingTapePreset({...defaults,tapeModel:1}),null,'old Classic is never silently labeled a Space Echo preset');
  assert.equal(applyTapePreset(defaults,'unknown'),defaults,'invalid selection makes no change');
});
test('preset selection is one undoable settings edit; custom and named labels follow restored values', () => {
  let state = {...defaults,drive:37,cutoff:8200};
  const original = {...state};
  const history = createControlHistory({capture:()=>state,restore:value=>state=value});
  history.begin('Tape preset');state=applyTapePreset(state,'dub');history.end();
  assert.equal(matchingTapePreset(state)?.id,'dub');
  assert(history.undo()); assert.deepEqual(state,original); assert.equal(matchingTapePreset(state),null);
  assert.equal(history.undo(),false,'one selection creates exactly one entry');
  assert(history.redo()); assert.equal(matchingTapePreset(state)?.id,'dub');
});
test('actual preset parameters survive project save/load without persisting a misleading preset ID', async () => {
  for (const preset of TAPE_PRESETS) {
    const params=applyTapePreset({...defaults,tapeOn:false},preset.id);
    const saved=serializeProject({name:preset.label,buffer,params,controls:{}});
    const restored=await decodeProject(saved,{defaults,ranges,controls:{},decodeAudio:async()=>buffer});
    for (const [key,value] of Object.entries(params)) assert.equal(restored.params[key],value,`${preset.id}: ${key} survives save/load`);
    assert.equal(matchingTapePreset(restored.params)?.id,preset.id);
    assert.equal(restored.params.tapeOn,false);
    assert.equal(Object.hasOwn(JSON.parse(saved).params,'tapePreset'),false);
  }
});
const rms = values => Math.sqrt(values.reduce((sum,x)=>sum+x*x,0)/values.length);
function render(preset) {
  const rate=48000,tape=new TapeDelay(rate),out=new Float32Array(rate*5);
  tape.set({...preset.params,tapeOn:true});
  const input=[new Float32Array(128),new Float32Array(128)],output=[new Float32Array(128),new Float32Array(128)];
  for(let block=0;block<Math.ceil(rate*6/128);block++){
    for(let i=0;i<128;i++){
      const frame=block*128+i-rate;
      const age=frame/rate;
      input[0][i]=input[1][i]=age>=0&&age<.06?(.12*Math.sin(2*Math.PI*330*age)+.06*Math.sin(2*Math.PI*1650*age))*Math.exp(-age*22):0;
    }
    tape.process(input,output);
    const at=block*128-rate;
    if(at>=0&&at<out.length)out.set(output[0].subarray(0,Math.min(128,out.length-at)),at);
  }
  return out;
}
test('the five presets produce distinct, bounded audio with decaying tails', () => {
  const renders=TAPE_PRESETS.map(render);
  for(let a=0;a<renders.length;a++){
    assert(renders[a].every(value=>Number.isFinite(value)&&Math.abs(value)<1));
    assert(rms(renders[a].slice(4800,48000))>.00001,'each preset has audible processed material');
    const first=rms(renders[a].slice(0,48000)),tail=rms(renders[a].slice(-24000));
    assert(tail<first*.3,`${TAPE_PRESETS[a].id} default tail decays by more than 10 dB after input stops: ${tail/first}`);
    for(let b=0;b<a;b++)assert(rms(renders[a].map((value,i)=>value-renders[b][i]))>.0004,`${TAPE_PRESETS[a].id} and ${TAPE_PRESETS[b].id} differ beyond a tiny PCM change`);
  }
});
