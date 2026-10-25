// A continuous stereo tape loop. No allocations in the audio sample loop.
const smoothKeys=['delayTime','feedback','mix','drive','wow','flutter','hiss','tone','on'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class TapeDelay {
  constructor(rate){
    this.rate=rate;this.length=Math.ceil(rate*2)+4;this.buffer=[new Float32Array(this.length),new Float32Array(this.length)];
    this.head=0;this.clock=0;this.low=[0,0];this.high=[0,0];this.last=[0,0];this.envelope=0;this.seed=721;
    this.target={delayTime:.36,feedback:.32,mix:.18,drive:.2,wow:.2,flutter:.1,hiss:.08,tone:.5,on:0};this.p={...this.target};this.slew=1-Math.exp(-1/(rate*.035));
  }
  set(values){const t=this.target;const specs={delayTime:[.05,1.5,1],feedback:[0,.8,.01],delayMix:[0,.7,.01],drive:[0,1,.01],wow:[0,1,.01],flutter:[0,1,.01],hiss:[0,1,.01],tapeTone:[0,1,.01]};for(const [key,[min,max,scale]]of Object.entries(specs)){if(Number.isFinite(values[key]))t[{delayMix:'mix',tapeTone:'tone'}[key]||key]=clamp(values[key]*scale,min,max);}if(typeof values.tapeOn==='boolean')t.on=Number(values.tapeOn);}
  process(input,output){const p=this.p,t=this.target,rate=this.rate,n=this.length;for(let i=0;i<output[0].length;i++){
    for(const key of smoothKeys)p[key]+=(t[key]-p[key])*this.slew;
    const left=input[0]?.[i]||0,right=input[1]?.[i]??left;
    this.envelope=Math.max(Math.abs(left),Math.abs(right),this.envelope*.9994);
    // Irregular slow capstan drift plus faster flutter; read-head modulation bends repeats continuously.
    const phase=this.clock/rate;
    const drift=(Math.sin(phase*2*Math.PI*.47)+.28*Math.sin(phase*2*Math.PI*.79))*.0018*p.wow;
    const flutter=(Math.sin(phase*2*Math.PI*6.7)+.35*Math.sin(phase*2*Math.PI*11.3))*.00018*p.flutter;
    const cutoff=1500+6500*p.tone,lp=1-Math.exp(-2*Math.PI*cutoff/rate),hp=Math.exp(-2*Math.PI*90/rate);
    for(let c=0;c<2;c++){
      const source=c?right:left,offset=p.on*((drift+flutter)*rate+(c?rate*.0007:0));
      const read=(this.head-clamp(p.delayTime*rate+offset,2,n-2)+n)%n,at=Math.floor(read),fraction=read-at;
      let echo=this.buffer[c][at]*(1-fraction)+this.buffer[c][(at+1)%n]*fraction;
      this.high[c]=hp*(this.high[c]+echo-this.last[c]);this.last[c]=echo;
      this.low[c]+=lp*(this.high[c]-this.low[c]);echo=echo*(1-p.on)+this.low[c]*p.on;
      const gain=1+p.drive*2.8;
      this.seed=(this.seed*1664525+1013904223)>>>0;
      const hiss=(this.seed/4294967296*2-1)*p.hiss*.003*Math.min(1,this.envelope*12)*p.on;
      const write=source+echo*p.feedback;
      this.buffer[c][this.head]=write*(1-p.on)+(Math.tanh(write*gain)/gain)*p.on+hiss;
      const direct=source*(1-p.on)+(Math.tanh(source*gain)/gain)*p.on;
      output[c][i]=direct*.75+echo*p.mix;
    }
    this.head=(this.head+1)%n;this.clock++;
  }}
}
