export const SPACE_FIELDS = [
  { id: 'foundationRoom', label: 'Foundation room', min: 0, max: 100, step: 1, value: 22, unit: '%' },
  { id: 'textureRoom', label: 'Texture room', min: 0, max: 100, step: 1, value: 65, unit: '%' },
  { id: 'motionRoom', label: 'Motion room', min: 0, max: 100, step: 1, value: 30, unit: '%' },
  { id: 'roomLow', label: 'Room low cut', min: 20, max: 2000, step: 10, value: 180, unit: ' Hz' },
  { id: 'roomHigh', label: 'Room high cut', min: 1000, max: 20000, step: 100, value: 7500, unit: ' Hz' }
];
export const SPACE_DEFAULTS = { spaceVersion: 2, ...Object.fromEntries(SPACE_FIELDS.map(field => [field.id, field.value])) };
export function restoreSpace(saved, legacy = false) {
  const defaults = legacy ? { spaceVersion: 1, foundationRoom: 100, textureRoom: 100, motionRoom: 100, roomLow: 20, roomHigh: 20000 } : SPACE_DEFAULTS;
  const result = { ...defaults };
  if (legacy) return result;
  result.spaceVersion = saved?.spaceVersion === 1 ? 1 : 2;
  for (const field of SPACE_FIELDS) {
    const value = saved?.[field.id];
    if (Number.isFinite(value)) result[field.id] = Math.max(field.min, Math.min(field.max, field.min + Math.round((value - field.min) / field.step) * field.step));
  }
  return result;
}
