const level = (value, fallback) => Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : fallback;
function restorePiece(saved, legacy) {
  const fallback = legacy ? {
    foundation: legacy.ambient?.enabled === false ? 0 : 100,
    texture: legacy.ambient?.enabled === false ? legacy.params?.sampleLevel ?? 100 : legacy.ambient?.grains ?? 0,
    motion: legacy.ambient?.enabled === false ? legacy.params?.orbitLevel ?? 100 : legacy.ambient?.orbit ?? 0,
    source: "sample",
    followHarmony: false
  } : { foundation: 100, texture: 0, motion: 0, source: "foundation", followHarmony: true };
  return {
    foundation: level(saved?.foundation, level(fallback.foundation, 100)),
    texture: level(saved?.texture, level(fallback.texture, 0)),
    motion: level(saved?.motion, level(fallback.motion, 0)),
    source: ["foundation", "sample", "frozen"].includes(saved?.source) ? saved.source : fallback.source,
    followHarmony: typeof saved?.followHarmony === "boolean" ? saved.followHarmony : fallback.followHarmony
  };
}
function piecePlayback(piece, running, solo = null) {
  const audible = (kind) => !running || solo && solo !== kind ? 0 : solo === kind ? 1 : piece[kind] / 100;
  return { foundation: audible("foundation"), texture: audible("texture") * 0.6, motion: audible("motion") * 0.45, generate: running };
}
export {
  piecePlayback,
  restorePiece
};
