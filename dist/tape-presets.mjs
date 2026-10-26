import { TAPE_DEFAULTS, SPACE_ECHO_DEFAULTS } from './tape-settings.mjs';

// Presets replace the complete Tape sound, while On/Off remains the player's choice.
const { tapeOn, ...soundDefaults } = { ...TAPE_DEFAULTS, ...SPACE_ECHO_DEFAULTS };
const TAPE_PRESETS = Object.freeze([
  { id: 'gentle', label: 'Gentle echo', description: 'Subtle two-head repeats with light tape warmth.', params: {} },
  { id: 'slapback', label: 'Slapback', description: 'A short, bright single echo with little feedback.', params: { echoMode: 1, delayTime: .24, feedback: 8, delayMix: 32, drive: 12, wow: 4, flutter: 3, hiss: 1, tapeTone: 72, springMix: 0 } },
  { id: 'drift', label: 'Three-head drift', description: 'Slow overlapping repeats, moving tape and a little spring.', params: { echoMode: 11, delayTime: .6, feedback: 43, delayMix: 32, drive: 20, wow: 28, flutter: 14, hiss: 4, tapeTone: 48, springMix: 20 } },
  { id: 'dub', label: 'Dub trails', description: 'Long, dark repeats that linger, with a small spring return.', params: { echoMode: 9, delayTime: .75, feedback: 61, delayMix: 38, drive: 32, wow: 18, flutter: 9, hiss: 4, tapeTone: 30, springMix: 12 } },
  { id: 'spring', label: 'Spring chamber', description: 'Metallic spring ambience with no tape echoes.', params: { echoMode: 12, delayTime: .36, feedback: 0, delayMix: 0, drive: 12, wow: 0, flutter: 0, hiss: 0, tapeTone: 60, springMix: 48 } }
].map(preset => Object.freeze({ ...preset, params: Object.freeze({ ...soundDefaults, ...preset.params }) })));

function applyTapePreset(params, id) {
  const preset = TAPE_PRESETS.find(preset => preset.id === id);
  return preset ? { ...params, ...preset.params } : params;
}
function matchingTapePreset(params) {
  return TAPE_PRESETS.find(preset => Object.entries(preset.params).every(([key, value]) => params[key] === value)) || null;
}
export { TAPE_PRESETS, applyTapePreset, matchingTapePreset };
