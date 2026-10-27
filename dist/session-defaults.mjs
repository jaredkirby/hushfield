import { selectPiecePreset } from './piece-presets.mjs';
import { TAPE_DEFAULTS, SPACE_ECHO_DEFAULTS } from './tape-settings.mjs';
import { TAPE_PHYSICS_DEFAULTS } from './tape-physics-settings.mjs';
import { SPACE_DEFAULTS } from './space-settings.mjs';
import { VISUAL_DEFAULTS } from './visual-analysis.mjs';

// Shared by startup, whole-Piece selection and editor reset. Stillwater applies
// additional fresh-session choices, including Juno and enabled Space Echo.
export const INITIAL_PARAMS = Object.freeze({
  sampleLevel: 100, orbitLevel: 100,
  position: 50, size: 320, density: 18, spray: 24, pitch: 0,
  scanOn: true, scanMode: 'forward', range: 100, wander: 10, speed: .22,
  smooth: 0, static: 0, jump: 0, hold: 0, reverse: 15, elastic: 0,
  chaos: 0, freeze: false, cutoff: 14000, resonance: .6,
  ...TAPE_DEFAULTS, ...SPACE_ECHO_DEFAULTS, ...TAPE_PHYSICS_DEFAULTS,
  ...SPACE_DEFAULTS, reverb: 30, width: 75,
  trimStart: 0, trimEnd: 100, denoise: 0,
  orbitTriggers: 8, orbitBalls: 5, orbitGravity: 35, orbitBounce: 84,
  orbitSpin: 12, orbitRotation: 0, orbitOctave: 0, orbitAttack: .01,
  orbitRelease: 1.5, orbitReverb: 70, orbitVolume: 35
});

// Uses the settings-history shape. Transport and audio material are not defaults
// owned by an editor; volume is intentionally absent because reset preserves it.
export function createSessionDefaults() {
  const fresh = selectPiecePreset('still', { defaults: INITIAL_PARAMS, cancelPending() {} });
  return {
    params: fresh.params,
    piece: fresh.piece,
    ambient: fresh.ambient,
    sound: fresh.soundState,
    visual: structuredClone(VISUAL_DEFAULTS),
    controls: fresh.controls
  };
}
