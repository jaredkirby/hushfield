const TAPE_DEFAULTS = Object.freeze({
  delayTime: 0.36,
  feedback: 28,
  delayMix: 16,
  tapeOn: false,
  drive: 16,
  wow: 10,
  flutter: 6,
  hiss: 4,
  tapeTone: 42
});
// Fresh Pieces opt in explicitly; saved Pieces without a model retain Classic.
const SPACE_ECHO_DEFAULTS = Object.freeze({ tapeModel: 2, echoMode: 4, springMix: 12 });
const SPACE_ECHO_MODES = Object.freeze([
  { value: 1, label: "1 · Head 1", heads: [1], spring: false },
  { value: 2, label: "2 · Head 2", heads: [2], spring: false },
  { value: 3, label: "3 · Head 3", heads: [3], spring: false },
  { value: 4, label: "4 · Heads 2 + 3", heads: [2, 3], spring: false },
  { value: 5, label: "5 · Head 1 + spring", heads: [1], spring: true },
  { value: 6, label: "6 · Head 2 + spring", heads: [2], spring: true },
  { value: 7, label: "7 · Head 3 + spring", heads: [3], spring: true },
  { value: 8, label: "8 · Heads 1 + 2 + spring", heads: [1, 2], spring: true },
  { value: 9, label: "9 · Heads 2 + 3 + spring", heads: [2, 3], spring: true },
  { value: 10, label: "10 · Heads 1 + 3 + spring", heads: [1, 3], spring: true },
  { value: 11, label: "11 · All heads + spring", heads: [1, 2, 3], spring: true },
  { value: 12, label: "12 · Spring only", heads: [], spring: true }
].map(mode => Object.freeze({ ...mode, heads: Object.freeze(mode.heads) })));
function restoreTape(saved) {
  const integer = (value, fallback, min, max) => Number.isFinite(value) ? Math.max(min, Math.min(max, Math.round(value))) : fallback;
  return {
    tapeModel: saved?.tapeModel === 2 ? 2 : 1,
    echoMode: integer(saved?.echoMode, SPACE_ECHO_DEFAULTS.echoMode, 1, 12),
    springMix: integer(saved?.springMix, SPACE_ECHO_DEFAULTS.springMix, 0, 70)
  };
}
export {
  TAPE_DEFAULTS,
  SPACE_ECHO_DEFAULTS,
  SPACE_ECHO_MODES,
  restoreTape
};
