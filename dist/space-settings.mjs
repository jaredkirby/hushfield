export const SPACE_FIELDS = [
  { id: 'foundationRoom', label: 'Foundation room', min: 0, max: 100, step: 1, value: 22, unit: '%' },
  { id: 'textureRoom', label: 'Texture room', min: 0, max: 100, step: 1, value: 65, unit: '%' },
  { id: 'motionRoom', label: 'Motion room', min: 0, max: 100, step: 1, value: 30, unit: '%' },
  { id: 'roomLow', label: 'Room low cut', min: 20, max: 2000, step: 10, value: 180, unit: ' Hz' },
  { id: 'roomHigh', label: 'Room high cut', min: 1000, max: 20000, step: 100, value: 7500, unit: ' Hz' }
];
export const VINTAGE_REVERB_FIELDS = [
  { id: 'reverbDecay', label: 'Decay', min: .5, max: 8, step: .1, value: 3, unit: ' s' },
  { id: 'reverbPredelay', label: 'Predelay', min: 0, max: 150, step: 1, value: 20, unit: ' ms' },
  { id: 'reverbTone', label: 'Tone', min: 0, max: 100, step: 1, value: 50, unit: '%' },
  { id: 'reverbWidth', label: 'Width', min: 0, max: 100, step: 1, value: 75, unit: '%' }
];
export const REVERB_MODELS = ['original', 'plate', 'spring', 'chamber'];
const REVERB_DEFAULTS = { reverbModel: 'original', ...Object.fromEntries(VINTAGE_REVERB_FIELDS.map(field => [field.id, field.value])) };
export const SPACE_DEFAULTS = { spaceVersion: 2, ...REVERB_DEFAULTS, ...Object.fromEntries(SPACE_FIELDS.map(field => [field.id, field.value])) };
export function restoreSpace(saved, legacy = false, originalReverb = false) {
  const defaults = legacy ? { spaceVersion: 1, foundationRoom: 100, textureRoom: 100, motionRoom: 100, roomLow: 20, roomHigh: 20000 } : SPACE_DEFAULTS;
  const result = { ...REVERB_DEFAULTS, ...defaults };
  if (legacy) return result;
  result.spaceVersion = saved?.spaceVersion === 1 ? 1 : 2;
  result.reverbModel = !originalReverb && REVERB_MODELS.includes(saved?.reverbModel) ? saved.reverbModel : 'original';
  for (const field of [...SPACE_FIELDS, ...VINTAGE_REVERB_FIELDS]) {
    const value = originalReverb && VINTAGE_REVERB_FIELDS.includes(field) ? undefined : saved?.[field.id];
    if (Number.isFinite(value)) result[field.id] = Math.round(Math.max(field.min, Math.min(field.max, field.min + Math.round((value - field.min) / field.step) * field.step)) * 1e6) / 1e6;
  }
  return result;
}
