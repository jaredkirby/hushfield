// Inspired complex oscillator and low-pass gate. Harmonic shaping is explicitly
// bandlimited instead of applying a naïve nonlinear wavefolder at audio rate.
const size=2048,tau=Math.PI*2,table=new Float32Array(size);
for(let i=0;i<size;i++)table[i]=Math.sin(tau*i/size);
function sin(p){const x=((p%1)+1)%1*size,i=x|0,f=x-i;return table[i]*(1-f)+table[(i+1)%size]*f;}
function complex(v,p,rate,time,melodic){
 const f=v.frequency;if(f>=rate*.46)return 0;
 const color=p.color/100,bloom=p.bloom/100,drift=p.drift/100;
 const offset=v.motionPhase||0,period=3.1+offset*2.7;
 const age=melodic?(v.age||0):(time+offset*period)%period;
 const decay=.28+bloom*1.75;
 const target=.14+.86*(1-Math.exp(-age/.035))*Math.exp(-age/decay);
 if(v.buchlaGate===undefined)v.buchlaGate=target;
 v.buchlaGate+=(target-v.buchlaGate)*(1-Math.exp(-1/(rate*.025)));
 const gate=v.buchlaGate;
 // Fold-like harmonic redistribution with slow bounded timbre modulation.
 const movement=sin(time*(.071+offset*.03)+offset)*drift;
 const shape=Math.max(0,Math.min(1,color+movement*.17));
 const phase=v.phase;
 let value=0,energy=0;
 for(let h=1;h<=9;h++){
  const edge=Math.max(0,Math.min(1,(.43-f*h/rate)/.07));if(edge===0)break;
  const fold=h===1?1:Math.sin(shape*Math.PI*h*.62)*shape*1.4/Math.sqrt(h);
  // Coupled gate brightness and amplitude: short decays close the spectrum too.
  const weight=fold*edge/(1+(h-1)*(1-gate)*1.8);
  value+=sin(phase*h)*weight;energy+=weight*weight;
 }
 return value/Math.sqrt(Math.max(1,energy))*gate*1.55;
}
export function renderPad(v,p,rate,time){return complex(v,p,rate,time,false);}
export function renderMelody(v,p,rate,time){return complex(v,p,rate,time,true);}
