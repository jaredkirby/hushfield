// Original physical-inspired drawings, not a simulation of a particular unit.
const TAU = Math.PI * 2;
const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));
function path(c, points, color = '#aaa', width = 1) {
  c.strokeStyle = color; c.lineWidth = width; c.beginPath();
  points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke();
}
function dot(c, x, y, radius = 3) {
  c.fillStyle = '#000'; c.strokeStyle = '#fff'; c.lineWidth = 1;
  c.beginPath(); c.arc(x, y, radius, 0, TAU); c.fill(); c.stroke();
}
function plate(c, t, energy) {
  const project = (u, v) => [91 + u * 389 + v * 50, 99 + v * 234 - u * 30];
  const wave = (u, v) => energy * 12 * Math.sin(Math.PI * u) * Math.sin(Math.PI * v) * Math.sin(t * 13 - u * 15 + v * 8);
  path(c, [[66, 70], [513, 36], [574, 337], [121, 378], [66, 70]], '#ddd', 2);
  for (let axis = 0; axis < 2; axis++) for (let n = 0; n <= 18; n++) {
    const points = [];
    for (let j = 0; j <= 58; j++) {
      const u = axis ? j / 58 : n / 18, v = axis ? n / 18 : j / 58;
      const [x, y] = project(u, v); points.push([x, y + wave(u, v)]);
    }
    path(c, points, n % 3 ? '#555' : '#aaa');
  }
  for (const [u, v, x, y] of [[0, 0, 66, 70], [1, 0, 513, 36], [0, 1, 121, 378], [1, 1, 574, 337]]) {
    const p = project(u, v); path(c, [[x, y], p], '#ddd'); dot(c, x, y, 4);
  }
  for (const [u, v] of [[.28, .48], [.76, .32], [.64, .77]]) {
    const [x, y] = project(u, v); dot(c, x, y + wave(u, v), 5);
  }
}
function spring(c, t, energy) {
  path(c, [[57, 69], [551, 69], [551, 349], [57, 349], [57, 69]], '#bbb', 2);
  path(c, [[57, 79], [551, 79]], '#555');
  for (let row = 0; row < 3; row++) {
    const center = 133 + row * 76, points = [];
    path(c, [[76, center - 17], [76, center + 17], [95, center + 17], [95, center - 17], [76, center - 17]], '#aaa');
    path(c, [[514, center - 17], [514, center + 17], [533, center + 17], [533, center - 17], [514, center - 17]], '#aaa');
    path(c, [[95, center], [111, center]], '#ddd');
    for (let j = 0; j <= 720; j++) {
      const u = j / 720, phase = u * TAU * (27 + row * 3);
      const displacement = energy * 8 * Math.sin(Math.PI * u) * Math.sin(t * (10 + row) - u * (20 + row * 8));
      points.push([113 + u * 383 + Math.cos(phase) * 4, center + Math.sin(phase) * 14 + displacement]);
    }
    path(c, points, '#ddd', 1.25);
    path(c, [[500, center], [514, center]], '#ddd');
  }
  for (const x of [67, 541]) for (const y of [91, 337]) dot(c, x, y, 3);
}
function chamber(c, t, energy, original = false) {
  const front = [[54, 67], [557, 67], [557, 351], [54, 351]], back = [[193, 123], [415, 123], [415, 259], [193, 259]];
  path(c, [...front, front[0]], '#bbb', 1.5); path(c, [...back, back[0]], '#888');
  front.forEach((p, i) => path(c, [p, back[i]], '#777'));
  for (let i = 1; i <= 5; i++) {
    const u = i / 6;
    path(c, [[54 + 503 * u, 351], [193 + 222 * u, 259]], '#333');
    path(c, [[54, 351 - i * 15], [557, 351 - i * 15]], '#333');
  }
  if (!original) for (const x of [251, 353]) {
    c.fillStyle = '#000'; c.fillRect(x - 10, 141, 20, 119);
    path(c, [[x - 10, 141], [x - 10, 260], [x + 10, 260], [x + 10, 141]], '#aaa');
    c.strokeStyle = '#ddd'; c.beginPath(); c.ellipse(x, 141, 10, 4, 0, 0, TAU); c.stroke();
    path(c, [[x - 3, 148], [x - 3, 253]], '#444');
  }
  // Fixed reflection paths stay visible at silence. Their displacement alone
  // follows measured energy, so a stopped or silent Piece does not animate.
  const routes = original ? [
    [[110, 232], [304, 104], [496, 235]], [[110, 232], [304, 326], [496, 235]]
  ] : [
    [[115, 251], [202, 128], [548, 196], [453, 286]],
    [[115, 251], [374, 342], [405, 128], [453, 286]],
    [[115, 251], [62, 183], [291, 128], [453, 286]]
  ];
  routes.forEach((route, r) => {
    path(c, route.map(([x, y], i) => [x, y + (i && i < route.length - 1 ? Math.sin(t * 5 + r * 2) * energy * 5 : 0)]), r ? '#666' : '#bbb');
  });
  c.fillStyle = '#000'; c.fillRect(94, 226, 32, 49);
  path(c, [[94, 226], [126, 226], [126, 275], [94, 275], [94, 226]], '#eee');
  dot(c, 110, 241, 7); dot(c, 110, 261, 4);
  for (const [x, y] of original ? [[496, 235]] : [[453, 286], [476, 245]]) {
    path(c, [[x, y], [x, y + 40], [x - 12, y + 46], [x, y + 40], [x + 12, y + 46]], '#aaa');
    dot(c, x, y, 4);
  }
  if (original) {
    c.setLineDash([2, 5]);
    for (let i = 0; i < 4; i++) {
      const radius = 27 + i * 22 + Math.sin(t * 4 - i) * energy * 5;
      c.strokeStyle = i % 2 ? '#555' : '#999'; c.beginPath(); c.ellipse(304, 205, radius * 1.5, radius, 0, 0, TAU); c.stroke();
    }
    c.setLineDash([]);
  }
}

export function drawSpaceReverb({c, w, h}, settings = {}, {time = 0, level = 0, reducedMotion = false} = {}) {
  c.clearRect(0, 0, w, h);
  if (w < 20 || h < 90) return;
  const model = settings.reverbModel ?? 'original';
  const energy = reducedMotion ? 0 : clamp(level);
  const t = Number.isFinite(time) ? time : 0;
  c.save();
  const scale = Math.min((w - 12) / 610, (h - 74) / 410);
  c.translate((w - 610 * scale) / 2, 42 + (h - 74 - 410 * scale) / 2);
  c.scale(scale, scale); c.lineJoin = 'round'; c.lineCap = 'round';
  if (model === 'plate') plate(c, t, energy);
  else if (model === 'spring') spring(c, t, energy);
  else chamber(c, t, energy, model !== 'chamber');
  c.restore();
}
