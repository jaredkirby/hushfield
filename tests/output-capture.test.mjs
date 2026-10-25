import test from 'node:test';
import assert from 'node:assert/strict';
import { createOutputCapture } from '../dist/output-capture.mjs';

test('finishing capture preserves all stereo PCM and blocks a replacement until acknowledgement', async () => {
  const commands = [], completed = [];
  const capture = createOutputCapture({send: message => commands.push(message), onComplete: wav => completed.push(wav)});
  capture.start(48000);
  const first = commands.at(-1).id;
  capture.receive({type:'chunk', id:first, left:new Float32Array([.5, -.5]), right:new Float32Array([-.25, .25])});
  capture.stop();
  assert.equal(capture.state, 'finishing');
  assert.equal(capture.start(48000), false);
  capture.receive({type:'chunk', id:first, left:new Float32Array([1]), right:new Float32Array([-1])});
  capture.receive({type:'done', id:first});
  assert.equal(capture.state, 'idle');
  const wav = new DataView(await completed[0].arrayBuffer());
  assert.equal(wav.getUint32(40,true), 12);
  assert.equal(wav.getInt16(44,true), 16383);
  assert.equal(wav.getInt16(46,true), -8192);
  assert.equal(wav.getInt16(52,true), 32767);
  assert.equal(wav.getInt16(54,true), -32768);
  capture.start(44100);
  capture.receive({type:'done',id:first});
  assert.equal(capture.state,'recording');
});

test('capture worklet stops at its frame limit and labels every message with the take', async () => {
  const {readFileSync} = await import('node:fs');
  const {runInNewContext} = await import('node:vm');
  let Processor;
  class Base { constructor() { this.messages=[]; this.port={postMessage: message => this.messages.push(message)}; } }
  runInNewContext(readFileSync(new URL('../dist/grain-worklet.js',import.meta.url),'utf8'),{AudioWorkletProcessor:Base,sampleRate:48000,Math,Float32Array,registerProcessor:(name,C)=>{if(name==='capture-engine')Processor=C;}});
  const recorder = new Processor();
  recorder.port.onmessage({data:{type:'start',id:7,maxFrames:3}});
  recorder.process([[new Float32Array([.1,.2,.3,.4]),new Float32Array([-.1,-.2,-.3,-.4])]]);
  assert.equal(recorder.messages.at(-1).type,'done');
  assert.equal(recorder.messages[0].id,7);
  assert.equal(recorder.messages[0].left.length,3);
});
