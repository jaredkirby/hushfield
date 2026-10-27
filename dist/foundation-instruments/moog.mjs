// Minimoog-inspired: one low chord voice, three antialiased saw oscillators,
// restrained saturation and four cascaded one-pole lowpass stages. This is
// a character model, not a transistor-ladder circuit emulation.
const size=2048,table=new Float32Array(size);
for(let i=0;i<size;i++)table[i]=Math.sin(i*Math.PI*2/size);
function sin(phase){const x=((phase%1)+1)%1*size,i=x|0,f=x-i;return table[i]*(1-f)+table[(i+1)%size]*f;}
// Polynomial BLEP removes the saw discontinuity's strongest aliases without
// limiting a bass oscillator to a small fixed set of harmonics.
function saw(phase,frequency,rate){const step=frequency/rate;if(step>=.45)return 0;let correction=0;if(phase<step){const x=phase/step;correction=x+x-x*x-1;}else if(phase>1-step){const x=(phase-1)/step;correction=x*x+x+x+1;}return 2*phase-1-correction;}
function render(voice,p,rate,time,melody){
 const drift=p.drift/100,color=p.color/100,bloom=p.bloom/100;
 const frequency=voice.frequency*(melody?1:.5),offset=.0008+drift*.007;
 voice.moogPhaseA=((voice.moogPhaseA??voice.phase)+frequency/rate)%1;
 voice.moogPhaseB=((voice.moogPhaseB??voice.phase2)+frequency*(1-offset)/rate)%1;
 voice.moogPhaseC=((voice.moogPhaseC??.37)+frequency*(1+offset)/rate)%1;
 const input=(saw(voice.moogPhaseA,frequency,rate)+saw(voice.moogPhaseB,frequency*(1-offset),rate)+saw(voice.moogPhaseC,frequency*(1+offset),rate))/3;
 if(!voice.moogControlTick){
  const contour=melody?Math.exp(-(voice.age||0)*2):.5+.5*sin(time*.055+(voice.motionPhase||0));
  const cutoff=Math.min(rate*.18,frequency*(2+color*28)*(1+bloom*contour*2));
  voice.moogCoefficient=1-Math.exp(-2*Math.PI*cutoff/rate);voice.moogDrive=1+color*1.8;voice.moogNormalization=1/Math.tanh(voice.moogDrive);
 }
 voice.moogControlTick=((voice.moogControlTick||0)+1)&31;
 const coefficient=voice.moogCoefficient;
 const value=Math.tanh(input*voice.moogDrive)*voice.moogNormalization;
 voice.moogLow1=(voice.moogLow1||0)+coefficient*(value-(voice.moogLow1||0));
 voice.moogLow2=(voice.moogLow2||0)+coefficient*(voice.moogLow1-(voice.moogLow2||0));
 voice.moogLow3=(voice.moogLow3||0)+coefficient*(voice.moogLow2-(voice.moogLow3||0));
 voice.moogLow4=(voice.moogLow4||0)+coefficient*(voice.moogLow3-(voice.moogLow4||0));
 return voice.moogLow4*(melody?1.1:5.2);
}
export function renderPad(voice,p,rate,time){return voice.index===0?render(voice,p,rate,time,false):0;}
export function renderMelody(note,p,rate,time){return render(note,p,rate,time,true);}
