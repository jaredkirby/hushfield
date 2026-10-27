// Divide-down strings: band-limited saw harmonics and three moving ensemble taps.
const size=2048, sine=new Float32Array(size);
for(let i=0;i<size;i++)sine[i]=Math.sin(i*Math.PI*2/size);
function sin(p){const x=((p%1)+1)%1*size,i=x|0,f=x-i;return sine[i]*(1-f)+sine[(i+1)%size]*f;}
function strings(phase,frequency,rate,color){let value=0,energy=0;for(let h=1;h<=8;h++){const edge=Math.max(0,Math.min(1,(.46-frequency*h/rate)/.05));if(!edge)break;const weight=edge*(h===1?1:(.2+color*.8)/h);value+=sin(phase*h)*weight;energy+=weight*weight;}return value/Math.sqrt(Math.max(1,energy));}
export function renderPad(voice,p,rate,time){return strings(voice.phase,voice.frequency,rate,p.color/100)*1.25;}
export function renderMelody(note,p,rate,time){return renderPad(note,p,rate,time)*.8;}

export function createEffect(rate){return {buffer:new Float32Array(Math.ceil(rate*.06)+4),index:0,rate,left:0,right:0};}
function tap(state,seconds){const buffer=state.buffer;let at=(state.index-seconds*state.rate+buffer.length)%buffer.length;const i=at|0,f=at-i;return buffer[i]*(1-f)+buffer[(i+1)%buffer.length]*f;}
export function processStereo(state,left,right,p,time){const mono=(left+right)*.5;state.buffer[state.index]=mono;const depth=.0012+p.drift*.000018,bloom=p.bloom/100;const a=tap(state,.013+sin(time*.63)*depth+sin(time*5.1)*.0004),b=tap(state,.019+sin(time*.63+.333)*depth+sin(time*5.1+.333)*.0004),c=tap(state,.025+sin(time*.63+.667)*depth+sin(time*5.1+.667)*.0004);const wet=.48+bloom*.22;state.left=left*(1-wet)+(a*.65+b*.35)*wet;state.right=right*(1-wet)+(c*.65+b*.35)*wet;state.index=(state.index+1)%state.buffer.length;}
