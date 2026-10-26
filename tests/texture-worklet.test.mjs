import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

function processor() {
  let Grain;
  class Base { constructor(){ this.messages=[]; this.port={postMessage:m=>this.messages.push(m)}; } }
  vm.runInNewContext(fs.readFileSync(new URL('../dist/grain-worklet.js',import.meta.url),'utf8'),{
    AudioWorkletProcessor:Base,sampleRate:8000,Math,Float32Array,registerProcessor:(name,C)=>{if(name==='grain-engine')Grain=C;}
  });
  const engine=new Grain(), send=data=>engine.port.onmessage({data});
  return {engine,send};
}

test('Texture reshapes incoming Foundation audio and captures only its bounded recent stereo phrase',()=>{
  const {engine,send}=processor();
  const phrasePort={onmessage:null};
  send({type:'phrasePort',port:phrasePort});
  phrasePort.onmessage({data:{phrase:{textureDensity:.6}}});
  send({type:'source',mode:'foundation'});
  send({type:'params',params:{size:80,density:20,position:.5,spray:0,scanOn:false,width:0}});
  send({type:'play',value:true});
  let energy=0;
  for(let block=0;block<400;block++) {
    const input=[new Float32Array(128),new Float32Array(128)];
    // Keep the sparse overview samples away from this sine's zero crossings.
    for(let i=0;i<128;i++){input[0][i]=Math.sin((block*128+i)*2*Math.PI*220/8000+.37)*.4;input[1][i]=-input[0][i];}
    const out=[[new Float32Array(128),new Float32Array(128)]];
    engine.process([input],out);
    if(block>250)energy+=out[0][0].reduce((sum,v)=>sum+v*v,0);
  }
  assert.ok(energy>10,'live material must produce audible Texture without loading a sample');
  const telemetry=engine.messages.filter(m=>m.wave).at(-1);
  assert.ok(Math.abs(telemetry.phraseDensity-.6)<.001,'the same stereo overview message retains audio-clock phrase density');
  assert.equal(telemetry.wave.length,160);assert.equal(telemetry.waveRight.length,160);
  assert(telemetry.wave.some(v=>Math.abs(v)>.1));
  assert(telemetry.wave.every((v,i)=>Math.abs(v+telemetry.waveRight[i])<1e-6),'source scope retains the actual stereo channels');
  send({type:'freeze',id:7});
  const phrase=engine.messages.find(m=>m.type==='phrase');
  assert.ok(phrase,'freeze returns a portable phrase');
  assert.equal(phrase.id,7); assert.equal(phrase.channels[0].length,32000);
  assert.ok(Math.abs(phrase.channels[0][0]-.4*Math.sin(19200*2*Math.PI*220/8000+.37))<1e-5);
  assert.ok(Math.abs(phrase.channels[0][100]+phrase.channels[1][100])<1e-6);
  send({type:'play',value:false});
  const stopped=[[new Float32Array(128),new Float32Array(128)]];engine.process([],stopped);
  assert.equal(stopped[0][0].some(v=>v!==0),false);
});
