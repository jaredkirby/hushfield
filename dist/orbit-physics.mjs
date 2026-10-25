// Independent ORBIT-style rotating-boundary model. Distances use a unit radius.
export const BALL_RADIUS = 0.035;
const STEP = 1 / 240;
const BASE_RPM = 12;
const TAU = Math.PI * 2;
const MAX_SPEED = 5;
const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));

export function shapePoints(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 3 ? clamp(Math.round(n), 3, 12) : 0;
}

export function boundary(points, angle = 0) {
  points = shapePoints(points);
  if (!points) return [];
  return Array.from({ length: points }, (_, i) => {
    const a = -Math.PI / 2 + i * TAU / points + angle;
    return { x: Math.cos(a), y: Math.sin(a) };
  });
}

export function makeOrbitState(balls = []) {
  return { balls, phase: 0, elapsed: 0, accumulator: 0, collisions: 0 };
}

function contactList(ball, points, angle) {
  if (!shapePoints(points)) {
    const distance = Math.hypot(ball.x, ball.y);
    if (distance <= 1 - BALL_RADIUS) return [];
    const ux = distance ? ball.x / distance : 1;
    const uy = distance ? ball.y / distance : 0;
    return [{ nx: -ux, ny: -uy, penetration: distance - (1 - BALL_RADIUS), edge: Math.floor(((Math.atan2(ball.y, ball.x) - angle + Math.PI / 2 + TAU * 4) % TAU) / TAU * 12), x: ux, y: uy }];
  }
  const vertices = boundary(points, angle);
  const result = [];
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i], b = vertices[(i + 1) % vertices.length];
    const dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy);
    const nx = -dy / length, ny = dx / length;
    const distance = (ball.x - a.x) * nx + (ball.y - a.y) * ny;
    if (distance < BALL_RADIUS) result.push({ nx, ny, penetration: BALL_RADIUS - distance, edge: i, x: ball.x - nx * distance, y: ball.y - ny * distance });
  }
  return result;
}

// Shape edits retain the existing balls and keep them within the new boundary.
export function containBalls(state, options) {
  const angle = state.phase + (options.orientation || 0) * Math.PI / 180;
  for (const ball of state.balls) {
    for (let pass = 0; pass < 12; pass++) {
      const contacts = contactList(ball, options.points, angle);
      if (!contacts.length) break;
      for (const c of contacts) {
        ball.x += c.nx * (c.penetration + 1e-5);
        ball.y += c.ny * (c.penetration + 1e-5);
      }
    }
  }
}

export function insideBoundary(ball, points, angle = 0, tolerance = 1e-5) {
  return contactList(ball, points, angle).every(c => c.penetration <= tolerance);
}

// Spin drives the entire simulation clock: twice the RPM gives the same collision
// sequence in half the wall time. Collision impulses include moving wall velocity.
export function stepOrbit(state, options, wallSeconds, onCollision = () => {}) {
  const rpm = clamp(Number(options.rpm) || 0, -60, 60);
  const scale = Math.abs(rpm) / BASE_RPM;
  const duration = clamp(Number(wallSeconds) || 0, 0, 0.25);
  for (const ball of state.balls) ball.flash = Math.max(0, (ball.flash || 0) - duration * 3);
  if (!scale || !duration) return boundary(options.points, state.phase + (options.orientation || 0) * Math.PI / 180);
  const angularVelocity = Math.sign(rpm) * TAU * BASE_RPM / 60;
  const gravity = clamp(options.gravity ?? 35, 0, 100) / 100 * 1.5;
  const bounce = clamp(options.bounce ?? 84, 30, 100) / 100;
  state.accumulator += duration * scale;
  let steps = 0;
  while (state.accumulator + 1e-10 >= STEP && steps++ < 320) {
    state.accumulator -= STEP;
    state.elapsed += STEP;
    state.phase = (state.phase + angularVelocity * STEP) % TAU;
    const angle = state.phase + (options.orientation || 0) * Math.PI / 180;
    for (const ball of state.balls) {
      ball.vy += gravity * STEP;
      ball.x += ball.vx * STEP;
      ball.y += ball.vy * STEP;
      for (let pass = 0; pass < 8; pass++) {
        const contacts = contactList(ball, options.points, angle);
        if (!contacts.length) break;
        for (const c of contacts) {
          ball.x += c.nx * (c.penetration + 1e-5);
          ball.y += c.ny * (c.penetration + 1e-5);
          // Rotation around the origin: v_wall = omega cross contact_position.
          const wallX = -angularVelocity * c.y, wallY = angularVelocity * c.x;
          let relativeX = ball.vx - wallX, relativeY = ball.vy - wallY;
          const normalSpeed = relativeX * c.nx + relativeY * c.ny;
          if (normalSpeed >= 0) continue;
          // This is a sustained musical instrument: weak impacts must not decay
          // into endless grazing contacts. Bounce still controls strong impacts.
          const rebound = Math.max(-normalSpeed * bounce, 0.55 + 0.35 * bounce);
          relativeX += (rebound - normalSpeed) * c.nx;
          relativeY += (rebound - normalSpeed) * c.ny;
          // Light coupling keeps the circle responsive without gluing balls to it.
          const tangentX = -c.ny, tangentY = c.nx;
          const tangentSpeed = relativeX * tangentX + relativeY * tangentY;
          relativeX -= tangentSpeed * tangentX * 0.015;
          relativeY -= tangentSpeed * tangentY * 0.015;
          ball.vx = relativeX + wallX;
          ball.vy = relativeY + wallY;
          const speed = Math.hypot(ball.vx, ball.vy);
          if (speed > MAX_SPEED) { ball.vx *= MAX_SPEED / speed; ball.vy *= MAX_SPEED / speed; }
          if (state.elapsed - (ball.lastImpact ?? -Infinity) >= 0.055) {
            ball.lastImpact = state.elapsed;
            ball.flash = 1;
            state.collisions++;
            onCollision(c.edge, ball, state.elapsed);
          }
        }
      }
    }
  }
  return boundary(options.points, state.phase + (options.orientation || 0) * Math.PI / 180);
}
