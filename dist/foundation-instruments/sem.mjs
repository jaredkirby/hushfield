// SEM-inspired two-source voice with a topology-preserving two-pole SVF.
// Lowpass -> notch -> highpass is the continuous response morph; bandpass
// exists inside the filter integrator but is deliberately not on that path.
const size=2048,table=new Float32Array(size);
for(let i=0;i<size;i++)table[i]=Math.sin(i*Math.PI*2/size);
function sin(phase){const x=((phase%1)+1)%1*size,i=x|0,f=x-i;return table[i]*(1-f)+table[(i+1)%size]*f;}
// Polynomial BLEP corrects both waveform discontinuities at audio rate. Unlike
// a harmonic cap this retains the rich saw/pulse spectrum at low bass pitches.
function blep(phase,step){if(phase<step){const x=phase/step;return x+x-x*x-1;}if(phase>1-step){const x=(phase-1)/step;return x*x+x+x+1;}return 0;}
function saw(phase,step){return step>=.45?0:2*phase-1-blep(phase,step);}
function pulse(phase,step,width){if(step>=.45)return 0;const edge=phase-width+(phase<width?1:0);return (phase<width?1:-1)+blep(phase,step)-blep(edge,step)-(2*width-1);}
function render(voice,p,rate,time,melody){
 const drift=p.drift/100,bloom=p.bloom/100,color=p.color/100;
 // Recalculate slow modulation/filter coefficients every 32 samples, while
 // oscillators, discontinuity correction and the SVF still run every sample.
 if(!voice.semControlTick){
  const motion=sin(time*(.07+(voice.motionRate||.012))+(voice.motionPhase||0));
  voice.semWidth=.5+sin(time*.13+(voice.motionPhase||0))*drift*.17;
  const cutoff=Math.min(rate*.18,(melody?1600:1050)*2**(motion*bloom*1.5));
  voice.semG=Math.tan(Math.PI*cutoff/rate);voice.semA=1/(1+voice.semG*(voice.semG+1.55));
 }
 voice.semControlTick=((voice.semControlTick||0)+1)&31;
 const frequency=voice.frequency;
 // Source two runs independently; the engine's phase2 is a harmonic for melody.
 voice.semPhase=((voice.semPhase??voice.phase2)+frequency*(1.002+drift*.006)/rate)%1;
 const input=saw(voice.phase,frequency/rate)*.65+pulse(voice.semPhase,frequency*(1.002+drift*.006)/rate,voice.semWidth)*.48;
 const g=voice.semG,k=1.55,a=voice.semA;
 const s1=voice.semIc1||0,s2=voice.semIc2||0;
 const band=(s1+g*(input-s2))*a,low=s2+g*band,high=input-k*band-low;
 voice.semIc1=2*band-s1;voice.semIc2=2*low-s2;
 const notch=low+high;
 const value=color<.5?low*(1-color*2)+notch*color*2:notch*(2-color*2)+high*(color*2-1);
 return value*(melody?1.15:2.0);
}
export function renderPad(voice,p,rate,time){return render(voice,p,rate,time,false);}
export function renderMelody(note,p,rate,time){return render(note,p,rate,time,true);}
