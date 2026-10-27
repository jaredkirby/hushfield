import assert from 'node:assert/strict';
import {test} from 'node:test';
import {FOUNDATION_WAVE_DEFAULTS,restoreFoundationWaves} from '../dist/foundation-wave-settings.mjs';
import {restoreVisual} from '../dist/visual-analysis.mjs';
import {drawAmbient} from '../dist/ambient-ui.mjs';
import {serializeProject,decodeProject} from '../dist/project-file.mjs';
import {drawFoundationStars} from '../dist/foundation-stars.mjs';

test('Foundation wave settings restore safely and survive a project export and load',async()=>{
  assert.deepEqual(restoreFoundationWaves(),FOUNDATION_WAVE_DEFAULTS);
  assert.deepEqual(restoreFoundationWaves({foundationLines:-9,foundationSpacing:999,foundationHeight:NaN,foundationFolds:Infinity,foundationStars:999,foundationTwinkle:-5}),
    {...FOUNDATION_WAVE_DEFAULTS,foundationLines:8,foundationSpacing:95,foundationStars:180,foundationTwinkle:0});
  const visual=restoreVisual({mode:'vector',foundationLines:17,foundationSpacing:90,foundationHeight:42,foundationFolds:19,foundationStars:80,foundationTwinkle:60});
  const buffer={numberOfChannels:1,sampleRate:48000,length:4,duration:4/48000,getChannelData:()=>new Float32Array(4)};
  const text=serializeProject({buffer,params:{},controls:{},visual});
  const project=await decodeProject(text,{decodeAudio:async()=>buffer,defaults:{},ranges:{},controls:{}});
  assert.deepEqual(project.visual,visual);
  const legacy=restoreVisual({mode:'scope'});
  for(const [key,value] of Object.entries(FOUNDATION_WAVE_DEFAULTS))assert.equal(legacy[key],value);
});

function paths(visual){
  const result=[];
  const c={clearRect(){},beginPath(){result.push([]);},moveTo(x,y){result.at(-1).push([x,y]);},lineTo(x,y){result.at(-1).push([x,y]);},stroke(){},fillRect(){}};
  drawAmbient({c,w:600,h:600},{evolution:45},{},0,0,[],visual);
  return result;
}
test('Wave count and spacing change without moving the top and bottom boundaries',()=>{
  const even=paths({...FOUNDATION_WAVE_DEFAULTS,foundationSpacing:0}),growing=paths(FOUNDATION_WAVE_DEFAULTS);
  assert.equal(growing.length,24);
  assert.equal(paths({...FOUNDATION_WAVE_DEFAULTS,foundationLines:12}).length,12);
  assert.deepEqual(growing[0],even[0]);assert.deepEqual(growing.at(-1),even.at(-1));
  const gaps=growing.slice(1).map((path,index)=>path[0][1]-growing[index][0][1]);
  assert(gaps.every((gap,index)=>gap>0&&(index===0||gap<gaps[index-1])),'Gaps decrease smoothly from top to bottom without crossing');
  const higher=paths({...FOUNDATION_WAVE_DEFAULTS,foundationHeight:50});
  assert(higher[0][0][1]<growing[0][0][1]);assert(higher.at(-1)[0][1]>growing.at(-1)[0][1]);
  assert.notDeepEqual(paths({...FOUNDATION_WAVE_DEFAULTS,foundationFolds:8}),growing);
});

function stars(patch={},time=0,reducedMotion=false){
  const result=[];
  const c={fillRect(x,y,w,h){result.push({x,y,w,h,color:this.fillStyle});}};
  drawFoundationStars({c,w:600,h:600},{...FOUNDATION_WAVE_DEFAULTS,...patch},time,reducedMotion);
  return result;
}
test('Star count is exact, zero clears the stars, and increasing it preserves positions',()=>{
  assert.equal(stars({foundationStars:0}).length,0);
  const few=stars({foundationStars:12}),many=stars({foundationStars:80});
  assert.equal(few.length,12);assert.equal(many.length,80);assert.deepEqual(many.slice(0,12),few);
  assert(many.every(star=>star.x>=0&&star.x<600&&star.y>=0&&star.y<180),'Stars remain in the sky above the wave band');
  assert(Math.min(...stars({foundationStars:180}).map(star=>star.y))<3,'The star field reaches the top edge without a blank margin');
});
test('Twinkle changes brightness smoothly without moving stars, and can stay still',()=>{
  const before=stars({},0),after=stars({},2),nearby=stars({},.01);
  const positions=frame=>frame.map(({x,y})=>[x,y]);
  assert.deepEqual(positions(before),positions(after));assert.notDeepEqual(before,after);
  const light=star=>+star.color.match(/\d+/)[0];
  assert(before.every((star,i)=>Math.abs(light(star)-light(nearby[i]))<=1),'Twinkle fades gently rather than flashing');
  assert.deepEqual(stars({foundationTwinkle:0},0),stars({foundationTwinkle:0},20));
  assert.deepEqual(stars({},0,true),stars({},20,true),'Reduced motion keeps the stars still');
});
