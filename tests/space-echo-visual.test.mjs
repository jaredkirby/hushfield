import test from 'node:test';
import assert from 'node:assert/strict';
import {spaceEchoTapePath} from '../dist/space-echo-visual.mjs';
import {spaceEchoTapeGeometry} from '../dist/space-echo-geometry.mjs';

function overlap(a,b) {
  for(const poly of [a,b])for(let i=0;i<4;i++) {
    const p=poly[i],q=poly[(i+1)%4],nx=p[1]-q[1],ny=q[0]-p[0];
    let amin=Infinity,amax=-Infinity,bmin=Infinity,bmax=-Infinity;
    for(const v of a){const d=v[0]*nx+v[1]*ny;amin=Math.min(amin,d);amax=Math.max(amax,d);}
    for(const v of b){const d=v[0]*nx+v[1]*ny;bmin=Math.min(bmin,d);bmax=Math.max(bmax,d);}
    if(amax<=bmin+1e-8||bmax<=amin+1e-8)return false;
  }
  return true;
}
function ribbonFace(a,b) {
  return [[a.x+a.nx*a.w/2,a.y+a.ny*a.w/2],[b.x+b.nx*b.w/2,b.y+b.ny*b.w/2],
    [b.x-b.nx*b.w/2,b.y-b.ny*b.w/2],[a.x-a.nx*a.w/2,a.y-a.ny*a.w/2]];
}
function checkFrame(points,time) {
  points=points.filter((_,i)=>i%2===0);
  // Match the renderer sampling and check faces too: a crossing-free centre line alone is insufficient.
  const buckets=new Map(),cell=28,total=points.at(-1).s;
  const faces=points.map((a,i)=>ribbonFace(a,points[(i+1)%points.length]));
  for(let i=0;i<points.length;i++) {
    const p=points[i],gx=Math.floor(p.x/cell),gy=Math.floor(p.y/cell);
    assert.equal(p.w,13,'constant ribbon width');
    assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=60&&p.x<=740&&p.y>=60&&p.y<=720,'tape stays in the chamber');
    const a=points[(i+points.length-1)%points.length],b=points[(i+1)%points.length];
    const dx=p.x-a.x,dy=p.y-a.y,ex=b.x-p.x,ey=b.y-p.y;
    const area=Math.abs(dx*ey-dy*ex);
    const radius=Math.hypot(dx,dy)*Math.hypot(ex,ey)*Math.hypot(b.x-a.x,b.y-a.y)/(2*area||1e-10);
    assert.ok(radius>7,`no small kinks at ${time}s, radius ${radius}`);
    for(let ox=-1;ox<=1;ox++)for(let oy=-1;oy<=1;oy++) {
      for(const j of buckets.get(`${gx+ox},${gy+oy}`)||[]) {
        const q=points[j],along=Math.abs(q.s-p.s);
        if(Math.min(along,total-along)<48)continue;
        assert.equal(overlap(faces[i],faces[j]),false,`ribbon overlap at ${time}s, ${i}/${j}`);
      }
    }
    const key=`${gx},${gy}`;
    if(!buckets.has(key))buckets.set(key,[]);
    buckets.get(key).push(i);
  }
}

test('the constant-width ribbon stays smooth and avoids face overlaps through a full motion cycle',()=>{
  for(let frame=0;frame<=112;frame++)checkFrame(spaceEchoTapeGeometry(frame/4),frame/4);
});

test('folds move while the taut head run stays at the bottom, and the shape loop joins seamlessly',()=>{
  const before=spaceEchoTapeGeometry(0),after=spaceEchoTapeGeometry(5);
  let moved=0,j=0;
  for(const p of before) {
    while(j<after.length-1&&after[j].s<p.s)j++;
    if(p.y<620&&Math.hypot(p.x-after[j].x,p.y-after[j].y)>20)moved++;
  }
  assert.ok(moved>500,'a substantial length of loose tape shifts');
  for(const points of [before,after]) {
    const head=points.filter(p=>p.x>220&&p.x<580&&p.y>700);
    assert.ok(head.length>170,'the tape spans the lower head assembly');
    for(const p of head)assert.ok(Math.abs(p.y-715)<1e-9,'taut head run stays straight');
  }
  assert.deepEqual(spaceEchoTapeGeometry(28),before,'the 28 second shape cycle closes exactly');
});

test('zero and maximum character settings keep a finite continuous closed tape path',()=>{
  for(const p of [{tapeOn:true,wow:0,flutter:0},{tapeOn:true,wow:100,flutter:100},{tapeOn:false,wow:100,flutter:100}]) {
    const points=spaceEchoTapePath(p,8,3);
    assert.deepEqual(points[0],points.at(-1));
    for(const [x,y] of points)assert.ok(Number.isFinite(x)&&Number.isFinite(y));
  }
});
