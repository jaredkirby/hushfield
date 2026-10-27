import { AMBIENT_POINTS, restorePoints, pointPitch } from './ambient-points.mjs?v=hushfield-1';
export const AMBIENT_KEYS=['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
export const AMBIENT_SCALES=['minor','major','pentatonic'];
export const AMBIENT_INTERVALS=[[0,2,3,5,7,8,10],[0,2,4,5,7,9,11],[0,2,4,7,9]];
export const AMBIENT_SCENES=[
 {name:'Stillwater',key:0,scale:0,change:48,activity:30,evolution:45,pads:70,melody:40,air:15,space:70,brightness:35,bell:.18},
 {name:'Night garden',key:2,scale:0,change:64,activity:20,evolution:30,pads:80,melody:25,air:20,space:65,brightness:16,bell:.08},
 {name:'Cloud choir',key:5,scale:1,change:80,activity:15,evolution:65,pads:85,melody:20,air:10,space:85,brightness:50,bell:.04},
 {name:'Glass horizon',key:9,scale:2,change:36,activity:55,evolution:55,pads:50,melody:65,air:10,space:80,brightness:62,bell:.6}
];
export const FOUNDATION_INSTRUMENTS=['current','solina','juno','buchla','sem','moog'];
export const AMBIENT_DEFAULTS={instrument:'current',enabled:true,scene:0,...AMBIENT_SCENES[0],compositionVersion:2,color:38,drift:22,bloom:45,grains:0,orbit:0,hold:false,seed:7201,points:AMBIENT_POINTS};
export const AMBIENT_FIELDS=[
 {id:'scene',label:'Scene',group:'compose',min:0,max:3,step:1,format:v=>AMBIENT_SCENES[v].name},
 {id:'key',label:'Key',group:'compose',min:0,max:11,step:1,format:v=>AMBIENT_KEYS[v]},
 {id:'scale',label:'Scale',group:'compose',min:0,max:2,step:1,format:v=>AMBIENT_SCALES[v]},
 {id:'change',label:'Chord length',group:'compose',min:20,max:180,step:4,format:v=>v+' s'},
 {id:'activity',label:'Activity',group:'compose',min:0,max:100,step:5},
 {id:'evolution',label:'Evolution',group:'compose',min:0,max:100,step:5},
 {id:'color',label:'Color',group:'sound',min:0,max:100,step:1},
 {id:'drift',label:'Drift',group:'sound',min:0,max:100,step:1},
 {id:'bloom',label:'Bloom',group:'sound',min:0,max:100,step:1},
 {id:'pads',label:'Chords',group:'layers',min:0,max:100,step:5},
 {id:'melody',label:'Melody',group:'layers',min:0,max:100,step:5},
 {id:'air',label:'Air',group:'layers',min:0,max:100,step:5},
 {id:'space',label:'Space',group:'layers',min:0,max:100,step:5},
 {id:'grains',label:'Sample layer',group:'layers',min:0,max:100,step:5},
 {id:'orbit',label:'ORBIT layer',group:'layers',min:0,max:100,step:5}
];
export function restoreAmbient(saved,legacy=false){const result={...AMBIENT_DEFAULTS,compositionVersion:legacy?1:2,enabled:!legacy,points:restorePoints(saved?.points)};if(!saved||typeof saved!=='object')return result;result.instrument=FOUNDATION_INSTRUMENTS.includes(saved.instrument)?saved.instrument:'current';result.compositionVersion=!legacy&&saved.compositionVersion===2?2:1;if(Number.isFinite(saved.scene)){const scene=Math.max(0,Math.min(3,Math.round(saved.scene)));Object.assign(result,AMBIENT_SCENES[scene],{scene});}for(const f of AMBIENT_FIELDS){if(Number.isFinite(saved[f.id]))result[f.id]=Math.max(f.min,Math.min(f.max,f.min+Math.round((saved[f.id]-f.min)/f.step)*f.step));}for(const key of ['enabled','hold'])if(typeof saved[key]==='boolean')result[key]=saved[key];if(Number.isInteger(saved.seed))result.seed=saved.seed>>>0;return result;}
export function applyAmbientScene(state,index){Object.assign(state,AMBIENT_SCENES[index],{scene:index});return state;}
export function scaleMidi(settings,degree,base=36){const scale=AMBIENT_INTERVALS[settings.scale]||AMBIENT_INTERVALS[0],octave=Math.floor(degree/scale.length),index=((degree%scale.length)+scale.length)%scale.length;return base+settings.key+scale[index]+12*octave;}
export function ambientVoiceMidi(settings,degree,index){const offset=settings.points?pointPitch(settings.points[index]||AMBIENT_POINTS[index],index):0;return scaleMidi(settings,degree+[0,2,4,6][index]+offset,index===0?36:48);}
export function ambientChord(settings,degree){return [0,1,2,3].map(index=>ambientVoiceMidi(settings,degree,index));}
export function ambientChordName(settings,degree){const chord=ambientChord({...settings,points:undefined},degree),root=chord[0]%12,third=(chord[1]-chord[0])%12,seventh=(chord[3]-chord[0])%12;return AMBIENT_KEYS[root]+(third===3?'m':'')+(seventh===11?'maj7':seventh===10?'7':' add');}
