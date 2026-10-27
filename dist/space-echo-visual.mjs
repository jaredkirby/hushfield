import {spaceEchoTapeGeometry} from './space-echo-geometry.mjs';
import {tapeWow, tapeFlutter} from './tape-motion.mjs';

// One common time offset modulates the entire contour, avoiding local kinks.
function tapeTime(p, angle, seconds) {
  return angle / 1.6 + (p.tapeOn ? tapeWow(seconds, p.wow / 100) * 3 + tapeFlutter(seconds, p.flutter / 100) * 3 : 0);
}
export function spaceEchoTapePath(p, angle, seconds = 0) {
  const points = spaceEchoTapeGeometry(tapeTime(p, angle, seconds)).map(({x, y}) => [x, y]);
  return [...points, points[0]];
}

// Keep the previous study path available; the instrument uses the physical loop.
export { drawPhysicsTape as drawSpaceEcho } from './tape-physics-visual.mjs';
