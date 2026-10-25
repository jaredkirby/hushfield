export const PAD_COUNT = 8;
export const MAX_PADS = 24;
export const triggerCount = value => Math.max(1,Math.min(MAX_PADS,Math.round(Number(value)||PAD_COUNT)));
export const ORBIT_SCALES = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  pentatonic: [0, 3, 5, 7, 10]
};
const TAU = Math.PI * 2;
const EPSILON = 1e-9;
const colors = ['#efa08c', '#edaf83', '#e5c486', '#c3cb94', '#94c6b2', '#91bfd3', '#b1afd8', '#d99fbe'];
const tones = [
  ['Mellow', 1, .6, 1], ['Glass', 2.76, 1.3, 1.15],
  ['Wood', 1.5, .85, .65], ['Chime', 3, 1.5, 1.3],
  ['Warm', .5, .5, .9], ['Metal', 3.5, 1.8, .8],
  ['Air', 2, .35, 1.4], ['Spark', 4, 1.1, .7]
];

// Marker zero is at twelve o'clock; pads stay fixed while the paddle rotates.
export const padAngle = (index,count=PAD_COUNT) => -Math.PI / 2 + index * TAU / triggerCount(count);

// The simulator wraps phase at a revolution. A frame advances less than half a
// turn, so unwrap the short arc and include each crossed mark exactly once.
export function crossedPads(from, to, count=PAD_COUNT) {
  count=triggerCount(count);
  const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  if (Math.abs(delta) < EPSILON) return [];
  const spacing = TAU / count;
  const start = from / spacing, end = (from + delta) / spacing;
  const result = [];
  if (delta > 0) {
    for (let i = Math.floor(start + EPSILON) + 1; i <= Math.floor(end + EPSILON); i++) result.push((i % count + count) % count);
  } else {
    for (let i = Math.ceil(start - EPSILON) - 1; i >= Math.ceil(end - EPSILON); i--) result.push((i % count + count) % count);
  }
  return result;
}

export function padSound(index, {key = 0, scale = 'minor', octave = 0} = {}) {
  index = Math.max(0,Math.min(MAX_PADS-1,Math.round(index)));
  const notes = ORBIT_SCALES[scale] || ORBIT_SCALES.minor;
  const midi = 48 + key + octave * 12 + notes[index % notes.length] + Math.floor(index / notes.length) * 12;
  const names = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  const [tone, ratio, modulation, decay] = tones[index % tones.length];
  return {midi, note: names[(midi % 12 + 12) % 12] + (Math.floor(midi / 12) - 1), color: colors[index % colors.length], tone, ratio, modulation, decay};
}

// Shared by the canvas and button overlay so the paddle meets the pad centers.
export function padGeometry(width, height) {
  const ring = Math.max(12, Math.min(width / 2, height / 2) - 24);
  return {cx: width / 2, cy: height / 2, ring, radius: ring / 1.14};
}
