import { createSessionDefaults } from './session-defaults.mjs';
import { FOUNDATION_WAVE_DEFAULTS } from './foundation-wave-settings.mjs';
import { SPACE_DEFAULTS } from './space-settings.mjs';
import { TAPE_DEFAULTS, SPACE_ECHO_DEFAULTS } from './tape-settings.mjs';
import { TAPE_PHYSICS_DEFAULTS } from './tape-physics-settings.mjs';

// Explicit ownership prevents a reset from leaking into adjacent editors or the
// Piece's Blend, material, harmony link, master volume or separate Visual tool.
const ownership = {
  foundation: { visual: Object.keys(FOUNDATION_WAVE_DEFAULTS) },
  texture: {
    params: ['position', 'size', 'density', 'spray', 'pitch', 'scanOn', 'scanMode',
      'range', 'wander', 'speed', 'smooth', 'static', 'jump', 'hold', 'reverse',
      'elastic', 'chaos', 'freeze'],
    visual: ['waveformSmoothing']
  },
  motion: {
    params: ['orbitTriggers', 'orbitBalls', 'orbitGravity', 'orbitBounce',
      'orbitSpin', 'orbitRotation', 'orbitOctave', 'orbitAttack', 'orbitRelease',
      'orbitReverb', 'orbitVolume'],
    controls: ['orbitShape', 'orbitKey', 'orbitScale', 'orbitInstrument']
  },
  space: {
    params: ['cutoff', 'resonance', 'reverb', 'width', ...Object.keys(SPACE_DEFAULTS)],
    controls: ['filterType']
  },
  tape: {
    params: [...Object.keys(TAPE_DEFAULTS), ...Object.keys(SPACE_ECHO_DEFAULTS),
      ...Object.keys(TAPE_PHYSICS_DEFAULTS)]
  }
};
export const EDITOR_RESET_FIELDS = Object.freeze(Object.fromEntries(
  Object.entries(ownership).map(([editor, sections]) => [editor, Object.freeze(
    Object.fromEntries(Object.entries(sections).map(([section, keys]) => [section, Object.freeze(keys)]))
  )])
));

/** Return independent settings for one reset. The caller owns history and audio
 * transitions; this pure function never starts playback or changes material. */
export function resetEditorSettings(editor, snapshot, defaults = createSessionDefaults()) {
  if (!Object.hasOwn(EDITOR_RESET_FIELDS, editor)) throw new RangeError(`Unknown editor: ${editor}`);
  const next = structuredClone(snapshot);
  for (const [section, keys] of Object.entries(EDITOR_RESET_FIELDS[editor])) {
    next[section] ??= {};
    for (const key of keys) next[section][key] = structuredClone(defaults[section][key]);
  }
  if (editor === 'foundation') {
    // The seed identifies this Piece's development. Resetting an editor must not
    // silently create a new Piece, even when its sound model is deliberately reset.
    next.ambient = { ...structuredClone(defaults.ambient), seed: snapshot.ambient.seed };
  }
  if (editor === 'motion') next.sound = structuredClone(defaults.sound);
  return next;
}
