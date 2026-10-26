import { pointPan } from './ambient-points.mjs?v=hushfield-1';
import { AMBIENT_DEFAULTS, AMBIENT_SCENES, ambientChord, ambientVoiceMidi, ambientChordName, scaleMidi, restoreAmbient } from './ambient-settings.mjs?v=hushfield-1';
const table=new Float32Array(2048);for(let i=0;i<table.length;i++)table[i]=Math.sin(i*Math.PI*2/table.length);
const sin=phase=>{const at=((phase%1)+1)%1*2048,index=at|0,f=at-index;return table[index]*(1-f)+table[(index+1)%2048]*f;};
const hz=midi=>440*2**((midi-69)/12);
function voiceMotion(seed,index){let hash=Math.imul((seed>>>0)^(index+1),0x45d9f3b);hash=Math.imul(hash^(hash>>>16),0x45d9f3b);const unit=(hash>>>0)/4294967296;return {motionPhase:unit,motionRate:.012+unit*.019};}
const smoothKeys=['pads','melody','air','evolution','color','drift','bloom'];
function nearbyChord(chord,previous){
 if(!previous.length)return chord;
 const candidates=chord.map(note=>[-24,-12,0,12,24].map(octave=>note+octave).filter(note=>note>=36&&note<=84));
 let best=chord,score=Infinity;
 for(const a of candidates[0])for(const b of candidates[1])for(const c of candidates[2])for(const d of candidates[3]){
  if(a>=b||b>=c||c>=d)continue;
  const notes=[a,b,c,d],cost=notes.reduce((sum,note,index)=>sum+Math.abs(note-previous[index])+.05*Math.abs(note-chord[index]),0);
  if(cost<score){score=cost;best=notes;}
 }
 return best;
}
// Precompute cumulative harmonic tables once, outside the real-time render path.
// At most one of our eight partials lies in the .41–.46 sample-rate transition.
const harmonicTables=[new Float32Array(2048),new Float32Array(2048)],harmonicEnergy=new Float64Array(9),partialWeight=new Float64Array(9);
for(let partial=2;partial<=8;partial++){
 const weight=.85/partial**.85,values=new Float32Array(2048);partialWeight[partial]=weight;harmonicEnergy[partial]=harmonicEnergy[partial-1]+weight*weight;
 for(let i=0;i<values.length;i++)values[i]=harmonicTables[partial-1][i]+Math.sin(i*Math.PI*2/values.length*partial)*weight;
 harmonicTables.push(values);
}
function lookup(values,phase){const at=phase*2048,index=at|0,f=at-index;return values[index]*(1-f)+values[(index+1)%2048]*f;}
function harmonicVoice(phase,frequency,rate,color){
 if(frequency>=rate*.46)return 0;
 const full=Math.min(8,Math.max(1,Math.floor(rate*.41/frequency))),next=full+1;
 let upper=lookup(harmonicTables[full],phase),energy=harmonicEnergy[full];
 if(next<=8){const edge=Math.max(0,Math.min(1,(.46-frequency*next/rate)/.05)),weight=partialWeight[next]*edge;upper+=sin(phase*next)*weight;energy+=weight*weight;}
 const fundamental=lookup(table,phase)*Math.min(1,(.46-frequency/rate)/.05);
 return (fundamental+color*upper)/Math.sqrt(1+color*color*energy);
}
export class AmbientEngine {
 constructor(rate){this.rate=rate;this.settings={...AMBIENT_DEFAULTS};this.p={pads:0,melody:0,air:0,evolution:45,color:38,drift:22,bloom:45};this.playing=false;this.level=0;this.clock=0;this.chordClock=0;this.degree=0;this.index=0;this.notes=[];this.pads=[];this.previous=[];this.crossfade=1;this.noiseLow=0;this.noiseSlow=0;this.leftLow=0;this.rightLow=0;this.lastNote=0;this.elapsed=0;this.setSeed(this.settings.seed);this.updateChord();}
 random(){this.randomState=(Math.imul(this.randomState,1664525)+1013904223)>>>0;return this.randomState/4294967296;}
 setSeed(seed){this.motifStep=0;this.melodyEvents=[];this.randomState=(seed>>>0)||1;this.noteSeed=this.randomState^0x9e3779b9;}
 set(values){const old=this.settings,next=restoreAmbient({...old,...values});this.settings=next;if(old.seed!==next.seed){this.setSeed(next.seed);this.index=0;this.elapsed=0;this.chordClock=0;this.degree=0;for(const note of this.notes)note.duration=Math.min(note.duration,note.age+.7);this.updateChord();this.untilNote=.5;}else if(old.key!==next.key||old.scale!==next.scale||old.compositionVersion!==next.compositionVersion)this.updateChord();else this.retunePoints();}
 updateChord(){const chord=ambientChord(this.settings,this.degree),voicing=this.settings.compositionVersion===2?nearbyChord(chord,this.pads.map(voice=>voice.midi)):chord;this.previous=[...this.previous.map(v=>({...v,weight:(v.weight??1)*(1-this.crossfade)})),...this.pads.map(v=>({...v,weight:this.crossfade}))].filter(v=>v.weight>.005).sort((a,b)=>b.weight-a.weight).slice(0,12);this.pads=voicing.map((midi,i)=>({midi,octaveOffset:midi-chord[i],index:i,degree:this.degree,...voiceMotion(this.settings.seed,i),frequency:hz(midi),targetFrequency:hz(midi),pan:pointPan(this.settings.points[i]),phase:this.previous[i]?.phase||0,phase2:this.previous[i]?.phase2||.2+i*.1}));this.crossfade=this.previous.length?0:1;this.chordName=ambientChordName(this.settings,this.degree);}
 retunePoints(){for(const voice of [...this.pads,...this.previous]){voice.midi=ambientVoiceMidi(this.settings,voice.degree,voice.index)+(voice.octaveOffset||0);voice.targetFrequency=hz(voice.midi);}}
 play(value){this.playing=Boolean(value);if(value&&this.untilNote===undefined)this.untilNote=.65;}
 nextChord(){const roots=this.settings.scale===2?[0,3,1,4,0,2,3,1]:[0,5,3,4,0,3,1,4];this.index++;const chosen=this.settings.evolution>65&&this.random()<.3?Math.floor(this.random()*roots.length):this.index%roots.length;this.degree=roots[chosen];this.updateChord();this.chordClock=0;}
 spawn(){if(this.settings.compositionVersion===2)return this.spawnMotif();if(this.notes.length>=8)return;const degree=this.degree+[0,2,4,6,8,9][Math.floor(this.random()*6)],midi=scaleMidi(this.settings,degree,60);const scene=AMBIENT_SCENES[this.settings.scene];this.notes.push({midi,frequency:hz(midi),phase:0,phase2:0,age:0,duration:5+this.random()*7,pan:this.random()*1.4-.7,bell:scene.bell,velocity:.65+this.random()*.35});this.lastNote=midi;}
 spawnMotif(){
  const settings=this.settings,step=this.motifStep%8,cycle=Math.floor(this.motifStep/8),patterns=[[0,2,4,null,2,1,null,3],[2,4,3,null,0,2,null,1],[0,3,2,null,4,2,null,1]],pattern=patterns[(settings.seed>>>0)%patterns.length];
  const degree=pattern[step]===null?null:pattern[step]+(step===7?[0,1,-1,0][cycle%4]:0),rest=degree===null,midi=rest?null:scaleMidi(settings,this.degree+degree,60),beat=1.6+(100-settings.activity)*.12;
  this.melodyEvents.push({step,cycle,degree,midi,rest,time:this.elapsed});if(this.melodyEvents.length>64)this.melodyEvents.shift();this.motifStep++;
  this.nextMotifDuration=beat*(rest?2:[1,1,1.5,1,1.25,1,1,1.5][step]);
  if(rest){for(const note of this.notes)note.duration=Math.min(note.duration,note.age+.6);return;}
  if(this.notes.length>=8)return;
  this.notes.push({midi,frequency:hz(midi),phase:0,phase2:0,age:0,duration:Math.min(7,beat*.8),pan:this.random()*1.4-.7,bell:AMBIENT_SCENES[settings.scene].bell,velocity:.65+this.random()*.35});this.lastNote=midi;
 }
 phrase(){
  const elapsed=this.elapsed,phase=(elapsed%120)/120;
  if(this.settings.compositionVersion!==2)return {phase,elapsed,foundation:1,texture:1,motion:1,textureDensity:1,motionDensity:1};
  const tide=(1-Math.cos(phase*Math.PI*2))/2,depth=this.settings.evolution/100;
  return {phase,elapsed,foundation:1-depth*.06*tide,texture:1-depth*.35*(1-tide),motion:1-depth*.35*tide,textureDensity:1-depth*.6*(1-tide),motionDensity:1-depth*.65*tide};
 }
 status(){return {melodyEvents:this.melodyEvents.map(event=>({...event})),phrase:this.phrase(),elapsed:this.elapsed,chord:this.chordName,chordNotes:this.pads.map(p=>p.midi),next:this.settings.hold?null:Math.max(0,this.settings.change-this.chordClock),notes:this.notes.length,lastNote:this.lastNote,section:this.index+1,degree:this.degree,voicePans:this.pads.map(p=>p.pan),motionTime:this.clock};}
 process(output){const rate=this.rate,p=this.p,settings=this.settings,slew=1-Math.exp(-1/(rate*1.2)),levelSlew=1-Math.exp(-1/(rate*(this.playing?1.2:.12)));const scene=AMBIENT_SCENES[settings.scene],brightness=scene.brightness/100,pitchSlew=1-Math.exp(-1/(rate*.045)),panSlew=1-Math.exp(-1/(rate*.08));
 for(let i=0;i<output[0].length;i++){
  this.level+=(Number(this.playing)-this.level)*levelSlew;if(!this.playing&&this.level<.000001){output[0][i]=output[1][i]=0;continue;}
  for(const key of smoothKeys)p[key]+=(settings[key]-p[key])*slew;
  if(this.playing){this.elapsed+=1/rate;this.chordClock+=1/rate;if(!settings.hold&&this.chordClock>=settings.change)this.nextChord();this.untilNote-=1/rate;if(this.untilNote<=0){if(settings.activity>0)this.spawn();this.untilNote=settings.activity>0?(settings.compositionVersion===2?this.nextMotifDuration:(1.6+(100-settings.activity)*.12)*(.6+this.random()*.9)):1;}}
  this.crossfade=Math.min(1,this.crossfade+1/(rate*8));let l=0,r=0;
  for(let bank=0;bank<2;bank++){const voices=bank?this.previous:this.pads,gain=bank?1-this.crossfade:this.crossfade;if(gain<=0)continue;for(let j=0;j<voices.length;j++){const voice=voices[j];voice.frequency+=(voice.targetFrequency-voice.frequency)*pitchSlew;voice.pan+=(pointPan(settings.points[voice.index])-voice.pan)*panSlew;const motion=settings.compositionVersion===2?sin(this.clock*voice.motionRate+voice.motionPhase)*p.drift/100:sin(this.clock*.027+j*.17)*p.evolution/100,detune=1+motion*(settings.compositionVersion===2?.0028:.0018);voice.phase=(voice.phase+voice.frequency/rate*detune)%1;voice.phase2=(voice.phase2+voice.frequency/rate/detune*1.0008)%1;const color=Math.max(0,Math.min(1,p.color/100+sin(this.clock*voice.motionRate*.37+voice.motionPhase)*p.bloom/100*.32*p.evolution/100)),breath=.76+.24*sin(this.clock*.019+j*.23),v=(settings.compositionVersion===2?harmonicVoice(voice.phase,voice.frequency*detune,rate,color)+harmonicVoice(voice.phase2,voice.frequency/detune*1.0008,rate,color)*.55:sin(voice.phase)+sin(voice.phase2)*.55+sin(voice.phase*2)*brightness*.13)*.028*breath*p.pads/100*gain*(voice.weight??1);l+=v*Math.sqrt((1-voice.pan)/2)*1.2;r+=v*Math.sqrt((1+voice.pan)/2)*1.2;}}
  for(let n=this.notes.length-1;n>=0;n--){const note=this.notes[n];note.age+=1/rate;if(note.age>=note.duration){this.notes.splice(n,1);continue;}note.phase=(note.phase+note.frequency/rate)%1;note.phase2=(note.phase2+note.frequency*2.001/rate)%1;const attack=Math.min(1,note.age/(note.bell>.3?.08:.5)),envelope=attack*Math.exp(-note.age/(1.7+note.bell))*Math.min(1,(note.duration-note.age)/.7);const v=(sin(note.phase+sin(note.phase*2)*note.bell*.18)+sin(note.phase2)*note.bell*.25)*envelope*note.velocity*.055*p.melody/100;l+=v*Math.sqrt((1-note.pan)/2);r+=v*Math.sqrt((1+note.pan)/2);}
  this.noteSeed=(Math.imul(this.noteSeed,1664525)+1013904223)>>>0;const noise=this.noteSeed/2147483648-1;this.noiseLow+=.035*(noise-this.noiseLow);this.noiseSlow+=.002*(noise-this.noiseSlow);const air=(this.noiseLow-this.noiseSlow)*p.air/100*.045*(.65+.35*sin(this.clock*.037));l+=air;r+=air*.7;
  const alpha=.16+brightness*.45;this.leftLow+=alpha*(l-this.leftLow);this.rightLow+=alpha*(r-this.rightLow);output[0][i]=this.leftLow*this.level*1.8;output[1][i]=this.rightLow*this.level*1.8;if(this.playing)this.clock+=1/rate;
 }
 }
}
