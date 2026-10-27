export const TAPE_WHEELS = [{x:117,y:364,radius:32},{x:591,y:364,radius:32}];
export const TAPE_HEAD_POSES = [
  {x:240,y:438,angle:Math.PI/15},
  {x:354,y:452,angle:0},
  {x:468,y:438,angle:-Math.PI/15}
];

const supports = [
  {x:TAPE_WHEELS[0].x,y:396,angle:0}, ...TAPE_HEAD_POSES,
  {x:TAPE_WHEELS[1].x,y:396,angle:0}
];
export const TAPE_SUPPORT_X = supports.map(point => point.x);

// Straight outer spans lead into the tilted heads, with a smooth curve
// across the lower centre head.
export function tapeHeadPath(x) {
  for (let i=1;i<supports.length;i++) {
    const a=supports[i-1],b=supports[i];
    if(x>b.x&&i<supports.length-1)continue;
    const span=b.x-a.x,t=Math.max(0,Math.min(1,(x-a.x)/span)),t2=t*t,t3=t2*t;
    if(i===1||i===supports.length-1)return a.y+(b.y-a.y)*t;
    return (2*t3-3*t2+1)*a.y+(t3-2*t2+t)*span*Math.tan(a.angle)
      +(-2*t3+3*t2)*b.y+(t3-t2)*span*Math.tan(b.angle);
  }
}
