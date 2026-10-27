// Ported from the RE-201 study in the Simulate RE-201 tape movement chat.
// The continuous contour and fixed-width smoothing preserve that study's motion.
    const kernel=Array.from({length:37},(_,i)=>Math.exp(-.5*((i-18)/6.75)**2));
    const norm=kernel.reduce((a,b)=>a+b,0);
  const base=[]; let distance=0;
  function point(x,y) {
    if(base.length) distance+=Math.hypot(x-base.at(-1).x,y-base.at(-1).y);
    base.push({x,y,s:distance});
  }
  function cubic(cx,cy,dx,dy,x,y,n=32) {
    const a=base.at(-1);
    for(let i=1;i<=n;i++) {
      const t=i/n,u=1-t;
      point(u*u*u*a.x+3*u*u*t*cx+3*u*t*t*dx+t*t*t*x,
            u*u*u*a.y+3*u*u*t*cy+3*u*t*t*dy+t*t*t*y);
    }
  }
  const spacing=560/9, spread=(spacing-28)/2;
  function strandX(j,y) {
    const u=(y-185)/365;
    return 119+j*spacing+(j%2?1:-1)*spread*Math.cos(Math.PI*u);
  }
  point(683,682);
  cubic(673,648,strandX(9,550),603,strandX(9,550),550);
  for(let j=9;j>=0;j--) {
    const upward=j%2===1;
    for(let i=1;i<=70;i++) {
      const y=upward?550-i/70*365:185+i/70*365;
      point(strandX(j,y),y);
    }
    if(j>0) {
      const y=upward?185:550;
      const x0=strandX(j,y),x1=strandX(j-1,y),middle=(x0+x1)/2;
      const tip=upward?112:619, k=.55228475;
      cubic(x0,y+(tip-y)*k,middle+(x0-middle)*k,tip,middle,tip,24);
      cubic(middle-(middle-x1)*k,tip,x1,y+(tip-y)*k,x1,y,24);
    }
  }
  cubic(strandX(0,550),610,107,651,119,680);
  cubic(125,702,146,715,173,715);
  cubic(286,715,489,715,625,715,90);
  cubic(653,715,674,706,683,682);
  base.pop();
  const total=distance;
  export {total as spaceEchoTapeLength};
  export function spaceEchoTapeGeometry(t) {
    t=(t%28)*Math.PI*2/28;
    const deformed=base.map(p=>{
      // Compose monotone horizontal and vertical maps. This lets the folds
      // lean, bunch and exchange room while preserving their planar order.
      const v=(p.y-98)/534;
      const u=Math.max(0,Math.min(1,(p.x-80)/640));
      const fade=Math.max(0,Math.min(1,(p.y-620)/62));
      const mask=1-fade*fade*fade*(fade*(fade*6-15)+10);
      const k=-.4+.25*Math.sin(t*2);
      const packed=Math.expm1(k*u)/Math.expm1(k);
      const bend=44*Math.sin(Math.PI*v)*Math.sin(2.4*v-t*3+.4);
      let x=p.x+mask*((80+640*packed-p.x)+bend*Math.sin(Math.PI*u));
      const travelling=x*.009-t*4;
      const upper=65+52*Math.sin(travelling);
      const lower=60+48*Math.sin(travelling+1.5);
      let y=p.y+mask*(upper*(1-v)-lower*v);
      // A broad, radius-preserving turn gives the loose pack the diagonal
      // lay seen in the clip. The chamber rim and feed points stay fixed.
      const rx=(x-400)/320,ry=(y-360)/285,radius=Math.hypot(rx,ry);
      if(radius<1) {
        const turn=(.55+.08*Math.sin(t*2))*(1-radius*radius)**2;
        const angle=Math.atan2(ry,rx)+turn;
        x=400+320*radius*Math.cos(angle);
        y=360+285*radius*Math.sin(angle);
      }
      return {x,y,s:p.s,mask};
    });
    // Even arc-length spacing keeps smoothing independent of sampling density.
    const lengths=[0];
    for(let i=1;i<=deformed.length;i++) {
      const a=deformed[i-1],b=deformed[i%deformed.length];
      lengths.push(lengths.at(-1)+Math.hypot(b.x-a.x,b.y-a.y));
    }
    const count=Math.ceil(lengths.at(-1)/2),step=lengths.at(-1)/count;
    const samples=[];let segment=0;
    for(let i=0;i<count;i++) {
      const d=i*step;
      while(segment<deformed.length-1&&lengths[segment+1]<d)segment++;
      const a=deformed[segment],b=deformed[(segment+1)%deformed.length];
      const u=(d-lengths[segment])/(lengths[segment+1]-lengths[segment]||1);
      const endS=segment===deformed.length-1?total:b.s;
      samples.push({x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u,s:a.s+(endS-a.s)*u});
    }
    // A fixed physical smoothing radius rounds every bend, including feed
    // transitions. Ribbon width is never changed to hide a tight clearance.
    const pts=samples.map((p,i)=>{
      let x=0,y=0;
      kernel.forEach((w,j)=>{const q=samples[(i+j-18+count)%count];x+=q.x*w;y+=q.y*w;});
      return {x:x/norm,y:y/norm,s:p.s};
    });
    return pts.map((p,i)=>{
      const a=pts[(i+count-1)%count],z=pts[(i+1)%count];
      const dx=z.x-a.x,dy=z.y-a.y,len=Math.hypot(dx,dy)||1;
      const face=(dx*.78+dy*.63)/len;
      return {...p,nx:-dy/len,ny:dx/len,w:13,face};
    });
  }
