import { restorePiece } from "./piece-session.mjs";
import { restoreAmbient } from "./ambient-settings.mjs";
import { createSoundState } from "./sound-patches.mjs";
const presets = {
  still: { label: "Stillwater", scene: 0, foundation: 100, texture: 0, motion: 0, params: {} },
  cloud: { label: "Slow cloud", scene: 2, foundation: 80, texture: 30, motion: 10, params: { size: 900, density: 26, spray: 35, speed: 0.08, pitch: -12, reverse: 25, static: 10, reverb: 60, delayMix: 12, cutoff: 6500 } },
  shards: { label: "Glass shards", scene: 3, foundation: 80, texture: 35, motion: 25, params: { size: 70, density: 28, spray: 75, speed: 0.65, pitch: 12, reverse: 35, jump: 35, hold: 8, elastic: 12, chaos: 35, reverb: 24, delayMix: 30, cutoff: 16e3 } },
  worn: { label: "Worn memory", scene: 1, foundation: 80, texture: 30, motion: 10, params: { size: 480, density: 15, spray: 18, speed: 0.15, pitch: -5, reverse: 8, static: 25, elastic: 2, chaos: 10, reverb: 38, delayMix: 23, feedback: 38, tapeTone: 35, tapeOn: true, drive: 55, wow: 65, flutter: 35, hiss: 22, cutoff: 4e3 } }
};
function selectPiecePreset(key, { defaults, cancelPending }) {
  const preset = presets[key];
  if (!preset) return null;
  cancelPending();
  return { label: preset.label, piece: restorePiece(preset), ambient: restoreAmbient({ scene: preset.scene }), params: { ...defaults, ...preset.params, freeze: false, scanOn: true }, soundState: createSoundState(), controls: { filterType: "lowpass", orbitShape: "0", orbitKey: "C", orbitScale: "minor", orbitInstrument: "pluck" } };
}
export {
  selectPiecePreset
};
