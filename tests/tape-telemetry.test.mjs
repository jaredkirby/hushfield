import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import { TapeDelay } from '../dist/tape-dsp.mjs';

test('processor visual telemetry is opt-in, decimated, audio-clocked, and read-only', () => {
  const messages = [];
  let Processor;
  const context = {TapeDelay, sampleRate: 48000, currentTime: 10,
    AudioWorkletProcessor: class { constructor() { this.port = {postMessage: m => messages.push(m)}; } },
    registerProcessor: (_, implementation) => { Processor = implementation; }};
  vm.runInNewContext(fs.readFileSync(new URL('../dist/tape-worklet.js', import.meta.url), 'utf8').replace(/^import .*\n/, ''), context);
  const p = new Processor({processorOptions: {params: {tapeOn: true, delayTime: .1, wow: 20}}});
  const reference = new TapeDelay(48000); reference.set({tapeOn: true, delayTime: .1, wow: 20});
  const input = [new Float32Array(128).fill(.1), new Float32Array(128).fill(.05)];
  const output = [new Float32Array(128), new Float32Array(128)];
  const expected = [new Float32Array(128), new Float32Array(128)];
  const render = () => {
    p.process([input], [output]); reference.process(input, expected);
    assert.deepEqual(output, expected, 'reporting cannot change the PCM output');
    context.currentTime += 128 / 48000;
  };
  for (let i=0;i<40;i++) render();
  assert.equal(messages.length, 1, 'only readiness before subscription');
  p.port.onmessage({data: {type: 'visuals', enabled: true}});
  for (let i=0;i<375;i++) render();
  const snapshots = messages.filter(m => m.type === 'tape-visuals');
  assert(snapshots.length >= 28 && snapshots.length <= 31);
  const last = snapshots.at(-1);
  assert(Math.abs(last.audioTime - last.phase - 10) < 1e-10);
  assert(last.outputRms > 0); assert(last.echoRms > 0);
  assert(last.params.wow > 0 && last.params.wow <= .2);
  assert.equal(last.waveform.length, 32);
  let sample = 0;
  for (let block = 0; block < 32; block++) {
    for (let i = 0; i < 128; i++, sample++) {
      input[0][i] = .15 * Math.sin(2 * Math.PI * 85 * sample / 48000);
      input[1][i] = -input[0][i];
    }
    render();
  }
  const wave = messages.at(-1).waveform;
  assert(Math.min(...wave) < -.01 && Math.max(...wave) > .01, 'signed audio detail survives opposite-phase stereo');
  const count = messages.length;
  p.port.onmessage({data: {type: 'visuals', enabled: false}});
  for (let i=0;i<40;i++) render();
  assert.equal(messages.length, count, 'hidden tabs stop telemetry');
});
