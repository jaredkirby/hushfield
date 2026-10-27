import { INSTRUMENT_LABELS, INSTRUMENT_HELP } from './foundation-instruments.mjs';
import { FOUNDATION_PRESETS, matchingFoundationPreset } from './foundation-presets.mjs';
import { AMBIENT_FIELDS, AMBIENT_SCENES, AMBIENT_KEYS, AMBIENT_SCALES, applyAmbientScene } from "./ambient-settings.mjs?v=hushfield-1";
import { attachStepper, panelNav } from "./phone-ui.mjs?v=hushfield-1";
function setupAmbientUI({ getState, onChange, onNew, onInstrument, onPreset }) {
  const page = document.getElementById("ambientPage"), fields = page.querySelector(".ambient-fields"), records = [];
  const nav = panelNav(page, [["compose", "Compose"], ["sound", "Sound"], ["layers", "Voices"]], (key) => {
    fields.querySelectorAll(".control").forEach((row) => row.hidden = row.dataset.group !== key);
    refreshHelp();
  }, { className: "ambient-panel-tabs", ariaLabel: "Ambient control pages" });
  function refreshHelp() {
    page.querySelector('.ambient-help').textContent = page.dataset.controlPanel === 'sound'
      ? (getState().compositionVersion === 1 ? 'Classic voice. Adjust Sound to use the evolving voice. ' : '') + INSTRUMENT_HELP[getState().instrument || 'current'] + ' Starting presets change Foundation tone and voices; Scene and Tape stay as set.'
      : 'Voice dots: pitch ↑↓ · stereo ←→. Scene shapes Foundation; Whole piece replaces all parts and effects.';
  }
  const instrumentRow=document.createElement('div');
  instrumentRow.className='control direct-control';instrumentRow.dataset.group='sound';instrumentRow.hidden=true;
  const instrumentLabel=document.createElement('label');instrumentLabel.htmlFor='ambient-instrument';instrumentLabel.textContent='Instrument';
  const instrumentSelect=document.createElement('select');instrumentSelect.id='ambient-instrument';instrumentSelect.className='parameter-choice';
  for(const [id,name] of Object.entries(INSTRUMENT_LABELS)){const option=document.createElement('option');option.value=id;option.textContent=name;instrumentSelect.append(option);}
  instrumentRow.append(instrumentLabel,instrumentSelect);fields.append(instrumentRow);
  const instrumentStepper=attachStepper(instrumentRow,instrumentSelect,{label:'Foundation Instrument',format:()=>INSTRUMENT_LABELS[instrumentSelect.value]});
  instrumentSelect.addEventListener('change',()=>onInstrument(instrumentSelect.value));
  const presetRow=document.createElement('div');
  presetRow.className='control direct-control';presetRow.dataset.group='sound';presetRow.hidden=true;
  const startingLabel=document.createElement('label');startingLabel.htmlFor='ambient-preset';startingLabel.textContent='Starting preset';
  const startingSelect=document.createElement('select');startingSelect.id='ambient-preset';
  for(const preset of FOUNDATION_PRESETS){const option=document.createElement('option');option.value=preset.id;option.textContent=preset.label;startingSelect.append(option);}
  presetRow.append(startingLabel,startingSelect);fields.append(presetRow);
  const presetStepper=attachStepper(presetRow,startingSelect,{label:'Foundation starting preset',format:()=>{
    const preset=FOUNDATION_PRESETS.find(preset=>preset.id===startingSelect.value);
    return preset ? preset.label : 'Custom settings';
  }});
  // Keep the shared adjustment rail's flat ordering while grouping the native menu.
  const presetMenu=presetStepper.inputElement;
  presetMenu.querySelector('option[value=""]').textContent='Custom settings';
  for(const [instrument,label] of Object.entries(INSTRUMENT_LABELS)){
    const group=document.createElement('optgroup');group.label=label;
    for(const preset of FOUNDATION_PRESETS.filter(preset=>preset.instrument===instrument))group.append(presetMenu.querySelector(`option[value="${preset.id}"]`));
    presetMenu.append(group);
  }
  const presetDescription=document.createElement('p');presetDescription.id='ambient-preset-description';presetDescription.className='muted';
  presetMenu.setAttribute('aria-describedby',presetDescription.id);presetRow.append(presetDescription);
  startingSelect.addEventListener('change',()=>onPreset(startingSelect.value));
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
    const choices = field.id === "scene" ? AMBIENT_SCENES.map(s => s.name) : field.id === "key" ? AMBIENT_KEYS : field.id === "scale" ? AMBIENT_SCALES : undefined;
    const stepper = attachStepper(row, input, { choices, label: "Foundation " + field.label, step: field.step, format: field.format || ((v) => v + "%") });
    records.push({ field, input, stepper });
    input.addEventListener("input", () => {
      const state = getState();
      if (field.id === "scene") applyAmbientScene(state, +input.value);
      else state[field.id] = +input.value;
      if (field.group === 'sound') state.compositionVersion = 2;
      refresh();
      onChange(field.id);
    });
  }
  function refresh() {
    const state = getState();
    instrumentSelect.value=state.instrument || 'current';
    instrumentStepper.render();
    const startingPreset=matchingFoundationPreset(state);
    startingSelect.value=startingPreset?.id || '';
    presetStepper.render();
    presetDescription.textContent=startingPreset?.description || 'Your current Foundation sound. Choose a starting preset, then shape it with the controls.';
    for (const { field, input, stepper } of records) {
      input.value = state[field.id];
      stepper.render();
    }
    document.body.classList.add("ambient-mode");
    document.getElementById("ambientSceneName").textContent = AMBIENT_SCENES[state.scene].name;
    document.getElementById("ambientSeed").textContent = "PIECE " + state.seed.toString(16).toUpperCase().padStart(8, "0");
    refreshHelp();
  }
  const preset = document.getElementById("piecePreset"), presetLabel = document.createElement('label');
  presetLabel.className = 'piece-preset-label'; presetLabel.htmlFor = preset.id; presetLabel.textContent = 'Whole piece';
  preset.before(presetLabel);
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
