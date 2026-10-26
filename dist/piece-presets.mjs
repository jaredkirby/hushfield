import { restorePiece } from "./piece-session.mjs";
import { restoreAmbient } from "./ambient-settings.mjs";
import { restoreSoundState } from "./sound-patches.mjs";
import { SPACE_DEFAULTS } from "./space-settings.mjs";
// Triggers provide the recurring figure; balls answer it with a second instrument.
// Partial descriptions restore into fresh, editable bank state on every selection.
const motionPatches = {
  still: {
    triggers: { base: { wave: "triangle", level: 30, attack: .025, decay: .3, sustain: 16, gate: .12, release: 1.8, cutoff: 1900, toneAttack: .012, toneDecay: .45, toneAmount: 14, fmAmount: 0, pan: -12, delaySend: 8, reverbSend: 38 } },
    balls: { base: { wave: "sine", level: 25, attack: .015, decay: .14, sustain: 8, gate: .05, release: 1.1, cutoff: 1400, toneAttack: .008, toneDecay: .25, toneAmount: 18, fmAmount: 12, fmRatio: 2, pan: 14, delaySend: 5, reverbSend: 32 } }
  },
  cloud: {
    triggers: { base: { wave: "triangle", level: 25, attack: .85, decay: .8, sustain: 55, gate: .65, release: 3.4, cutoff: 900, toneAttack: 1.2, toneDecay: 2.4, toneAmount: 24, fmAmount: 4, fmRatio: 1, pan: -20, delaySend: 18, reverbSend: 58 }, effects: { delayTime: .6, feedback: 28, reverbTime: 3.4 } },
    balls: { base: { wave: "sine", level: 22, attack: .45, decay: 1.1, sustain: 35, gate: .35, release: 2.8, cutoff: 700, toneAttack: .8, toneDecay: 1.8, toneAmount: 24, fmAmount: 22, fmRatio: 1.5, pan: 22, delaySend: 14, reverbSend: 52 }, effects: { delayTime: .8, feedback: 22, reverbTime: 3 } }
  },
  shards: {
    triggers: { base: { wave: "sine", level: 27, attack: .003, decay: .22, sustain: 5, gate: .04, release: 2.1, cutoff: 2200, toneAttack: .002, toneDecay: .32, toneAmount: 30, fmAmount: 140, fmRatio: 2.75, pan: -18, delaySend: 28, reverbSend: 36 }, effects: { delayTime: .25, feedback: 32, reverbTime: 2.4 } },
    balls: { base: { wave: "sine", level: 23, attack: .006, decay: .38, sustain: 12, gate: .06, release: 1.6, cutoff: 2800, toneAttack: .004, toneDecay: .5, toneAmount: 24, fmAmount: 85, fmRatio: 3.5, pan: 24, delaySend: 22, reverbSend: 42 }, effects: { delayTime: .375, feedback: 25, reverbTime: 2.8 } }
  },
  worn: {
    triggers: { base: { wave: "triangle", level: 29, attack: .008, decay: .12, sustain: 7, gate: .04, release: .8, cutoff: 650, toneAttack: .003, toneDecay: .16, toneAmount: 18, fmAmount: 6, fmRatio: 1.25, drive: 12, pan: -8, delaySend: 20, reverbSend: 24 }, effects: { delayTime: .36, feedback: 30, reverbTime: 1.4 } },
    balls: { base: { wave: "triangle", level: 24, attack: .018, decay: .26, sustain: 12, gate: .08, release: 1.35, cutoff: 800, toneAttack: .01, toneDecay: .3, toneAmount: 21, fmAmount: 18, fmRatio: 2, drive: 6, pan: 10, delaySend: 14, reverbSend: 30 }, effects: { delayTime: .48, feedback: 24, reverbTime: 1.8 } }
  }
};
const presets = {
  still: { label: "Stillwater", scene: 0, foundation: 100, texture: 0, motion: 0, params: {} },
  cloud: { label: "Slow cloud", scene: 2, foundation: 80, texture: 30, motion: 10, params: { size: 900, density: 26, spray: 35, speed: 0.08, pitch: -12, reverse: 25, static: 10, reverb: 60, delayMix: 12, cutoff: 6500 } },
  shards: { label: "Glass shards", scene: 3, foundation: 80, texture: 35, motion: 25, params: { size: 70, density: 28, spray: 75, speed: 0.65, pitch: 12, reverse: 35, jump: 35, hold: 8, elastic: 12, chaos: 35, reverb: 24, delayMix: 30, cutoff: 16e3 } },
  worn: { label: "Worn memory", scene: 1, foundation: 80, texture: 30, motion: 10, params: { tapeModel: 1, size: 480, density: 15, spray: 18, speed: 0.15, pitch: -5, reverse: 8, static: 25, elastic: 2, chaos: 10, reverb: 38, delayMix: 23, feedback: 38, tapeTone: 35, tapeOn: true, drive: 55, wow: 65, flutter: 35, hiss: 22, cutoff: 4e3 } }
};
function selectPiecePreset(key, { defaults, cancelPending }) {
  const preset = presets[key];
  if (!preset) return null;
  cancelPending();
  return { label: preset.label, piece: restorePiece(preset), ambient: restoreAmbient({ scene: preset.scene, compositionVersion: 2 }), params: { ...defaults, ...SPACE_DEFAULTS, ...preset.params, freeze: false, scanOn: true }, soundState: restoreSoundState(motionPatches[key]), controls: { filterType: "lowpass", orbitShape: "0", orbitKey: "C", orbitScale: "minor", orbitInstrument: "pluck" } };
}
export {
  selectPiecePreset
};
