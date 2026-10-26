// Shared geometry only; synthesis remains in the existing audio graph.
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const cutoffFromUnit = x => Math.round(100 * 200 ** clamp(x, 0, 1));
export const cutoffToUnit = hz => Math.log(clamp(hz, 100, 20000) / 100) / Math.log(200);
export function trimAt(params, edge, percent) {
  const start = clamp(Number(params.trimStart) || 0, 0, 99.9);
  const end = clamp(Number(params.trimEnd) || 100, start + .1, 100);
  return edge === 'trimStart'
    ? { trimStart: Math.round(clamp(percent, 0, end - .1) * 10) / 10 }
    : { trimEnd: Math.round(clamp(percent, start + .1, 100) * 10) / 10 };
}
export function grainBounds(position, size, duration) {
  const center = clamp(position / 100, 0, 1);
  const half = clamp(size, 15, 1500) / (Math.max(.001, duration) * 2000);
  return { center, left: clamp(center - half, 0, 1), right: clamp(center + half, 0, 1) };
}
export function grainSizeFromDrag(startSize, delta, duration) {
  return Math.round(clamp(startSize + delta * Math.max(.001, duration) * 2000, 15, 1500));
}
export function spaceAt(x, y) {
  return { cutoff: cutoffFromUnit(x), resonance: Math.round((.1 + (1 - clamp(y, 0, 1)) * 11.9) * 10) / 10 };
}
export function echoAt(x, y) {
  return { delayTime: Math.round(clamp(x * 1.5, .05, 1.5) * 100) / 100, feedback: Math.round((1 - clamp(y, 0, 1)) * 80) };
}
// A second-order analog response sketch: explicitly a control preview, not FFT telemetry.
export function responsePath(type, cutoff, resonance) {
  return Array.from({ length: 121 }, (_, i) => {
    const r = cutoffFromUnit(i / 120) / clamp(cutoff, 100, 20000);
    const q = clamp(resonance, .1, 12);
    const denominator = Math.sqrt((1 - r * r) ** 2 + (r / q) ** 2);
    const numerator = type === 'highpass' ? r * r : type === 'bandpass' ? r / q : 1;
    const db = 20 * Math.log10(Math.max(.001, numerator / denominator));
    return `${i ? 'L' : 'M'}${(i / 120 * 1000).toFixed(1)},${(100 - (clamp(db, -36, 24) + 36) / 60 * 100).toFixed(1)}`;
  }).join(' ');
}

// Relative dB display preserves visibility of quiet repeats in the compact timeline.
// The audio path still receives the unmodified linear mix and feedback settings.
export function echoRepeatPath(delayTime, feedback, mix) {
  const time = clamp(delayTime, .05, 1.5), gain = clamp(mix, 0, 70) / 70, decay = clamp(feedback, 0, 80) / 100;
  if (!gain) return '';
  const paths = [];
  for (let i = 1; i * time <= 1.501 && i < 32; i++) {
    const amplitude = gain * decay ** (i - 1);
    if (amplitude <= 0) break;
    const level = clamp((20 * Math.log10(amplitude) + 48) / 48, 0, 1);
    if (!level) break;
    paths.push(`M${(i * time / 1.5 * 1000).toFixed(1)},98V${(98 - level * 90).toFixed(1)}`);
  }
  return paths.join(' ');
}
