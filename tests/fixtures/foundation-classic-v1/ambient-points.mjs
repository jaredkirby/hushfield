const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export const POINT_LIMITS={left:.07,right:.93,top:.18,bottom:.78};
export const PITCH_STEP=.055;
export const AMBIENT_POINTS=Object.freeze([{x:.17,y:.35},{x:.39,y:.40},{x:.61,y:.32},{x:.83,y:.37}].map(Object.freeze));
export function restorePoints(points){return AMBIENT_POINTS.map((home,index)=>{const point=points?.[index];return {x:Number.isFinite(point?.x)?clamp(point.x,POINT_LIMITS.left,POINT_LIMITS.right):home.x,y:Number.isFinite(point?.y)?clamp(point.y,POINT_LIMITS.top,POINT_LIMITS.bottom):home.y};});}
export function pointPitch(point,index){return clamp(Math.round((AMBIENT_POINTS[index].y-point.y)/PITCH_STEP),-7,7);}
export function pointPan(point){return (point.x-.5)*2;}
export function pointGeometry(point,index,time=0,reduced=false,dragging=false,w=Infinity,h=Infinity){const mx=Math.min(.45,22/w),my=Math.min(.45,22/h);return {x:clamp(point.x,mx,1-mx),y:clamp(point.y+(reduced||dragging?0:Math.sin(Math.PI*2*(time*.019+index*.23))*.009),my,1-my)};}
export function movePoint(point,x,y){return {x:clamp(x,POINT_LIMITS.left,POINT_LIMITS.right),y:clamp(y,POINT_LIMITS.top,POINT_LIMITS.bottom)};}
// The worklet timestamps the sample clock. Interpolate from the output-device
// clock instead of stepping at the message rate or free-running on wall time.
export function ambientVisualSeconds(status,outputTime,playing){const delta=Number.isFinite(status.audioTime)&&Number.isFinite(outputTime)?clamp(outputTime-status.audioTime,-.5,.5):0;return Math.max(0,(status.motionTime??status.elapsed??0)+(playing?delta:0));}
export function outputAudioTime(context,frameTime){if(!context)return 0;try{const stamp=context.getOutputTimestamp?.();if(stamp&&stamp.contextTime>0&&Number.isFinite(stamp.performanceTime))return stamp.contextTime+clamp((frameTime-stamp.performanceTime)/1000,-.1,.1);}catch{}return Math.max(0,context.currentTime-((context.outputLatency||0)+(context.baseLatency||0)));}
export const midiLabel=midi=>['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'][((midi%12)+12)%12]+(Math.floor(midi/12)-1);
