import { tapeWow, tapeFlutter } from './tape-motion.mjs';

export const TAPE_LAYOUTS = Object.freeze({
  loop: {
    reels: [[100, 84, 58], [260, 84, 50]],
    guides: [[30, 166], [330, 166]], head: [180, 294, 0],
    spans: [
      [[46, 105], [40, 125], [32, 146], [30, 166]],
      [[30, 166], [38, 235], [103, 294], [180, 294]],
      [[180, 294], [257, 294], [322, 235], [330, 166]],
      [[330, 166], [327, 140], [313, 113], [307, 101]]
    ]
  },
  diagonal: {
    reels: [[88, 88, 59], [272, 272, 53]],
    guides: [[34, 214], [326, 146]], head: [180, 180, -Math.PI / 4],
    spans: [
      [[36, 116], [18, 156], [25, 190], [34, 214]],
      [[34, 214], [65, 294], [122, 238], [180, 180]],
      [[180, 180], [238, 122], [295, 66], [326, 146]],
      [[326, 146], [335, 170], [338, 210], [319, 248]]
    ]
  },
  vertical: {
    reels: [[88, 88, 59], [88, 272, 53]],
    guides: [[280, 58], [280, 302]], head: [280, 180, Math.PI / 2],
    spans: [
      [[145, 76], [180, 58], [232, 48], [280, 58]],
      [[280, 58], [329, 82], [280, 127], [280, 180]],
      [[280, 180], [280, 233], [329, 278], [280, 302]],
      [[280, 302], [232, 312], [180, 302], [139, 284]]
    ]
  }
});

export function drawTapeTransport({c, w, h}, p, angle, level, seconds = 0, layout = 'loop') {
  c.clearRect(0, 0, w, h);
  if (w <= 16 || h <= 16) return;
  const design = TAPE_LAYOUTS[layout] || TAPE_LAYOUTS.loop;
  c.save();
  const scale = Math.min((w - 24) / 360, (h - 24) / 360);
  c.translate((w - 360 * scale) / 2, (h - 360 * scale) / 2);
  c.scale(scale, scale);
  const on = p.tapeOn, signal = Math.max(0, Math.min(1, level));
  const wow = on ? p.wow / 100 : 0, flutter = on ? p.flutter / 100 : 0;
  const drift = tapeWow(seconds, wow) * 30 + tapeFlutter(seconds, flutter) * 100;
  const circle = (x, y, r, fill, stroke) => {
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.stroke(); }
  };
  c.lineWidth = .8;
  design.reels.forEach(([x,y,r], i) => {
    circle(x,y,r,'#171717','#777');
    for(let ring = 25; ring < r - 2; ring += 2.5) circle(x,y,ring,null,ring % 5 < 2.5 ? '#555' : '#333');
    c.save(); c.translate(x,y); c.rotate((angle + drift) * 58 / r + i * .7);
    circle(0,0,23,'#8c8c8c','#bbb');
    c.fillStyle = '#000';
    for(let j=0;j<3;j++) { c.rotate(Math.PI*2/3); c.fillRect(8,-4,12,8); }
    circle(0,0,5,'#000'); c.restore();
  });

  // Sample each free span. The head and guide points remain fixed.
  function points(time, lift = 0) {
    const out = [];
    design.spans.forEach(([a,b,d,e], index) => {
      for(let i=0;i<=64;i++) {
        const t=i/64, u=1-t;
        const x=u*u*u*a[0]+3*u*u*t*b[0]+3*u*t*t*d[0]+t*t*t*e[0];
        const y=u*u*u*a[1]+3*u*u*t*b[1]+3*u*t*t*d[1]+t*t*t*e[1];
        const dx=3*u*u*(b[0]-a[0])+6*u*t*(d[0]-b[0])+3*t*t*(e[0]-d[0]);
        const dy=3*u*u*(b[1]-a[1])+6*u*t*(d[1]-b[1])+3*t*t*(e[1]-d[1]);
        const length=Math.hypot(dx,dy)||1;
        const sway=tapeWow(time-t*.28-index*.1,wow)/.005*21;
        const ripple=tapeFlutter(time-t*.6-index*.17,flutter)/.00035*5;
        const offset=(sway+ripple+lift)*Math.sin(Math.PI*t)*(index===1||index===2?1:.3);
        out.push([x-dy/length*offset,y+dx/length*offset]);
      }
    });
    return out;
  }
  function stroke(pts, width, color) {
    c.beginPath(); pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));
    c.lineWidth=width; c.strokeStyle=color; c.stroke();
  }
  c.lineCap='round'; c.lineJoin='round';
  if(on) for(let repeat=4;repeat>=1;repeat--) {
    c.globalAlpha=p.delayMix/100*Math.pow(p.feedback/100,repeat-1)*(.6+.4*signal);
    stroke(points(seconds-repeat*p.delayTime,repeat*(4+p.delayTime*6)),1.2,'#ddd');
  }
  c.globalAlpha=1;
  const tape=points(seconds);
  stroke(tape,6,on?'#eee':'#666'); stroke(tape,3.5,'#444');
  // Mark distance along the tape, so transport stays legible on curved spans.
  let distance=0, next=((angle*26%14)+14)%14;
  for(let i=1;i<tape.length;i++) {
    const [x,y]=tape[i], [px,py]=tape[i-1], dx=x-px, dy=y-py, length=Math.hypot(dx,dy);
    while(length>0 && next<=distance+length) {
      const t=(next-distance)/length, mx=px+dx*t, my=py+dy*t;
      c.beginPath(); c.moveTo(mx-dy/length*1.6,my+dx/length*1.6); c.lineTo(mx+dy/length*1.6,my-dx/length*1.6);
      c.lineWidth=1; c.strokeStyle=on?'#fff':'#888'; c.stroke(); next+=14;
    }
    distance+=length;
  }
  c.lineWidth=1;
  for(const [x,y] of design.guides) { circle(x,y,7,'#000','#aaa');circle(x,y,2,'#ccc'); }
  const [hx,hy,rotation]=design.head;
  const warmth=on?p.drive/100*(.25+.75*signal):0, shade=Math.round(35+170*Math.sqrt(warmth));
  c.save(); c.translate(hx,hy); c.rotate(rotation);
  c.fillStyle=`rgb(${shade},${shade},${shade})`; c.fillRect(-22,4,44,31);
  c.fillStyle='#080808';c.fillRect(-18,7,36,24);
  c.strokeStyle=on?'#bbb':'#666';c.strokeRect(-18,7,36,24);
  c.fillStyle=on?'#fff':'#888';c.fillRect(-11,0,22,7);
  c.fillStyle=`rgb(${shade},${shade},${shade})`;
  for(let i=0;i<6;i++) c.fillRect(-13+i*5,14,2,10);
  c.restore(); c.restore();
}
