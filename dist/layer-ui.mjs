import { attachStepper, ensureVisibleSelection } from "./phone-ui.mjs";
import { readLayerLevel, setLayerLevel } from "./layer-levels.mjs";
function setupLayerUI({ getPage, getAmbient, getParams, onChange }) {
  const row = document.createElement("div");
  row.className = "layer-level control";
  row.hidden = true;
  const label = document.createElement("span"), input = document.createElement("input");
  label.className = "layer-explanation";
  input.type = "range";
  input.id = "layerLevel";
  input.min = 0;
  input.max = 100;
  input.step = 5;
  input.hidden = true;
  row.append(label, input);
  document.getElementById("displayStage").append(row);
  let kind = "sample";
  const control = attachStepper(row, input, { label: () => `${kind === "orbit" ? "Orbit" : "Sample"} layer level`, step: 5, format: (value) => value + "%" });
  input.addEventListener("input", () => {
    setLayerLevel(kind, +input.value, getAmbient(), getParams());
    onChange();
    refresh();
  });
  function refresh() {
    const page = getPage();
    kind = page === "orbit" ? "orbit" : "sample";
    row.hidden = !["sample", "grain", "fx", "orbit"].includes(page);
    const value = readLayerLevel(kind, getAmbient(), getParams());
    input.value = value;
    label.textContent = `${kind === "orbit" ? "ORBIT" : "SAMPLE"} LAYER · ${value === 0 ? "SILENT — SELECT LEVEL TO ADD SOUND" : "LEVEL"}`;
    control.render();
  }
  return { refresh };
}
export {
  setupLayerUI
};
