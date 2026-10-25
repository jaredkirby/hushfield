import assert from 'node:assert/strict';
import { TapeDelay } from '../dist/tape-dsp.mjs';
const rms=a=>Math.sqrt(a.reduce((sum,x)=>sum+x*x,0)/a.length);
function tape(rate,params){const t=new TapeDelay(rate);t.set(params);render(t,.7);return t;}
function render(t,seconds,signal=()=>0){const result=[[],[]];for(let frame=0;frame<Math.ceil(seconds*t.rate/128);frame++){const input=[new Float32Array(128),new Float32Array(128)],output=[new Float32Array(128),new Float32Array(128)];for(let i=0;i<128;i++)input[0][i]=input[1][i]=signal(frame*128+i);t.process(input,output);for(let c=0;c<2;c++)result[c].push(...output[c]);}return result;}
for(const rate of [44100,48000]){
 const t=tape(rate,{tapeOn:true,delayTime:.1,feedback:50,delayMix:50,drive:0,wow:0,flutter:0,hiss:0,tapeTone:100});const [out]=render(t,.51,i=>i===0?.5:0);const at=Math.round(rate*.1);
 assert(Math.abs(out[0])<1e-7,'Tape head has a short physical delay');assert(rms(out.slice(at,at+100))>.001,'First repeat arrives at chosen delay');assert(rms(out.slice(at*2,at*2+100))<rms(out.slice(at,at+100))*.8,'Repeated echoes decay');
 const silent=tape(rate,{tapeOn:true,hiss:100,feedback:80});assert.equal(rms(render(silent,.3)[0]),0,'Hiss cannot create an idle noise runaway');
 const extreme=tape(rate,{tapeOn:true,drive:100,feedback:80,delayMix:70,wow:100,flutter:100,hiss:100,delayTime:.05});const stress=render(extreme,6,i=>i<rate*2?Math.sin(i*2*Math.PI*110/rate)*2:0)[0];assert(stress.every(Number.isFinite));assert(Math.max(...stress.slice(0,50000).map(Math.abs))<2,'High drive / feedback output stays bounded');assert(rms(stress.slice(-rate))<rms(stress.slice(0,rate))*.05,'Feedback tail decays after input stops');
}
function repeatedTone(frequency,tapeTone){const rate=48000,t=tape(rate,{tapeOn:true,delayTime:.1,feedback:0,delayMix:70,drive:0,wow:0,flutter:0,hiss:0,tapeTone});return render(t,.22,i=>i<rate*.07?Math.sin(i*2*Math.PI*frequency/rate)*.2:0)[0].slice(5500,7500);}
const bassRatio=rms(repeatedTone(400,0))/rms(repeatedTone(400,100));const trebleRatio=rms(repeatedTone(10000,0))/rms(repeatedTone(10000,100));assert(trebleRatio<bassRatio*.45,'Tape repeats lose high frequency energy');
const rate=48000,clean=tape(rate,{tapeOn:false,delayMix:0}),driven=tape(rate,{tapeOn:true,drive:75,delayMix:0,hiss:0,wow:0,flutter:0,tapeTone:100});
const signal=i=>Math.sin(i*2*Math.PI*300/rate)*.8;
const a=render(clean,.2,signal)[0],b=render(driven,.2,signal)[0];
function harmonic(out,h){let real=0,imag=0;for(let i=0;i<9600;i++){real+=out[i]*Math.cos(i*2*Math.PI*300*h/rate);imag+=out[i]*Math.sin(i*2*Math.PI*300*h/rate);}return Math.hypot(real,imag)/9600;}
assert(harmonic(b,3)>harmonic(a,3)+.005,'Drive introduces soft saturation harmonics');
const moving=tape(rate,{tapeOn:true,delayTime:.1,delayMix:70,feedback:0,drive:0,wow:100,flutter:100,hiss:0});const still=tape(rate,{tapeOn:true,delayTime:.1,delayMix:70,feedback:0,drive:0,wow:0,flutter:0,hiss:0});const x=render(moving,1,signal)[0],y=render(still,1,signal)[0];assert(rms(x.map((v,i)=>v-y[i]))>.04,'Continuous head modulation alters the echo pitch / phase');
const ramp=tape(rate,{tapeOn:true,feedback:80});render(ramp,.3,signal);ramp.set({delayTime:1.5,drive:100,tapeOn:false});const changed=render(ramp,2,signal)[0];assert(changed.every(Number.isFinite));assert(Math.max(...changed.slice(0,50000).map(Math.abs))<2);
console.log('PASS: 44.1/48 kHz delay timing, feedback decay, idle silence, saturated bounded tails, treble loss, harmonics, continuous wow/flutter and parameter changes.');
