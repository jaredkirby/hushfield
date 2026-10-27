// Inspired chorus polysynth: bandlimited saw/PWM, sub and resonant low-pass.
// This is a bounded digital voice, not a model of Roland's oscillator or filter circuit.
const tau=Math.PI*2;
function blep(t,dt){if(t<dt){t/=dt;return t+t-t*t-1;}if(t>1-dt){t=(t-1)/dt;return t*t+t+t+1;}return 0;}
function saw(phase,dt){return 2*phase-1-blep(phase,dt);}
function voice(v,p,rate,time){
 const f=v.frequency,dt=f/rate;if(dt>=.4)return 0;
 const drift=p.drift/100,color=p.color/100,bloom=p.bloom/100;
 const width=.5+(.025+.2*drift)*Math.sin(tau*(time*.17+(v.motionPhase||0)));
 const phase=v.phase,shift=(phase-width+1)%1;
 const pulse=(phase<width?1:-1)+blep(phase,dt)-blep(shift,dt);
 v.junoSub=((v.junoSub||0)+dt*.5)%1;
 const sub=saw(v.junoSub,dt*.5);
 const source=(saw(phase,dt)*.48+pulse*.42+sub*.26)/1.16;
 if(v.junoTick===undefined){v.junoTick=0;v.junoLow1=0;v.junoBand1=0;v.junoLow2=0;v.junoBand2=0;}
 if((v.junoTick++&31)===0){
  const swell=.5+.5*Math.sin(tau*(time*.041+(v.motionPhase||0)));
  const cutoff=Math.min(rate*.32,220*2**(color*4.5+bloom*swell*1.3));
  v.junoG=Math.tan(Math.PI*cutoff/rate);v.junoK=1.75-color*.65;
 }
 const g=v.junoG,k=v.junoK,a=1/(1+g*(g+k));
 let b=(v.junoBand1+g*(source-v.junoLow1))*a,l=v.junoLow1+g*b;
 v.junoBand1=2*b-v.junoBand1;v.junoLow1=2*l-v.junoLow1;
 b=(v.junoBand2+g*(l-v.junoLow2))*a;l=v.junoLow2+g*b;
 v.junoBand2=2*b-v.junoBand2;v.junoLow2=2*l-v.junoLow2;
 return l*1.45;
}
export function renderPad(v,p,rate,time){return voice(v,p,rate,time);}
export function renderMelody(v,p,rate,time){return voice(v,p,rate,time);}
export function createEffect(rate){return {buffer:new Float32Array(Math.ceil(rate*.055)+4),index:0,rate,left:0,right:0};}
function read(s,delay){const n=s.buffer.length,at=(s.index-delay+n)%n,i=at|0,f=at-i;return s.buffer[i]*(1-f)+s.buffer[(i+1)%n]*f;}
export function processStereo(s,left,right,p,time){
 s.buffer[s.index]=(left+right)*.5;
 const depth=.0012+p.drift*.000025,phase=tau*time*(.22+p.drift*.0015);
 const a=read(s,s.rate*(.013+depth*Math.sin(phase))),b=read(s,s.rate*(.013+depth*Math.sin(phase+Math.PI)));
 s.left=left*.78+a*.42;s.right=right*.78+b*.42;s.index=(s.index+1)%s.buffer.length;
}
