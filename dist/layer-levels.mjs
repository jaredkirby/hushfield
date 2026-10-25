function readLayerLevel(kind, ambient, params) {
  return ambient.enabled ? ambient[kind === "orbit" ? "orbit" : "grains"] : params[kind === "orbit" ? "orbitLevel" : "sampleLevel"];
}
function setLayerLevel(kind, value, ambient, params) {
  value = Math.round(Math.max(0, Math.min(100, value)) / 5) * 5;
  if (ambient.enabled) ambient[kind === "orbit" ? "orbit" : "grains"] = value;
  else params[kind === "orbit" ? "orbitLevel" : "sampleLevel"] = value;
}
export {
  readLayerLevel,
  setLayerLevel
};
