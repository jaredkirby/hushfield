import assert from 'node:assert/strict';
import { boundary, containBalls, insideBoundary, makeOrbitState, stepOrbit } from '../dist/orbit-physics.mjs';
const options={points:6,rpm:12,orientation:0,gravity:35,bounce:84};
const makeBalls=()=>[
  {x:.12,y:-.15,vx:.53,vy:.2,hue:0},
  {x:-.2,y:.1,vx:-.34,vy:-.6,hue:1},
  {x:.05,y:.2,vx:.7,vy:-.15,hue:2}
];
function simulate(rpm,seconds,points=6){const state=makeOrbitState(makeBalls()),hits=[];for(let i=0;i<Math.round(seconds*60);i++)stepOrbit(state,{...options,rpm,points},1/60,(edge,ball,t)=>hits.push({edge,hue:ball.hue,time:t}));return {state,hits};}
const stopped=makeOrbitState(makeBalls());const original=structuredClone(stopped.balls);stepOrbit(stopped,{...options,rpm:0},.2,()=>assert.fail('Stopped spin must not trigger notes'));assert.equal(stopped.phase,0);assert.deepEqual(stopped.balls,original.map(b=>({...b,flash:0})));
const turn=simulate(12,5);assert(Math.abs(Math.sin(turn.state.phase))<1e-8&&Math.cos(turn.state.phase)>.999999,'12 RPM completes one revolution in five seconds');
const clockwise=simulate(12,1),counterclockwise=simulate(-12,1);assert(clockwise.state.phase>0&&counterclockwise.state.phase<0,'Negative RPM reverses spin');
const slow=simulate(12,12),fast=simulate(24,6);assert(slow.hits.length>10,'Moving walls must produce ongoing collision notes');assert.equal(fast.hits.length,slow.hits.length,'Double RPM gives the same collision rhythm in half the real time');for(let i=0;i<slow.hits.length;i++){assert.equal(fast.hits[i].edge,slow.hits[i].edge);assert.equal(fast.hits[i].hue,slow.hits[i].hue);assert(Math.abs(fast.hits[i].time-slow.hits[i].time)<1e-8);}
const circle=makeOrbitState([{x:.96,y:0,vx:1,vy:0,hue:0}]);let impacts=0;stepOrbit(circle,{...options,points:0,gravity:0},1/30,()=>impacts++);assert(impacts>0);assert(circle.balls[0].vx<0,'Circle wall reflects a ball inward');assert(Math.abs(circle.balls[0].vy)>.01,'Rotating wall transfers tangential motion');
for(const points of [0,3,4,5,6,8,12]){for(const rpm of [-60,12,60]){const state=makeOrbitState(makeBalls());for(let i=0;i<1800;i++){stepOrbit(state,{...options,points,rpm},1/60);for(const b of state.balls){assert([b.x,b.y,b.vx,b.vy].every(Number.isFinite),`Finite ball at ${points}/${rpm}`);assert(insideBoundary(b,points,state.phase,1e-4),`Ball contained at ${points}/${rpm}`);}}}}
const reshaped=makeOrbitState([{x:.85,y:.1,vx:.3,vy:.2}]);const reference=reshaped.balls[0];containBalls(reshaped,{...options,points:3});assert.equal(reshaped.balls[0],reference,'Shape edits preserve ball identity');assert(insideBoundary(reference,3));assert.equal(boundary(0).length,0);assert.equal(boundary(7).length,7);
console.log(`PASS: circle collision, moving-wall coupling, continuous signed RPM, spin stop, rhythm scaling (${slow.hits.length} hits), long-run containment, shape edits preserve balls.`);

function wallClearance(ball,points,angle){if(!points)return 1-.035-Math.hypot(ball.x,ball.y);const vertices=boundary(points,angle);return Math.min(...vertices.map((a,i)=>{const b=vertices[(i+1)%vertices.length],dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);return (ball.x-a.x)*(-dy/length)+(ball.y-a.y)*(dx/length)-.035;}));}
// Containment alone used to pass even when balls rode along the wall forever.
// Every ball must leave the boundary band in every five-second observation window.
let sustainedCases=0,worstWallStreak=0;
for(const points of [0,3,4,6,12])for(const gravity of [0,35,100])for(const bounce of [30,84,100])for(const rpm of [-12,12]){
  const state=makeOrbitState(makeBalls());let windowClearance=[0,0,0],wallStreak=[0,0,0],longestStreak=0;
  for(let frame=0;frame<120*60;frame++){
    stepOrbit(state,{...options,points,gravity,bounce,rpm},1/60);
    state.balls.forEach((ball,i)=>{const clearance=wallClearance(ball,points,state.phase);windowClearance[i]=Math.max(windowClearance[i],clearance);wallStreak[i]=clearance<.04?wallStreak[i]+1/60:0;longestStreak=Math.max(longestStreak,wallStreak[i]);});
    if((frame+1)%300===0){for(const clearance of windowClearance)assert(clearance>.04,`Ball stuck at wall: shape ${points}, gravity ${gravity}, bounce ${bounce}, RPM ${rpm}, t=${(frame+1)/60}s`);windowClearance=[0,0,0];}
  }
  assert(longestStreak<3,`Ball hugged shape ${points} for ${longestStreak.toFixed(2)}s`);
  worstWallStreak=Math.max(worstWallStreak,longestStreak);sustainedCases++;
}
console.log(`PASS: ${sustainedCases} two-minute runs repeatedly leave the wall; longest boundary-band residence ${worstWallStreak.toFixed(3)}s.`);
