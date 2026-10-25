export const SOUND_FIELDS = [
  {id:'wave',label:'Waveform',group:'voice',choices:['sine','triangle','sawtooth','square','noise'],default:'triangle'},
  {id:'key',label:'Key',group:'voice',choices:['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],default:'C'},
  {id:'scale',label:'Scale',group:'voice',choices:['minor','major','pentatonic','chromatic'],default:'minor'},
  {id:'octave',label:'Octave',group:'voice',min:-2,max:2,step:1,default:0},
  {id:'transpose',label:'Pitch',group:'voice',min:-24,max:24,step:1,unit:' st',default:0},
  {id:'level',label:'Level',group:'voice',min:0,max:100,step:5,unit:'%',default:35},
  {id:'attack',label:'Attack',group:'envelope',min:.002,max:2,step:.01,unit:' s',default:.01},
  {id:'decay',label:'Decay',group:'envelope',min:.01,max:3,step:.05,unit:' s',default:.18},
  {id:'sustain',label:'Sustain',group:'envelope',min:0,max:100,step:5,unit:'%',default:20},
  {id:'gate',label:'Hold',group:'envelope',min:.01,max:2,step:.05,unit:' s',default:.1},
  {id:'release',label:'Release',group:'envelope',min:.02,max:5,step:.1,unit:' s',default:1.5},
  {id:'cutoff',label:'Cutoff',group:'tone',min:80,max:20000,step:100,unit:' Hz',default:14000},
  {id:'resonance',label:'Resonance',group:'tone',min:.1,max:12,step:.2,unit:' Q',default:.6},
  {id:'fmRatio',label:'FM ratio',group:'tone',min:.25,max:8,step:.25,default:2.75},
  {id:'fmAmount',label:'FM depth',group:'tone',min:0,max:200,step:5,unit:'%',default:10},
  {id:'drive',label:'Drive',group:'tone',min:0,max:100,step:5,unit:'%',default:0},
  {id:'pan',label:'Pan',group:'tone',min:-100,max:100,step:5,default:0},
  {id:'delaySend',label:'Delay send',group:'space',min:0,max:100,step:5,unit:'%',default:12},
  {id:'reverbSend',label:'Reverb send',group:'space',min:0,max:100,step:5,unit:'%',default:45},
  {id:'delayTime',label:'Bank delay',group:'space',bankOnly:true,min:.05,max:1.5,step:.05,unit:' s',default:.3},
  {id:'feedback',label:'Bank feedback',group:'space',bankOnly:true,min:0,max:75,step:5,unit:'%',default:25},
  {id:'reverbTime',label:'Bank room',group:'space',bankOnly:true,min:.2,max:4,step:.2,unit:' s',default:2.2}
];
export const FIELD_MAP = Object.fromEntries(SOUND_FIELDS.map(f=>[f.id,f]));
export const SOUND_GROUPS = [['voice','Voice'],['envelope','Envelope'],['tone','Tone'],['space','Space']];
const voiceDefaults = Object.fromEntries(SOUND_FIELDS.filter(f=>!f.bankOnly).map(f=>[f.id,f.default]));
const effectDefaults = Object.fromEntries(SOUND_FIELDS.filter(f=>f.bankOnly).map(f=>[f.id,f.default]));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function createSoundState(){
  return {
    triggers:{base:{...voiceDefaults,enabled:true},effects:{...effectDefaults},items:{}},
    balls:{base:{...voiceDefaults,wave:'sine',level:28,decay:.08,sustain:15,release:.9,fmAmount:0,enabled:true},effects:{...effectDefaults,delayTime:.42,reverbTime:1.6},items:{}}
  };
}
export function patchFor(state,bank,index='all'){
  const b=state[bank];return {...b.base,...(index==='all'?{}:b.items[index]),...b.effects};
}
export function editSound(state,bank,index,field,value){
  const b=state[bank],definition=FIELD_MAP[field];
  if(definition?.bankOnly){b.effects[field]=value;return;}
  if(index==='all'){
    b.base[field]=value;
    for(const item of Object.values(b.items))delete item[field];
  }else{b.items[index]??={};b.items[index][field]=value;}
}
export function resetSound(state,bank,index){
  if(index==='all')state[bank]=createSoundState()[bank];else delete state[bank].items[index];
}
function cleanValue(field,value){
  if(field.choices)return field.choices.includes(value)?value:undefined;
  return typeof value==='number'&&Number.isFinite(value)?clamp(value,field.min,field.max):undefined;
}
export function restoreSoundState(saved,legacy={}){
  const state=createSoundState();
  if(!saved){
    for(const bank of ['triggers','balls']){
      const b=state[bank].base;
      const old=legacy.params||{},controls=legacy.controls||{};
      const mapping={octave:'orbitOctave',attack:'orbitAttack',release:'orbitRelease',level:'orbitVolume',reverbSend:'orbitReverb'};
      for(const [id,oldId] of Object.entries(mapping)){const v=cleanValue(FIELD_MAP[id],old[oldId]);if(v!==undefined)b[id]=v;}
      const oldKey=({'D#':'Eb','G#':'Ab','A#':'Bb'})[controls.orbitKey]||controls.orbitKey;
      if(FIELD_MAP.key.choices.includes(oldKey))b.key=oldKey;
      if(FIELD_MAP.scale.choices.includes(controls.orbitScale))b.scale=controls.orbitScale;
      if(controls.orbitInstrument==='pluck'){b.wave='triangle';b.fmAmount=bank==='triggers'?10:0;}
      if(controls.orbitInstrument==='bell'){b.wave='sine';b.fmAmount=110;}
      if(controls.orbitInstrument==='soft'){b.wave='sine';b.fmAmount=0;}
    }
    return state;
  }
  for(const bank of ['triggers','balls']){
    const source=saved[bank];if(!source||typeof source!=='object')continue;
    for(const f of SOUND_FIELDS){const section=f.bankOnly?'effects':'base';const v=cleanValue(f,source[section]?.[f.id]);if(v!==undefined)state[bank][section][f.id]=v;}
    if(typeof source.base?.enabled==='boolean')state[bank].base.enabled=source.base.enabled;
    const limit=bank==='balls'?12:24;
    for(let i=0;i<limit;i++){
      const item=source.items?.[i];if(!item||typeof item!=='object')continue;
      const clean={};for(const f of SOUND_FIELDS.filter(f=>!f.bankOnly)){const v=cleanValue(f,item[f.id]);if(v!==undefined)clean[f.id]=v;}
      if(typeof item.enabled==='boolean')clean.enabled=item.enabled;
      state[bank].items[i]=clean;
    }
  }
  return state;
}
export function formatSoundValue(field,value){
  if(field.choices)return value;
  if(field.id==='cutoff')return value>=1000?(value/1000).toFixed(1)+' kHz':Math.round(value)+' Hz';
  if(field.id==='pan')return value===0?'Center':Math.abs(value)+(value<0?' L':' R');
  if(field.unit===' s')return value.toFixed(value<.1?3:2)+' s';
  return (Number.isInteger(value)?value:Number(value.toFixed(2)))+(field.unit||'');
}
export function soundMidi(patch,degree){
  const scales={minor:[0,2,3,5,7,8,10],major:[0,2,4,5,7,9,11],pentatonic:[0,3,5,7,10],chromatic:[0,1,2,3,4,5,6,7,8,9,10,11]};
  const scale=scales[patch.scale]||scales.minor,key=Math.max(0,FIELD_MAP.key.choices.indexOf(patch.key));
  return clamp(48+key+patch.octave*12+patch.transpose+scale[degree%scale.length]+Math.floor(degree/scale.length)*12,12,120);
}
export function noteName(midi){const names=FIELD_MAP.key.choices;return names[(midi%12+12)%12]+(Math.floor(midi/12)-1);}
