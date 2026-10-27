import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import { TapeDelay } from '../dist/tape-dsp.mjs';
import { TapeDelay as FrozenTape } from './fixtures/tape-models-v1/tape-dsp.mjs';
import { TAPE_PRESETS } from '../dist/tape-presets.mjs';
import { SPACE_ECHO_MODES } from '../dist/tape-settings.mjs';
import { tapeVisualState, tapeHeadOffset } from '../dist/tape-visual-state.mjs';

for (const rate of [44100, 48000]) test(`${rate} Hz telemetry preserves both models through presets, modes, bypass and reversals`, () => {
  let Processor, latest, frames = 0, leftHz = 110, rightHz = 173;
  const context = {TapeDelay, sampleRate:rate, currentTime:0,
    AudioWorkletProcessor: class { constructor() { this.port = {postMessage: message => {if(message.type === 'tape-visuals') latest = message;}}; } },
    registerProcessor: (_, value) => {Processor = value;}};
  vm.runInNewContext(fs.readFileSync(new URL('../dist/tape-worklet.js', import.meta.url), 'utf8').replace(/^import .*\n/, ''), context);
  const processor = new Processor(), reference = new FrozenTape(rate);
  const input = [new Float32Array(128), new Float32Array(128)];
  const output = [new Float32Array(128), new Float32Array(128)];
  const expected = [new Float32Array(128), new Float32Array(128)];
  const set = values => {processor.port.onmessage({data:values}); reference.set(values);};
  const run = seconds => {
    for(let block = 0; block < Math.ceil(seconds * rate / 128); block++) {
      for(let i = 0; i < 128; i++) {
        input[0][i] = .12 * Math.sin(2 * Math.PI * leftHz * (frames + i) / rate);
        input[1][i] = -.08 * Math.sin(2 * Math.PI * rightHz * (frames + i) / rate);
      }
      processor.process([input], [output]); reference.process(input, expected);
      assert.deepEqual(output, expected, 'telemetry must not change any audio sample');
      frames += 128; context.currentTime = frames / rate;
    }
    assert.equal(latest.phase, latest.processorFrames / rate);
    assert(Math.abs(latest.audioTime - latest.phase) < 1e-10);
    for(const value of [latest.phase, latest.speed, latest.echoRms, latest.springRms, ...Object.values(latest.params), ...latest.headWeights, ...latest.headRms, ...latest.waveform]) assert(Number.isFinite(value));
  };
  processor.port.onmessage({data:{type:'visuals',enabled:true}});
  for(const preset of TAPE_PRESETS) {
    set({...preset.params, tapeOn:true}); run(.8);
    assert(latest.modelBlend > .999);
    const heads = SPACE_ECHO_MODES[preset.params.echoMode - 1].heads;
    latest.headWeights.forEach((weight, i) => assert(Math.abs(weight - Number(heads.includes(i + 1))) < 1e-7));
  }
  assert(latest.echoRms < 1e-7 && latest.springRms > 1e-6, 'spring-only activity is separate from tape returns');
  for(const mode of SPACE_ECHO_MODES) {
    set({echoMode:mode.value, delayMix:40}); run(.7);
    latest.headWeights.forEach((weight, i) => assert(Math.abs(weight - Number(mode.heads.includes(i + 1))) < 1e-7));
  }
  leftHz = rightHz = 100;
  set({echoMode:11, delayTime:.3, wow:0, flutter:0, drive:0, feedback:0, hiss:0, springMix:0}); run(1.5);
  const headSum = latest.headRms.reduce((sum, value) => sum + value, 0);
  assert(Math.abs(headSum / latest.echoRms - 1) < .01, 'phase-aligned heads include audible head-count compensation');
  set({tapeOn:false}); run(.8);
  assert(latest.echoRms < 1e-7 && latest.springRms < 1e-7);
  set({tapeModel:1, tapeOn:true}); run(.8);
  assert(latest.modelBlend === 0);
  assert.deepEqual(Array.from(latest.headWeights), [0,1,0]);
  for(const model of [2,1,2,1,2]) {set({tapeModel:model}); run(.035);}
  run(.8);
  set({delayTime:.36, wow:0, flutter:0}); run(1.5);
  set({delayTime:1.5}); run(.1);
  assert(latest.speed > .45 && latest.speed < 1, 'motor glide does not jump straight to the target speed');
  const machine = processor.tape.spaceEcho, before = machine.travel;
  processor.process([input], [output]);
  assert(Math.abs(processor.tape.visualState().speed - (machine.travel - before) * rate / 128 * .12) < 1e-10);
});

test('a transient between reporting blocks is included in the visual RMS interval', () => {
  let Processor;
  const reports = [], rate = 48000;
  const context = {TapeDelay, sampleRate:rate, currentTime:0,
    AudioWorkletProcessor: class {constructor(){this.port={postMessage:value=>{if(value.type==='tape-visuals')reports.push(value);}};}},
    registerProcessor:(_,value)=>{Processor=value;}};
  vm.runInNewContext(fs.readFileSync(new URL('../dist/tape-worklet.js',import.meta.url),'utf8').replace(/^import .*\n/,''),context);
  const processor = new Processor({processorOptions:{params:{tapeModel:1,tapeOn:true,delayMix:0,drive:0,wow:0,flutter:0,hiss:0,tapeTone:100}}});
  const input=[new Float32Array(128),new Float32Array(128)],output=[new Float32Array(128),new Float32Array(128)];
  const render=()=>{processor.process([input],[output]);context.currentTime+=128/rate;};
  for(let i=0;i<300;i++)render();
  processor.port.onmessage({data:{type:'visuals',enabled:true}});render();
  let energy=0;
  for(let block=1;block<=13;block++) {
    input[0].fill(0);input[1].fill(0);
    if(block===2)input[0][0]=input[1][0]=.5;
    render();
    for(let i=0;i<128;i++)energy+=(output[0][i]**2+output[1][i]**2)/2;
  }
  assert.equal(reports.length,2);
  assert(reports[1].outputRms>.001,'brief audio is not lost between snapshots');
  assert(Math.abs(reports[1].outputRms-Math.sqrt(energy/(13*128)))<1e-12);
  processor.port.onmessage({data:{type:'visuals',enabled:false}});
  for(let i=0;i<30;i++)render();
  processor.port.onmessage({data:{type:'visuals',enabled:true}});render();
  assert(reports.at(-1).outputRms<1e-10,'resubscribe cannot replay stale energy');
});

test('invalid telemetry falls back honestly and model modulation respects bypass', () => {
  const params = {...TAPE_PRESETS[0].params, tapeOn:true};
  const invalid = tapeVisualState(params, {phase:1,audioTime:1,params:{}}, 1, 2);
  assert.equal(invalid.live, false);
  assert.equal(invalid.seconds, 2);
  assert(Number.isFinite(tapeHeadOffset(297, invalid)));
  const snapshot = {phase:2,audioTime:2,params:{on:1,delayTime:.36,wow:.2,flutter:.1,drive:.2,hiss:0,tone:.5},
    modulation:[{weight:.5,phase:1,wow:.2,flutter:.1,on:1},{weight:.5,phase:.1,wow:.2,flutter:.1,on:1}], outputRms:.1, echoRms:.02};
  const off = tapeVisualState({...params,tapeOn:false}, snapshot, 2);
  assert.equal(Math.abs(tapeHeadOffset(297, off)), 0);
});
