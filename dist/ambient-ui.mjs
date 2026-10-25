import { AMBIENT_FIELDS, AMBIENT_SCENES, applyAmbientScene } from "./ambient-settings.mjs?v=hushfield-1";
import { attachStepper, panelNav } from "./phone-ui.mjs?v=hushfield-1";
function setupAmbientUI({ getState, onChange, onNew }) {
  const page = document.getElementById("ambientPage"), fields = page.querySelector(".ambient-fields"), records = [];
  const nav = panelNav(page, [["compose", "Compose"], ["layers", "Voices"]], (key) => {
    fields.querySelectorAll(".control").forEach((row) => row.hidden = row.dataset.group !== key);
  }, { className: "ambient-panel-tabs", ariaLabel: "Ambient control pages" });
  for (const field of AMBIENT_FIELDS.filter((f) => !["grains", "orbit", "space"].includes(f.id))) {
    const row = document.createElement("div");
    row.className = "control";
    row.dataset.group = field.group;
    row.hidden = field.group !== "compose";
    const top = document.createElement("div");
    top.className = "control-top";
    const label = document.createElement("label");
    label.textContent = field.label;
    label.htmlFor = "ambient-" + field.id;
    top.append(label);
    const input = document.createElement("input");
    input.type = "range";
    input.id = label.htmlFor;
    input.min = field.min;
    input.max = field.max;
    input.step = field.step;
    input.value = getState()[field.id];
    row.append(top, input);
    fields.append(row);
    const stepper = attachStepper(row, input, { label: "Ambient " + field.label, step: field.step, format: field.format || ((v) => v + "%") });
    records.push({ field, input, stepper });
    input.addEventListener("input", () => {
      const state = getState();
      if (field.id === "scene") applyAmbientScene(state, +input.value);
      else state[field.id] = +input.value;
      refresh();
      onChange(field.id);
    });
  }
  function refresh() {
    const state = getState();
    for (const { field, input, stepper } of records) {
      input.value = state[field.id];
      stepper.render();
    }
    document.body.classList.add("ambient-mode");
    document.getElementById("ambientSceneName").textContent = AMBIENT_SCENES[state.scene].name;
    document.getElementById("ambientSeed").textContent = "PIECE " + state.seed.toString(16).toUpperCase().padStart(8, "0");
  }
  document.getElementById("newAmbient").onclick = onNew;
  refresh();
  return { refresh, nav };
}
function drawAmbient({ c, w, h }, settings, status, time, level, points) {
  c.clearRect(0, 0, w, h);
  const t = time * 1e-3, center = h * 0.52;
  for (let line = 0; line < 20; line++) {
    const p = line / 19;
    c.strokeStyle = `rgb(${Math.round(40 + p * 135)},${Math.round(40 + p * 135)},${Math.round(40 + p * 135)})`;
    c.lineWidth = 1;
    c.beginPath();
    for (let x = 0; x <= w; x += 3) {
      const u = x / w, envelope = Math.sin(u * Math.PI), wave = Math.sin(u * 8 + t * 0.13 + line * 0.22) * Math.sin(u * 3 - t * 0.07) * envelope * (12 + settings.evolution * 0.35);
      let bend = 0;
      for (const point of points) {
        const distance = (u - point.x) * 5;
        bend += (point.y - 0.36) * h * 0.24 * Math.exp(-distance * distance);
      }
      const y = center + (p - 0.5) * h * 0.36 + wave * (0.4 + p * 0.6) + bend;
      x ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.stroke();
  }
  c.fillStyle = "#777";
  for (let i = 0; i < 36; i++) {
    const x = i * 73.7 % w, y = i * 37.3 % (h * 0.7);
    if (y < center - 20) c.fillRect(Math.floor(x), Math.floor(y), 1, 1);
  }
}
export {
  drawAmbient,
  setupAmbientUI
};
