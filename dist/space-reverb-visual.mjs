// An illustrative sound field inside each reverb material. Only measured wet
// activity launches wave fronts; these drawings are not a physical simulation.
const TAU = Math.PI * 2;
const clamp = (x, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, Number(x) || 0));
const states = new WeakMap();
const grey = value => `rgb(${value},${value},${value})`;
function line(c, points, shade, width = 1) {
  c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
  c.strokeStyle = grey(shade); c.lineWidth = width; c.stroke();
}
function glow(c, x, y, radius, strength) {
  const g = c.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, grey(strength)); g.addColorStop(.3, grey(strength * .35)); g.addColorStop(1, '#000');
  c.fillStyle = g; c.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}
function field(c, model, time, level, decay, reducedMotion) {
  let s = states.get(c);
  if (!s || s.model !== model || time < s.time || time - s.time > .5) {
    s = { model, time, lastPulse: -Infinity, energy: 0, pulses: [], index: 0 };
    states.set(c, s);
  }
  const dt = clamp(time - s.time, 0, .1); s.time = time;
  s.energy += (level - s.energy) * (1 - Math.exp(-dt / (level > s.energy ? .08 : .22)));
  if (reducedMotion || time === 0) { s.pulses.length = 0; s.energy = 0; }
  else {
    if (level > .002 && time - s.lastPulse > .27) {
      s.pulses.push({ at: time, strength: Math.min(1, Math.sqrt(level) * 3.2), seed: s.index++ });
      s.lastPulse = time;
    }
    // Quiet returns shed their visible traces promptly. Decay controls trail
    // persistence while the audible tail is present, not an invented tail.
    if (level <= .002) for (const pulse of s.pulses) pulse.strength *= Math.exp(-dt * 12);
    s.pulses = s.pulses.filter(p => time - p.at < Math.min(5, .8 + decay * .55) && p.strength > .005).slice(-20);
  }
  return s;
}
export function plateLayout(w, h, decay = 3) {
  const scale = Math.min(w / 1000, (h - 70) / 930);
  const unit = clamp((decay - .5) / 7.5), gap = 135 + unit * 305;
  return { scale, x: (w - 1000 * scale) / 2, y: 35 + (h - 70 - 930 * scale) / 2, gap, unit };
}
function plate(c, s, time, width, tone, decay) {
  const gap=plateLayout(1000,1000,decay).gap;
  const project=(u,v,center,z=0)=>[500+(u-.5)*755+(v-.5)*125,center+(v-.5)*155-(u-.5)*45-z];
  const upper=465-gap/2,lower=465+gap/2;
  // Visible packets bounce through the gap; separation stretches travel time.
  const journey=.2+clamp((decay-.5)/7.5)*.55;
  for(const p of s.pulses) {
    const age=time-p.at,travel=age/journey,bounce=Math.floor(travel),f=travel-bounce;
    const strength=p.strength*Math.exp(-age/(.4+decay*.3));
    for(let trail=7;trail>=0;trail--) {
      const past=Math.max(0,travel-trail*.045),b=Math.floor(past),q=past-b;
      const y=upper+(b%2?1-q:q)*gap;
      const x=500+Math.sin(p.seed*.9+b*.7)*145*(.3+width*.7);
      const radius=9+trail*3+(1-strength)*11;
      c.beginPath();c.ellipse(x,y,radius*(.8+width*.6),radius*.33,0,0,TAU);
      c.strokeStyle=grey(strength*(220-trail*24));c.lineWidth=1.6;c.stroke();
    }
    // A dim reflected path gives each packet a sense of depth in the gap.
    const x=500+Math.sin(p.seed*.9+bounce*.7)*145*(.3+width*.7);
    line(c,[[x,upper+5],[x,lower-5]],strength*14,.8);
  }
  for(const [side,center] of [[0,upper],[1,lower]]) {
    const impacts=[];
    for(const p of s.pulses) {
      const age=time-p.at;
      for(let n=side;n<=Math.min(12,age/journey);n+=2) {
        const since=age-n*journey;
        if(since<1.5)impacts.push({radius:since*.8,strength:p.strength*Math.exp(-age/(.5+decay*.3))*Math.exp(-since*1.7),u:.5+Math.sin(p.seed*.9+n*.7)*.19});
      }
    }
    const height=(u,v)=>{
      let z=0;
      for(const wave of impacts) { const d=Math.hypot((u-wave.u)/(.6+width*.5),(v-.5)*.45)-wave.radius;z+=Math.exp(-d*d*180)*Math.sin(d*(42+tone*20))*wave.strength; }
      return z*18*Math.sin(Math.PI*u)*Math.sin(Math.PI*v);
    };
    const corners=[[0,0],[1,0],[1,1],[0,1],[0,0]].map(([u,v])=>project(u,v,center));
    c.beginPath();corners.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));
    const metal=c.createLinearGradient(130,center-90,830,center+90);metal.addColorStop(0,'#090909');metal.addColorStop(.55,'#292929');metal.addColorStop(1,'#080808');c.fillStyle=metal;c.fill();
    for(let row=0;row<=20;row++) {
      const v=row/20,points=[];
      for(let k=0;k<=64;k++){const u=k/64;points.push(project(u,v,center,height(u,v)));}
      line(c,points,50+Math.sin(Math.PI*v)*38+s.energy*110,.9);
    }
    for(let col=0;col<=20;col++) {
      const u=col/20,points=[];
      for(let k=0;k<=24;k++){const v=k/24;points.push(project(u,v,center,height(u,v)));}
      line(c,points,27+s.energy*60,.7);
    }
    c.save();c.beginPath();corners.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.clip();
    for(const wave of impacts) {
      const points=[];
      for(let i=0;i<=100;i++){const a=i/100*TAU,u=wave.u+Math.cos(a)*wave.radius*(.6+width*.5),v=.5+Math.sin(a)*wave.radius/.45;points.push(project(u,v,center,height(clamp(u),clamp(v))));}
      line(c,points,wave.strength*230,1.5);
    }
    c.restore();line(c,corners,170,1.8);
    line(c,[project(0,1,center+5),project(1,1,center+5)],75,2);
    // Quiet grip marks make the material itself discoverable as a control.
    for(let n=-1;n<=1;n++)line(c,[[486,center+n*5],[514,center+n*5]],155,1.4);
  }
  line(c,[[930,upper],[940,upper],[935,upper],[935,lower],[930,lower],[940,lower]],65,1);
}
function spring(c,s,time,width,tone,decay) {
  // Three large coils recede into the display. Wave fronts compress and lift
  // successive turns, with ghost contours tracing their damped return.
  for (let row=0;row<3;row++) {
    const center=280+row*210;
    const drawCoil=(lag,shade,weight)=>{
      const points=[];
      for(let i=0;i<=640;i++) {
        const u=i/640, phase=u*TAU*(24+row*3), perspective=.42+u*.65;
        let wave=0;
        for(const p of s.pulses) {
          const age=time-p.at-lag, travel=age*(.55+row*.035), q=u-travel;
          if(age>=0) wave+=Math.exp(-q*q*85)*Math.sin(q*(48+tone*18)-age*8)*p.strength*Math.exp(-age/(.5+decay*.25));
          const reflected=u-(2-travel);
          if(age>1) wave+=Math.exp(-reflected*reflected*100)*Math.sin(reflected*53)*p.strength*.4*Math.exp(-age/(.5+decay*.25));
        }
        const radius=(39+width*27)*perspective;
        points.push([115+u*760+Math.cos(phase)*radius*.46+wave*22,center+(u-.5)*90+Math.sin(phase)*radius+wave*32]);
      }
      line(c,points,shade,weight);
    };
    if(s.pulses.length) {
      drawCoil(.16,22+s.energy*35,1.5);
      drawCoil(.075,45+s.energy*50,1.3);
    }
    drawCoil(0,135+s.energy*115,1.7);
    for(const [x,y] of [[96,center-45],[905,center+45]]) {
      line(c,[[x-12,y-19],[x+12,y-19],[x+12,y+19],[x-12,y+19],[x-12,y-19]],80,1.5);
      line(c,[[x,y-10],[x,y+10]],180,2);
    }
  }
}
function chamber(c,s,time,width,tone,decay,original) {
  const project = (x,y,z) => { const p=1/(1+z*2.8); return [500+x*(.65+width*.35)*p,445+y*p]; };
  // Visible boundaries make the depth legible even before playback.
  for(let i=0;i<9;i++) {
    const z=i*.19, corners=[[-455,-350],[455,-350],[455,390],[-455,390],[-455,-350]].map(([x,y])=>project(x,y,z));
    line(c,corners,Math.max(18,65-i*6),.9);
  }
  for(const [x,y] of [[-455,-350],[455,-350],[455,390],[-455,390]])line(c,[project(x,y,0),project(x,y,1.6)],65,1);
  if(!original) for(const x of [-170,170]) {
    line(c,[project(x,-300,.9),project(x,360,.9)],80,6);
    line(c,[project(x-6,-300,.9),project(x-6,360,.9)],145,1);
  }
  // Repeated arcs travel away from the listener and rebound on the walls.
  for(const p of s.pulses) {
    const age=time-p.at, z=age*.48, strength=p.strength*Math.exp(-age/(.4+decay*.3));
    for(let echo=0;echo<(original?2:4);echo++) {
      const points=[], depth=z+echo*.13, radius=160+age*230;
      for(let i=0;i<=128;i++) {
        const a=i/128*TAU, r=radius*(1+.025*tone*Math.sin(a*8+p.seed));
        const x=Math.sin(r*Math.cos(a)/455)*455, y=Math.sin(r*Math.sin(a)/365)*365;
        points.push(project(x,y,depth));
      }
      line(c,points,strength*(210-echo*38),1.7-echo*.2);
    }
  }
  glow(c,500,445,35+s.energy*55,35+s.energy*160);
}
export function drawSpaceReverb({c,w,h},settings={}, {time=0,level=0,reducedMotion=false}={}) {
  c.clearRect(0,0,w,h); if(w<20||h<90)return;
  const model=settings.reverbModel??'original';
  const decay=clamp(settings.reverbDecay??3,.5,8),width=clamp((settings.reverbWidth??75)/100),tone=clamp((settings.reverbTone??50)/100);
  const t=Number.isFinite(time)?time:0,s=field(c,model,t,clamp(level),decay,reducedMotion);
  c.save(); const scale=Math.min(w/1000,(h-70)/930);
  c.translate((w-1000*scale)/2,35+(h-70-930*scale)/2);c.scale(scale,scale);c.lineJoin='round';c.lineCap='round';
  glow(c,500,475,470,12+s.energy*22);
  if(model==='plate')plate(c,s,t,width,tone,decay);
  else if(model==='spring')spring(c,s,t,width,tone,decay);
  else chamber(c,s,t,width,tone,decay,model!=='chamber');
  c.restore();
}
