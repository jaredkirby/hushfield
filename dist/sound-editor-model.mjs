import { SOUND_FIELDS, patchFor } from './sound-patches.mjs?v=hushfield-1';

export function mixedSoundFields(state, bank, count) {
  if (count < 2) return new Set();
  const first = patchFor(state, bank, 0);
  return new Set([...SOUND_FIELDS.filter(field => !field.bankOnly).map(field => field.id), 'enabled']
    .filter(id => Array.from({ length: count - 1 }, (_, i) => patchFor(state, bank, i + 1)[id]).some(value => value !== first[id])));
}

// Time is linear; the release follows the same exponential decay as Orbit DSP.
// A minimum domain during dragging avoids contraction; expand when needed to
// keep every handle inside the editor instead of letting it escape its bounds.
export function envelopeGeometry(patch, domain) {
  const total = patch.attack + patch.decay + patch.gate + patch.release;
  const duration = Math.max(domain || 0, total * 1.15);
  const x = time => 6 + time / duration * 88;
  const y = amplitude => 88 - amplitude * 68;
  const sustain = patch.sustain / 100;
  // Normalize the actual DSP curve to the attack peak. When the level is zero
  // no voice is created, so show the envelope at a reference peak for editing.
  const peak = (patch.level > 0 ? patch.level : 100) / 100 * .18;
  const heldAmplitude = Math.max(1e-5, peak * sustain);
  const decayEnd = patch.attack + patch.decay;
  const holdEnd = decayEnd + patch.gate;
  const points = [[x(0), y(0)], [x(patch.attack), y(1)], [x(decayEnd), y(sustain)], [x(holdEnd), y(sustain)]];
  for (let i = 1; i <= 32; i++) {
    const fraction = i / 32;
    const amplitude = heldAmplitude * Math.exp(Math.log(1e-5 / heldAmplitude) * fraction) / peak;
    points.push([x(holdEnd + patch.release * fraction), y(amplitude)]);
  }
  return { duration, total, points, handles: {
    attack: [x(patch.attack), y(1)], decay: [x(decayEnd), y(sustain)],
    sustain: [x((decayEnd + holdEnd) / 2), y(sustain)],
    gate: [x(holdEnd), y(sustain)], release: [x(total), y(0)]
  } };
}

export function envelopeDragValue(field, initial, dx, dy, width, height, duration) {
  const definition = SOUND_FIELDS.find(item => item.id === field);
  const value = initial + (field === 'sustain' ? -dy / (height * .68) * 100 : dx / (width * .88) * duration);
  return Math.max(definition.min, Math.min(definition.max, Math.round(value * 1000) / 1000));
}
