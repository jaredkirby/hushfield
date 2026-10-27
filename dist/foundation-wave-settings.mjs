export const FOUNDATION_WAVE_FIELDS = [
  {id:'foundationLines',label:'Lines',min:8,max:48,step:1,value:24,format:v=>String(v)},
  {id:'foundationSpacing',label:'Spacing growth',min:0,max:95,step:1,value:75,format:v=>v===0?'Even':v+'%'},
  {id:'foundationHeight',label:'Band height',min:20,max:65,step:1,value:36,format:v=>v+'%'},
  {id:'foundationFolds',label:'Folds',min:4,max:24,step:1,value:14,format:v=>String(v)},
  {id:'foundationStars',label:'Stars',min:0,max:180,step:1,value:36,format:v=>v===0?'Off':String(v)},
  {id:'foundationTwinkle',label:'Twinkle',min:0,max:100,step:1,value:35,format:v=>v===0?'Off':v+'%'}
];
export const FOUNDATION_WAVE_DEFAULTS = Object.fromEntries(FOUNDATION_WAVE_FIELDS.map(field=>[field.id,field.value]));
export function restoreFoundationWaves(saved) {
  return Object.fromEntries(FOUNDATION_WAVE_FIELDS.map(field=>[field.id,Number.isFinite(saved?.[field.id])
    ? Math.max(field.min,Math.min(field.max,Math.round(saved[field.id]))) : field.value]));
}
