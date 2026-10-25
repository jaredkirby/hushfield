import test from 'node:test';
import assert from 'node:assert/strict';
import {TapeDelay} from '../dist/tape-dsp.mjs';
import {TAPE_DEFAULTS} from '../dist/tape-settings.mjs';

function render(tape,seconds,signal=()=>0){
  const samples=[];
  for(let frame=0;frame<Math.ceil(seconds*48000/128);frame++){
    const input=[new Float32Array(128),new Float32Array(128)],output=[new Float32Array(128),new Float32Array(128)];
    for(let i=0;i<128;i++)input[0][i]=input[1][i]=signal(frame*128+i);
    tape.process(input,output);samples.push(...output[0]);
  }
  return samples;
}
test('Tape Off bypasses echo and coloration even with all effect controls raised',()=>{
  const tape=new TapeDelay(48000);tape.set({tapeOn:false,delayMix:70,feedback:80,drive:100,wow:100,flutter:100,hiss:100});
  render(tape,1);
  const out=render(tape,1,i=>i===0?.5:0);
  assert.equal(out[0],.375);
  assert.equal(out.slice(1).some(v=>v!==0),false,'Off has no repeats or added noise');
});

const rms=a=>Math.sqrt(a.reduce((sum,value)=>sum+value*value,0)/a.length);
function steady(params,signal){const tape=new TapeDelay(48000);tape.set(params);render(tape,1);return render(tape,2,signal);}
function frequencyVariation(values){const crossings=[];for(let i=1;i<values.length;i++)if(values[i-1]<=0&&values[i]>0)crossings.push(i-1-values[i-1]/(values[i]-values[i-1]));const periods=crossings.slice(1).map((at,i)=>at-crossings[i]),mean=periods.reduce((a,b)=>a+b,0)/periods.length;return rms(periods.map(p=>p/mean-1));}
test('wow and flutter move the direct sound even with echo turned down to zero',()=>{
  const signal=i=>Math.sin(i*2*Math.PI*220/48000)*.08;
  const still=steady({tapeOn:true,delayMix:0,wow:0,flutter:0,drive:0,hiss:0},signal);
  const moving=steady({tapeOn:true,delayMix:0,wow:60,flutter:35,drive:0,hiss:0},signal);
  assert.ok(frequencyVariation(moving.slice(12000))>.003,'direct pitch variation exceeds 0.3 percent');
  assert.ok(frequencyVariation(still.slice(12000))<.00001,'without wow/flutter the pitch stays steady');
});

function harmonic(values,multiple){let real=0,imag=0;for(let i=0;i<values.length;i++){const angle=i*2*Math.PI*300*multiple/48000;real+=values[i]*Math.cos(angle);imag+=values[i]*Math.sin(angle);}return Math.hypot(real,imag)/values.length;}
test('normal quiet input gains clear saturation without relying on a volume jump',()=>{
  const signal=i=>Math.sin(i*2*Math.PI*300/48000)*.08;
  const clean=steady({tapeOn:false,delayMix:0},signal).slice(48000,96000);
  const warm=steady({tapeOn:true,drive:55,wow:0,flutter:0,hiss:0,tapeTone:100,delayMix:0},signal).slice(48000,96000);
  assert.ok(harmonic(warm,3)/harmonic(warm,1)>.02,'at least two percent third harmonic at ordinary Foundation levels');
  const levelDb=20*Math.log10(rms(warm)/rms(clean));
  assert.ok(levelDb>-4&&levelDb<2,`approximately matched listening level (${levelDb.toFixed(2)} dB)`);
});

test('the vintage default adds mild warmth with restrained pitch drift',()=>{
  const signal=i=>Math.sin(i*2*Math.PI*300/48000)*.08;
  const warm=steady({...TAPE_DEFAULTS,tapeOn:true,wow:0,flutter:0,hiss:0,delayMix:0,tapeTone:100},signal).slice(48000,96000);
  const harmonicRatio=harmonic(warm,3)/harmonic(warm,1);
  assert.ok(harmonicRatio>.005&&harmonicRatio<.025,`gentle third harmonic between 0.5 and 2.5 percent (${harmonicRatio})`);
  const pitchSignal=i=>Math.sin(i*2*Math.PI*220/48000)*.08;
  const vintage=steady({...TAPE_DEFAULTS,tapeOn:true,drive:0,hiss:0,delayMix:0},pitchSignal).slice(12000);
  const worn=steady({tapeOn:true,wow:45,flutter:25,drive:0,hiss:0,delayMix:0},pitchSignal).slice(12000);
  const variation=frequencyVariation(vintage);
  assert.ok(variation>.0002&&variation<frequencyVariation(worn)*.4,'subtle drift remains, below forty percent of the previous default');
});
