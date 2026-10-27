import { TapeLoop, TAPE_WHEELS } from './tape-physics.mjs';
import { tapeVisualState, tapeHeadOffset } from './tape-visual-state.mjs';
import { TAPE_HEAD_POSES, tapeHeadPath } from './tape-mechanism.mjs';
import { tapeWow, tapeFlutter } from './tape-motion.mjs';
import { TAPE_INITIAL_STATE } from './tape-initial-state.mjs';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const transports = new WeakMap();

function drawTapeAfterglow(c, transport, motion, dt, moving, amount) {
  if (!transport.afterglow) {
    const canvas = c.canvas.ownerDocument.createElement('canvas');
    canvas.width = 720; canvas.height = 520;
    transport.afterglow = canvas;
  }
  const canvas = transport.afterglow, glow = canvas.getContext('2d');
  if (!amount || !motion.on) {
    glow.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }
  // Use the Texture scope's exponential fade with a shorter tape afterglow,
  // so fast flutter stays distinct. Keep this buffer grayscale before dithering.
  glow.globalCompositeOperation = 'destination-out';
  const decaySeconds = (.035 + amount * .006) * .35;
  glow.fillStyle = `rgba(0,0,0,${1 - Math.exp(-clamp(dt, .001, .1) / decaySeconds)})`;
  glow.fillRect(0, 0, canvas.width, canvas.height);
  glow.globalCompositeOperation = 'source-over';
  if (moving && (motion.wow > 0 || motion.flutter > 0 || motion.waveform?.some(value => Math.abs(value) > .0001))) {
    glow.strokeStyle = '#bbb'; glow.lineWidth = 1;
    for (const edge of [-11, 0]) {
      glow.beginPath();
      const start = TAPE_WHEELS[0].x, end = TAPE_WHEELS[1].x;
      for (let x = start; x <= end; x += 2) {
        const y = tapeHeadPath(x) + tapeHeadOffset(x, motion) + edge;
        x === start ? glow.moveTo(x, y) : glow.lineTo(x, y);
      }
      glow.stroke();
    }
  }
  c.drawImage(canvas, 0, 0);
}

export class TapeVisualTransport {
  constructor() {
    this.tape = new TapeLoop(TAPE_INITIAL_STATE);
    this.accumulator = 0;
    this.seconds = 0;
    this.waveform = new Float32Array(32);
  }
  advance(dt, moving, motion) {
    if (!moving) { this.accumulator = 0; return; }
    this.seconds = motion.seconds;
    const follow = 1 - Math.exp(-clamp(dt, 0, .05) / .06);
    for (let i = 0; i < this.waveform.length; i++) {
      this.waveform[i] += ((motion.waveform?.[i] || 0) - this.waveform[i]) * follow;
    }
    // Delay is inversely proportional to tape speed. The derivative of the
    // DSP's delay modulation gives the corresponding speed fluctuation.
    const modulation = t => tapeWow(t, motion.wow) + tapeFlutter(t, motion.flutter);
    const pitch = clamp(1 - (modulation(motion.seconds + .001) - modulation(motion.seconds - .001)) / .002, .75, 1.25);
    const speed = clamp(.36 / motion.delayTime * pitch, .25, 2);
    this.accumulator += clamp(dt, 0, .05);
    while (this.accumulator >= 1 / 120) {
      this.tape.step(1 / 120, speed, .8);
      this.accumulator -= 1 / 120;
    }
  }
}

