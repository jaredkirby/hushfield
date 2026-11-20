// Harmonic Texture (developing arrangements): grains stay on octaves and fifths of their source,
// so Texture agrees with Foundation's chord. grain-worklet.js keeps its own copy because it is
// evaluated standalone; tests/texture-harmony.test.mjs keeps the two in step.
export const HARMONIC_PITCHES = [-24, -17, -12, -5, 0, 7, 12, 19, 24];
export function snapHarmonicPitch(pitch) {
  return HARMONIC_PITCHES.reduce((best, value) => Math.abs(value - pitch) < Math.abs(best - pitch) ? value : best, 0);
}
const signed = value => (value >= 0 ? '+' : '') + value;
export function formatTexturePitch(value, harmonic) {
  if (!harmonic) return signed(value) + ' st';
  const snapped = snapHarmonicPitch(value);
  return snapped === value ? signed(value) + ' st' : `${signed(value)} → ${signed(snapped)} st`;
}
