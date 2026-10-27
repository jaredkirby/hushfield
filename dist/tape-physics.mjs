// Elastic tape model from the approved Space Echo simulation.
// Length, bending, capsule contacts, and continuous crossing rejection run
// independently of rendering and audio. World coordinates are 720 by 470.
import { TAPE_WHEELS } from './tape-mechanism.mjs';
export { TAPE_WHEELS } from './tape-mechanism.mjs';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
export class TapeLoop {
    constructor(snapshot = null) {
      this.path = [];
      const add = (x,y) => this.path.push({x,y});
      const cubic = (a,b,c,d,n=40) => {
        for(let i=1;i<=n;i++) {
          const t=i/n,u=1-t;
          add(u*u*u*a[0]+3*u*u*t*b[0]+3*u*t*t*c[0]+t*t*t*d[0],u*u*u*a[1]+3*u*u*t*b[1]+3*u*t*t*c[1]+t*t*t*d[1]);
        }
      };
      const arc = (wheel, from, to) => {
        for(let i=1;i<=32;i++) {
          const a=mix(from,to,i/32);
          add(wheel.x+Math.cos(a)*wheel.radius,wheel.y+Math.sin(a)*wheel.radius);
        }
      };
      // The only guided section is the wrap around the wheels and the
      // lower head run. Free tape begins at each wheel's upper tangent.
      const [left,right]=TAPE_WHEELS;
      const entry=[left.x,left.y-left.radius],exit=[right.x,right.y-right.radius];
      const lowerY=left.y+left.radius;
      add(...entry);
      arc(left,-Math.PI/2,-3*Math.PI/2);
      cubic([left.x,lowerY],[230,lowerY],[490,lowerY],[right.x,lowerY],100);
      arc(right,Math.PI/2,-Math.PI/2);
      this.dist=[0];
      for(let i=1;i<this.path.length;i++)this.dist[i]=this.dist[i-1]+Math.hypot(this.path[i].x-this.path[i-1].x,this.path[i].y-this.path[i-1].y);
      this.transportLength=this.dist.at(-1);
      const start=this.path.length-1;
      const knots=[exit,[exit[0]-46,exit[1]-7],[470,282],[180,278],[115,247],[150,220],[355,235],[560,244],[621,214],[589,185],[380,192],[180,189],[120,157],[157,131],[365,145],[552,160],[612,132],[572,100],[365,108],[165,105],[91,90],[78,165],[79,260],[entry[0]+33,entry[1]-24],entry];
      // Catmull-Rom initialization only. Subsequent shapes come from physics.
      for(let k=0;k<knots.length-1;k++) {
        const a=knots[Math.max(0,k-1)],b=knots[k],c=knots[k+1],d=knots[Math.min(knots.length-1,k+2)];
        for(let j=1;j<=22;j++) {
          const t=j/22,t2=t*t,t3=t2*t;
          add(.5*(2*b[0]+(-a[0]+c[0])*t+(2*a[0]-5*b[0]+4*c[0]-d[0])*t2+(-a[0]+3*b[0]-3*c[0]+d[0])*t3),.5*(2*b[1]+(-a[1]+c[1])*t+(2*a[1]-5*b[1]+4*c[1]-d[1])*t2+(-a[1]+3*b[1]-3*c[1]+d[1])*t3));
        }
      }
      for(let i=start+1;i<this.path.length;i++)this.dist[i]=this.dist[i-1]+Math.hypot(this.path[i].x-this.path[i-1].x,this.path[i].y-this.path[i-1].y);
      this.length=this.dist.at(-1);this.n=Math.round(this.length/6);this.rest=this.length/this.n;
      this.x=new Float64Array(this.n);this.y=new Float64Array(this.n);
      this.px=new Float64Array(this.n);this.py=new Float64Array(this.n);
      this.weight=new Float64Array(this.n);this.s=new Float64Array(this.n);
      this.travel=0;this.time=0;this.velocity=0;this.grab=null;this.lastDt=1/120;this.rejectedSteps=0;
      for(let i=0;i<this.n;i++) {const p=this.sample(i*this.rest);this.x[i]=this.px[i]=p.x;this.y[i]=this.py[i]=p.y;this.weight[i]=i*this.rest<this.transportLength?0:1;}
      if(snapshot)this.restoreSnapshot(snapshot);
    }
    restoreSnapshot(snapshot) {
      // A saved shape is tied to this material length and guide geometry.
      // Fall back to the generated loop if a future mechanism no longer fits.
      if(snapshot.version!==1||snapshot.x?.length!==this.n||snapshot.y?.length!==this.n
        ||!(Math.abs(snapshot.length-this.length)<=1e-6)||!(Math.abs(snapshot.transportLength-this.transportLength)<=1e-6)
        ||!Number.isFinite(snapshot.travel)||snapshot.travel<0
        ||!snapshot.x.every(Number.isFinite)||!snapshot.y.every(Number.isFinite))return false;
      this.x.set(snapshot.x);this.y.set(snapshot.y);
      // Load paused, with no residual velocity or elapsed-time catch-up.
      this.px.set(this.x);this.py.set(this.y);
      this.travel=snapshot.travel;this.velocity=0;this.time=0;this.lastDt=1/120;
      for(let i=0;i<this.n;i++) {
        this.s[i]=(i*this.rest+this.travel)%this.length;
        this.weight[i]=this.s[i]<this.transportLength?0:1;
      }
      return true;
    }
    sample(s) {
      let lo=0,hi=this.dist.length-1;
      while(hi-lo>1){const m=(lo+hi)>>1;if(this.dist[m]<s)lo=m;else hi=m;}
      const t=(s-this.dist[lo])/(this.dist[hi]-this.dist[lo]||1);
      return {x:mix(this.path[lo].x,this.path[hi].x,t),y:mix(this.path[lo].y,this.path[hi].y,t)};
    }
    distance(i,j,target,strength,minimum=false) {
      const dx=this.x[j]-this.x[i],dy=this.y[j]-this.y[i],d=Math.hypot(dx,dy);
      const wi=this.weight[i],wj=this.weight[j],w=wi+wj;
      if(!w||d<1e-8||(minimum&&d>=target))return;
      const f=(d-target)/d*strength/w;
      this.x[i]+=dx*f*wi;this.y[i]+=dy*f*wi;
      this.x[j]-=dx*f*wj;this.y[j]-=dy*f*wj;
    }
    pairs(padding=13,swept=false) {
      const buckets=new Map(), seen=new Set(), pairs=[], size=24, n=this.n;
      for(let i=0;i<n;i++) {
        const j=(i+1)%n;
        let lx=Math.min(this.x[i],this.x[j]),hx=Math.max(this.x[i],this.x[j]);
        let ly=Math.min(this.y[i],this.y[j]),hy=Math.max(this.y[i],this.y[j]);
        if(swept) {lx=Math.min(lx,this.sx[i],this.sx[j]);hx=Math.max(hx,this.sx[i],this.sx[j]);ly=Math.min(ly,this.sy[i],this.sy[j]);hy=Math.max(hy,this.sy[i],this.sy[j]);}
        for(let cy=Math.floor((ly-padding)/size);cy<=Math.floor((hy+padding)/size);cy++)
        for(let cx=Math.floor((lx-padding)/size);cx<=Math.floor((hx+padding)/size);cx++) {
          const key=cx+128*cy;
          let bucket=buckets.get(key);if(!bucket){bucket=[];buckets.set(key,bucket);}
          for(const k of bucket) {
            const sep=Math.min(i-k,n-i+k);if(sep<=3)continue;
            if(!this.weight[i]&&!this.weight[j]&&!this.weight[k]&&!this.weight[(k+1)%n])continue;
            const id=k*n+i;if(seen.has(id))continue;seen.add(id);
            const l=(k+1)%n;
            let klx=Math.min(this.x[k],this.x[l]),khx=Math.max(this.x[k],this.x[l]),kly=Math.min(this.y[k],this.y[l]),khy=Math.max(this.y[k],this.y[l]);
            if(swept){klx=Math.min(klx,this.sx[k],this.sx[l]);khx=Math.max(khx,this.sx[k],this.sx[l]);kly=Math.min(kly,this.sy[k],this.sy[l]);khy=Math.max(khy,this.sy[k],this.sy[l]);}
            if(lx>khx+padding||hx<klx-padding||ly>khy+padding||hy<kly-padding)continue;
            pairs.push([k,i]);
          }
          bucket.push(i);
        }
      }
      return pairs;
    }
    closest(i,j) {
      const k=(i+1)%this.n,l=(j+1)%this.n;
      const ux=this.x[k]-this.x[i],uy=this.y[k]-this.y[i],vx=this.x[l]-this.x[j],vy=this.y[l]-this.y[j];
      const rx=this.x[i]-this.x[j],ry=this.y[i]-this.y[j];
      const a=ux*ux+uy*uy,e=vx*vx+vy*vy,b=ux*vx+uy*vy,c=ux*rx+uy*ry,f=vx*rx+vy*ry;
      let s=0,t=0;
      if(a<1e-12)t=clamp(f/(e||1),0,1);
      else if(e<1e-12)s=clamp(-c/a,0,1);
      else {
        const den=a*e-b*b;
        s=den>1e-10?clamp((b*f-c*e)/den,0,1):0;
        t=(b*s+f)/e;
        if(t<0){t=0;s=clamp(-c/a,0,1);}else if(t>1){t=1;s=clamp((b-c)/a,0,1);}
      }
      const dx=rx+s*ux-t*vx,dy=ry+s*uy-t*vy;
      return {s,t,dx,dy,d:Math.sqrt(dx*dx+dy*dy)};
    }
    contacts(pairs) {
      const gap=12;
      for(const [i,j] of pairs) {
        const q=this.closest(i,j);if(q.d>=gap)continue;
        const a=(i+1)%this.n,b=(j+1)%this.n;
        let nx=q.dx,ny=q.dy;
        if(q.d<1e-6) {
          // Keep the two strips on the same side they occupied before the step.
          nx=mix(this.sx[i],this.sx[a],q.s)-mix(this.sx[j],this.sx[b],q.t);
          ny=mix(this.sy[i],this.sy[a],q.s)-mix(this.sy[j],this.sy[b],q.t);
        }
        const norm=Math.hypot(nx,ny);if(norm<1e-9)continue;nx/=norm;ny/=norm;
        const ids=[i,a,j,b], coeff=[1-q.s,q.s,q.t-1,-q.t];
        let w=0;for(let k=0;k<4;k++)w+=this.weight[ids[k]]*coeff[k]*coeff[k];
        if(!w)continue;
        const impulse=(gap-(q.dx*nx+q.dy*ny))/w;
        for(let k=0;k<4;k++){const c=impulse*this.weight[ids[k]]*coeff[k];this.x[ids[k]]+=c*nx;this.y[ids[k]]+=c*ny;}
      }
    }
    bending(i,stiffness,maxAngle) {
      const b=(i+1)%this.n,c=(i+2)%this.n;
      const ux=this.x[b]-this.x[i],uy=this.y[b]-this.y[i],vx=this.x[c]-this.x[b],vy=this.y[c]-this.y[b];
      const u2=ux*ux+uy*uy,v2=vx*vx+vy*vy;if(u2<1e-8||v2<1e-8)return;
      const angle=Math.atan2(ux*vy-uy*vx,ux*vx+uy*vy);
      const limit=clamp(angle,-maxAngle,maxAngle);
      const correction=(angle-limit)+(angle===limit?angle*stiffness:0);
      const ax=-uy/u2,ay=ux/u2,cx=-vy/v2,cy=vx/v2,bx=-ax-cx,by=-ay-cy;
      const wa=this.weight[i],wb=this.weight[b],wc=this.weight[c];
      const w=wa*(ax*ax+ay*ay)+wb*(bx*bx+by*by)+wc*(cx*cx+cy*cy);if(!w)return;
      const lambda=-correction/w;
      this.x[i]+=lambda*wa*ax;this.y[i]+=lambda*wa*ay;
      this.x[b]+=lambda*wb*bx;this.y[b]+=lambda*wb*by;
      this.x[c]+=lambda*wc*cx;this.y[c]+=lambda*wc*cy;
    }
    crossesDuringStep() {
      const cross=(ax,ay,bx,by)=>ax*by-ay*bx;
      const hit=(p,a,b)=>{
        const ux=this.sx[p]-this.sx[a],uy=this.sy[p]-this.sy[a];
        const vx=this.sx[b]-this.sx[a],vy=this.sy[b]-this.sy[a];
        const dux=this.x[p]-this.x[a]-ux,duy=this.y[p]-this.y[a]-uy;
        const dvx=this.x[b]-this.x[a]-vx,dvy=this.y[b]-this.y[a]-vy;
        const A=cross(dux,duy,dvx,dvy),B=cross(dux,duy,vx,vy)+cross(ux,uy,dvx,dvy),C=cross(ux,uy,vx,vy);
        let roots=[];
        if(Math.abs(A)<1e-10){if(Math.abs(B)>1e-10)roots=[-C/B];}
        else {const disc=B*B-4*A*C;if(disc>=0){const r=Math.sqrt(disc);roots=[(-B-r)/(2*A),(-B+r)/(2*A)];}}
        for(const t of roots)if(t>1e-8&&t<=1) {
          const ex=vx+t*dvx,ey=vy+t*dvy,px=ux+t*dux,py=uy+t*duy;
          const projection=(px*ex+py*ey)/(ex*ex+ey*ey);
          if(projection>=0&&projection<=1)return true;
        }
        return false;
      };
      for(const [i,j] of this.pairs(.01,true)) {
        const a=(i+1)%this.n,b=(j+1)%this.n;
        if(this.closest(i,j).d<1e-6)return true;
        if(hit(i,j,b)||hit(a,j,b)||hit(j,i,a)||hit(b,i,a))return true;
      }
      return false;
    }
    step(dt,speed,bend,drag=.5,depth=0) {
      const old={x:this.x.slice(),y:this.y.slice(),px:this.px.slice(),py:this.py.slice(),travel:this.travel,velocity:this.velocity,time:this.time,lastDt:this.lastDt};
      this.sx=old.x;this.sy=old.y;
      this.integrate(dt,speed,bend,drag);
      if(!this.crossesDuringStep())return;
      this.x.set(old.x);this.y.set(old.y);this.px.set(old.px);this.py.set(old.py);
      this.travel=old.travel;this.velocity=old.velocity;this.time=old.time;this.lastDt=old.lastDt;
      for(let i=0;i<this.n;i++){this.s[i]=(i*this.rest+this.travel)%this.length;this.weight[i]=this.s[i]<this.transportLength?0:1;}
      this.rejectedSteps++;
      if(depth<3) {this.step(dt/2,speed,bend,drag,depth+1);this.step(dt/2,speed,bend,drag,depth+1);}
      else {this.px.set(this.x);this.py.set(this.y);this.velocity=0;}
    }
    integrate(dt,speed,bend,drag=.5) {
      this.time+=dt;
      this.velocity+=(65*speed-this.velocity)*(1-Math.exp(-dt*5));
      this.travel+=this.velocity*dt;
      // Low tray drag lets the driven strand move the loose bunch, while
      // contact constraints still keep neighbouring strips separated.
      const n=this.n, r=this.rest, damp=Math.exp(-dt*drag);
      for(let i=0;i<n;i++) {
        const s=(i*r+this.travel)%this.length;this.s[i]=s;
        if(s<this.transportLength) {
          const p=this.sample(s);this.weight[i]=0;
          this.px[i]=this.x[i];this.py[i]=this.y[i];this.x[i]=p.x;this.y[i]=p.y;
        } else {
          this.weight[i]=1;
          const x=this.x[i],y=this.y[i],scale=dt/this.lastDt;
          this.x[i]+=clamp((x-this.px[i])*scale*damp,-2,2);this.y[i]+=clamp((y-this.py[i])*scale*damp,-2,2);
          this.px[i]=x;this.py[i]=y;
        }
      }
      this.lastDt=dt;
      let candidates=this.pairs(16);
      // Bending constraints also span the pinned/free boundary, preserving
      // the tangent and curvature as each material point leaves the guide.
      for(let pass=0;pass<42;pass++) {
        for(let k=0;k<n;k++) {
          const i=pass%2?k:n-1-k;
          this.bending(i,.025+bend*.07,.23-bend*.07);
        }
        for(let k=0;k<n;k++) {const i=pass%2?k:n-1-k;this.distance(i,(i+1)%n,r,1);}

        for(let i=0;i<n;i++)if(this.weight[i]) {
          this.x[i]=clamp(this.x[i],65,655);this.y[i]=clamp(this.y[i],76,361);
          for(const wheel of TAPE_WHEELS) {
            const dx=this.x[i]-wheel.x,dy=this.y[i]-wheel.y,d=Math.hypot(dx,dy);
            if(d<wheel.radius&&d>1e-8) {
              this.x[i]=wheel.x+dx*wheel.radius/d;
              this.y[i]=wheel.y+dy*wheel.radius/d;
            }
          }
        }
        if(this.grab) {
          const g=this.grab;
          if(this.weight[g.i]) {this.x[g.i]+=clamp(g.x-this.x[g.i],-2,2)*.18;this.y[g.i]+=clamp(g.y-this.y[g.i],-2,2)*.18;}
        }
        if(pass%6===0)candidates=this.pairs(16);
        this.contacts(candidates);
        // Contacts can reintroduce a corner after the bending pass. Give
        // crowded folds extra settling passes instead of stiffening a
        // length of tape beyond the wheel.
        if(pass>=17&&(pass+1)%6===0) {
          let settled=true;
          for(let i=0;i<n;i++) {
            const b=(i+1)%n,c=(i+2)%n;
            if(!this.weight[i]&&!this.weight[b]&&!this.weight[c])continue;
            const ux=this.x[b]-this.x[i],uy=this.y[b]-this.y[i],vx=this.x[c]-this.x[b],vy=this.y[c]-this.y[b];
            if(Math.abs(Math.atan2(ux*vy-uy*vx,ux*vx+uy*vy))>.27){settled=false;break;}
          }
          if(settled)break;
        }
      }
    }
    health() {
      let max=0,total=0,finite=true;
      for(let i=0;i<this.n;i++) {
        const j=(i+1)%this.n,d=Math.hypot(this.x[j]-this.x[i],this.y[j]-this.y[i]);
        max=Math.max(max,Math.abs(d-this.rest)/this.rest);total+=d;
        finite=finite&&Number.isFinite(this.x[i])&&Number.isFinite(this.y[i]);
      }
      return {finite,particles:this.n,lengthError:Math.abs(total-this.length)/this.length,maxSegmentError:max,travel:this.travel,rejectedSteps:this.rejectedSteps};
    }
  }