function roller(c, x, y, radius, travel, on, face = false) {
  c.save(); c.translate(x, y + 2);
  // Centre the eleven-pixel tape on the sidewall, with a small lip above
  // and below it. Draw the body behind the tape and the top face in front.
  const depth = 15;
  if (!face) {
    c.fillStyle = '#000'; c.strokeStyle = on ? '#bbb' : '#555'; c.lineWidth = 1.3;
    c.beginPath(); c.moveTo(radius, -depth); c.lineTo(radius, 0);
    c.arc(0, 0, radius, 0, Math.PI);
    c.lineTo(-radius, -depth); c.arc(0, -depth, radius, Math.PI, 0, true);
    c.closePath(); c.fill(); c.stroke();
    c.restore(); return;
  }
  c.translate(0, -depth);
  // Black only masks hidden tape; the wheel surfaces are drawn as outlines.
  c.fillStyle = '#000'; c.strokeStyle = on ? '#eee' : '#777'; c.lineWidth = 1.3;
  c.beginPath(); c.arc(0, 0, radius, 0, Math.PI * 2); c.fill(); c.stroke();
  c.beginPath(); c.arc(0, 0, radius - 6, 0, Math.PI * 2); c.stroke();
  c.rotate(travel / radius);
  c.strokeStyle = on ? '#bbb' : '#666';
  for (let i = 0; i < 3; i++) {
    c.rotate(Math.PI * 2 / 3); c.beginPath();
    c.roundRect(6, -4, radius - 10, 8, 2); c.fill(); c.stroke();
  }
  c.beginPath(); c.arc(0, 0, 8, 0, Math.PI * 2); c.fill(); c.stroke();
  c.beginPath(); c.arc(0, 0, 2.5, 0, Math.PI * 2); c.stroke(); c.restore();
}

export function drawPhysicsTape({ c, w, h }, params, angle, level, seconds = 0, runtime = {}) {
  c.clearRect(0, 0, w, h);
  if (w <= 20 || h <= 20) return;
  let transport = transports.get(c);
  if (!transport) { transport = new TapeVisualTransport(); transports.set(c, transport); }
  const motion = tapeVisualState(params, runtime.telemetry, runtime.audioTime ?? seconds, seconds);
  const moving = (runtime.running ?? (angle !== transport.lastAngle)) && params.tapeOn && !runtime.reducedMotion;
  const dt = runtime.dt ?? (transport.lastSeconds === undefined ? 0 : seconds - transport.lastSeconds);
  transport.advance(dt, moving, motion);
  transport.lastAngle = angle; transport.lastSeconds = seconds;
  motion.seconds = transport.seconds;
  motion.waveform = transport.waveform;
  if (runtime.reducedMotion) { motion.wow = motion.flutter = 0; motion.waveform = null; }
  const tape = transport.tape;
  const points = [];
  for (let i = 0; i < tape.n; i++) {
    const x = tape.x[i], y = tape.y[i];
    // Project only the guided lower run onto the head arch. The loose-loop
    // solver and wheel tangencies retain their established geometry.
    const arch = y > 380 && x >= TAPE_WHEELS[0].x && x <= TAPE_WHEELS[1].x
      ? tapeHeadPath(x) - (TAPE_WHEELS[0].y + TAPE_WHEELS[0].radius) : 0;
    points.push({ x, y: y + arch + (y > 380 ? tapeHeadOffset(x, motion) : 0) });
  }
  points.push(points[0]);
  c.save();
  // Frame the actual mechanism bounds, including the low centre head,
  // rather than the larger simulation world. Keep a small edge clearance.
  const scale = Math.min((w - 20) / 606, (h - 20) / 429);
  c.translate(w / 2 - 360 * scale, h / 2 - 276.5 * scale);
  c.scale(scale, scale);
  const on = params.tapeOn;
  c.lineJoin = 'round'; c.lineCap = 'round';
  drawTapeAfterglow(c, transport, motion, dt, moving,
    runtime.reducedMotion ? 0 : clamp(runtime.trail ?? 65, 0, 100));
  TAPE_WHEELS.forEach(wheel => roller(c, wheel.x, wheel.y, wheel.radius, -tape.travel, on));
  // Grayscale faces become the app's established one-bit Bayer dither.
  // Their eleven-pixel projected width stays within the solver's contact gap.
  const faces = points.slice(0, -1).map((p, i) => [p, points[i + 1]]);
  faces.sort((a, b) => a[0].y + a[1].y - b[0].y - b[1].y);
  for (const [a, b] of faces) {
    const dy = b.y - a.y, dx = b.x - a.x, length = Math.hypot(dx, dy) || 1;
    const shade = Math.round((on ? 100 : 46) + (on ? 85 : 35) * Math.abs(dx / length));
    const top = (a.y + b.y) / 2 - 11;
    const fill = c.createLinearGradient(0, top, 0, top + 11);
    fill.addColorStop(0, on ? '#f0f0f0' : '#888');
    fill.addColorStop(.4, `rgb(${shade},${shade},${shade})`);
    fill.addColorStop(1, on ? '#333' : '#222');
    c.fillStyle = fill;
    c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y);
    c.lineTo(b.x, b.y - 11); c.lineTo(a.x, a.y - 11); c.closePath(); c.fill();
    c.strokeStyle = on ? '#fff' : '#777'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(a.x, a.y - 11); c.lineTo(b.x, b.y - 11); c.stroke();
  }
  TAPE_WHEELS.forEach(wheel => roller(c, wheel.x, wheel.y, wheel.radius, -tape.travel, on, true));
  // Three playback heads support the tape. Their dither density follows
  // measured audio energy and the wet signal, including its decay.
  const warmth = motion.drive * motion.signal;
  const shades = [warmth, motion.signal, motion.echo];
  for (const head of TAPE_HEAD_POSES) {
    c.save(); c.translate(head.x,head.y); c.rotate(head.angle);
    c.fillStyle = '#000'; c.strokeStyle = on ? '#bbb' : '#555'; c.lineWidth = 1.3;
    // Chamfered casing and a narrow top face echo the outlined wheel walls.
    c.beginPath(); c.moveTo(-40, 10); c.lineTo(-31, 4); c.lineTo(31, 4);
    c.lineTo(40, 10); c.lineTo(40, 30); c.lineTo(33, 37);
    c.lineTo(-33, 37); c.lineTo(-40, 30); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-40, 10); c.lineTo(40, 10); c.stroke();
    c.strokeStyle = on ? '#777' : '#444';
    c.beginPath(); c.roundRect(-21, 15, 42, 16, 3); c.stroke();
    // Rounded tape shoe, with the fine central magnetic gap left visible.
    c.strokeStyle = on ? '#eee' : '#777';
    c.beginPath(); c.roundRect(-16, -3, 32, 11, 5); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(0, -2); c.lineTo(0, 7); c.stroke();
    // Slotted fasteners make the front plate read as a mechanical part.
    c.strokeStyle = on ? '#aaa' : '#555'; c.lineWidth = 1;
    for (const x of [-30, 30]) {
      c.beginPath(); c.arc(x, 22, 3, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.moveTo(x - 1.5, 23.5); c.lineTo(x + 1.5, 20.5); c.stroke();
    }
    for (let i = 0; i < shades.length; i++) {
      const shade = Math.round(35 + 220 * Math.sqrt(shades[i]));
      c.fillStyle = `rgb(${shade},${shade},${shade})`; c.fillRect(-14 + i * 11, 20, 6, 6);
    }
    c.restore();
  }
  const splice = points[27];
  c.strokeStyle = on ? '#fff' : '#999'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(splice.x, splice.y); c.lineTo(splice.x, splice.y - 11); c.stroke();
  c.restore();
  // Read-only render receipts used by browser QA; no audio or saved state.
  if (c.canvas?.dataset) c.canvas.dataset.tapeMotion = JSON.stringify({
    travel: tape.travel, phase: motion.seconds, moving: !!moving,
    source: runtime.telemetry ? 'audio-processor' : 'preview',
    headOffset: tapeHeadOffset(297, motion), signal: motion.signal, echo: motion.echo,
    waveformPeak: motion.waveform ? Math.max(...motion.waveform.map(Math.abs)) : 0
  });
}
