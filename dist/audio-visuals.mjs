import { attachStepper, ensureVisibleSelection } from "./phone-ui.mjs?v=hushfield-1";
import { ditherCanvas } from "./oled-visuals.mjs?v=hushfield-1";
import { VISUAL_DEFAULTS, restoreVisual, createVisualCapture, stereoMetrics, vectorPoint, scopeWindow, spectrumBands, decayPeak } from "./visual-analysis.mjs?v=hushfield-1";
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
function drawVisualGrid(c, w, h, mode, maxHz = 2e4, compact = false) {
  c.strokeStyle = "#333";
  c.lineWidth = 1;
  c.font = "8px monospace";
  c.fillStyle = "#999";
  const top = compact ? 5 : 12, bottom = h - (compact ? 5 : 34);
  if (mode === "vector") {
    const x = w / 2, y = (top + bottom) / 2, r = Math.max(12, Math.min(w * 0.43, (bottom - top) * 0.48));
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.moveTo(x - r, y);
    c.lineTo(x + r, y);
    c.moveTo(x, y - r);
    c.lineTo(x, y + r);
    c.moveTo(x - r * 0.707, y - r * 0.707);
    c.lineTo(x + r * 0.707, y + r * 0.707);
    c.moveTo(x + r * 0.707, y - r * 0.707);
    c.lineTo(x - r * 0.707, y + r * 0.707);
    c.stroke();
    c.fillText("L", x - r * 0.78, y - r * 0.74);
    c.fillText("R", x + r * 0.78, y - r * 0.74);
    return { x, y, r };
  }
  for (let i = 0; i <= 4; i++) {
    const y = top + (bottom - top) * i / 4;
    c.beginPath();
    c.moveTo(24, y);
    c.lineTo(w - 10, y);
    c.stroke();
  }
  for (const tick of mode === "spectrum" ? [20, 50, 100, 200, 500, 1e3, 2e3, 5e3, 1e4, maxHz] : [0, 1, 2, 3, 4, 5, 6, 7, 8]) {
    if (mode === "spectrum" && tick > maxHz) continue;
    const fraction = mode === "spectrum" ? Math.log(tick / 20) / Math.log(maxHz / 20) : tick / 8, x = 24 + (w - 34) * fraction;
    c.beginPath();
    c.moveTo(x, top);
    c.lineTo(x, bottom);
    c.stroke();
  }
  return { left: 24, right: w - 10, top, bottom };
}
// Shared signed line treatment for Scope and the source-position waveform.
function drawScopeTrace(c, samples, {left, right, cy, amplitude, gain = 1, start = 0, count = samples.length, interpolate = false}) {
  c.beginPath();
  const width = Math.max(1, right - left);
  for (let px = 0; px <= Math.round(width); px++) {
    const index = Math.min(Math.max(0, count - 1), px / width * Math.max(0, count - 1));
    const at = start + Math.floor(index), next = Math.min(samples.length - 1, at + 1);
    const value = samples[at] || 0;
    const sample = interpolate ? value + ((samples[next] || 0) - value) * (index % 1) : value;
    const x = left + px, y = cy - clamp(sample * gain, -1, 1) * amplitude;
    px ? c.lineTo(x, y) : c.moveTo(x, y);
  }
  c.stroke();
}
function createVisualRenderer(makeCanvas = () => document.createElement("canvas")) {
  const trail = makeCanvas(), tc = trail.getContext("2d", { willReadFrequently: true });
  let mode, peaks = new Float32Array(64), autoGain = 1;
  function clear() {
    tc.clearRect(0, 0, trail.width, trail.height);
    peaks.fill(-120);
    autoGain = 1;
  }
  function draw({ c, w, h }, data, state, dt, options = {}) {
    if (trail.width !== Math.round(w) || trail.height !== Math.round(h) || mode !== state.mode) {
      trail.width = Math.round(w);
      trail.height = Math.round(h);
      mode = state.mode;
      clear();
    }
    dt = clamp(dt, 1e-3, 0.1);
    const metrics = stereoMetrics(data.left, data.right);
    const target = metrics.peak > 5e-4 ? Math.min(24, 0.72 / Math.max(0.02, metrics.peak)) : 1;
    autoGain += (target - autoGain) * (1 - Math.exp(-dt / (target < autoGain ? 0.035 : 0.35)));
    const gain = state.gain * (state.auto ? autoGain : 1);
    c.fillStyle = "#000";
    c.fillRect(0, 0, w, h);
    if (options.hideSilent && metrics.rms <= 1e-4) {
      clear();
      return metrics;
    }
    const grid = options.frameless ? {left:8,right:w-8,top:5,bottom:h-5} : drawVisualGrid(c, w, h, state.mode, Math.min(2e4, data.rate / 2), options.compact);
    if (state.mode === "spectrum") {
      const bands = spectrumBands(data.db, data.rate, data.fftSize), { left, right, top, bottom } = grid, bw = (right - left) / 64;
      const gradient = c.createLinearGradient(0, bottom, 0, top);
      gradient.addColorStop(0, "#333");
      gradient.addColorStop(1, "#eee");
      c.fillStyle = gradient;
      for (let i = 0; i < 64; i++) {
        const value = Number.isFinite(bands[i]) ? bands[i] : -state.range;
        peaks[i] = decayPeak(peaks[i], value, dt, state.peak);
        const height = clamp((value + state.range) / state.range, 0, 1) * (bottom - top);
        c.fillRect(left + i * bw, bottom - height, Math.max(1, bw - 1), height);
        const py = bottom - clamp((peaks[i] + state.range) / state.range, 0, 1) * (bottom - top);
        if (peaks[i] > -state.range) {
          c.fillStyle = "#fff";
          c.fillRect(left + i * bw, py, Math.max(1, bw - 1), 1);
          c.fillStyle = gradient;
        }
      }
      c.fillStyle = "#aaa";
      c.fillText("0", 2, top + 6);
      c.fillText("-" + Math.round(state.range / 2), 2, (top + bottom) / 2 + 3);
      c.fillText("-" + state.range, 1, bottom);
      for (const [label, hz] of [["20", 20], ["100", 100], ["1k", 1e3], ["10k", 1e4]]) {
        const x = left + Math.log(hz / 20) / Math.log(Math.min(2e4, data.rate / 2) / 20) * (right - left);
        c.fillText(label, x, bottom + 12);
      }
    } else {
      tc.globalCompositeOperation = "destination-out";
      tc.fillStyle = "rgba(0,0,0," + (state.trail ? 1 - Math.exp(-dt / (0.035 + state.trail * 6e-3)) : 1) + ")";
      tc.fillRect(0, 0, w, h);
      tc.globalCompositeOperation = "source-over";
      tc.lineWidth = 1;
      tc.strokeStyle = "#eee";
      if (state.mode === "scope") {
        const lanes = options.single ? 1 : 2;
        // A single trace follows the louder channel, retaining right-only and
        // opposite-phase output that an L+R average could erase.
        const singleSamples = options.single && data.right.reduce((sum,v)=>sum+v*v,0) > data.left.reduce((sum,v)=>sum+v*v,0) ? data.right : data.left;
        const { left, right, top, bottom } = grid, win = options.overview ? {start:0,count:singleSamples.length} : scopeWindow(singleSamples, data.rate * state.time / 1e3), span = (bottom - top) / lanes;
        for (let channel = 0; channel < lanes; channel++) {
          const samples = options.single ? singleSamples : channel ? data.right : data.left, cy = top + span * (channel + 0.5);
          tc.strokeStyle = channel ? "#aaa" : "#fff";
          drawScopeTrace(tc, samples, {left, right, cy, amplitude: span * .45, gain, start: win.start, count: win.count});
          if (!options.frameless) {
            c.fillStyle = "#aaa";
            c.fillText(channel ? "R" : "L", 5, cy + 3);
          }
        }
      } else {
        const { x, y, r } = grid;
        tc.beginPath();
        const hop = Math.max(1, Math.floor(data.left.length / 1600));
        for (let i = 0; i < data.left.length; i += hop) {
          const p = vectorPoint(data.left[i], data.right[i]), px = x + clamp(p.x * gain, -1, 1) * r, py = y - clamp(p.y * gain, -1, 1) * r;
          i ? tc.lineTo(px, py) : tc.moveTo(px, py);
        }
        tc.stroke();
      }
      c.drawImage(trail, 0, 0);
    }
    if (options.dither !== false) ditherCanvas(c.canvas);
    return metrics;
  }
  return { draw, clear };
}
function setupAudioVisuals({ onChange = () => {
} } = {}) {
  let state = { ...VISUAL_DEFAULTS }, held = false, capture, lastData, lastWidth = 0, lastHeight = 0, lastMetrics = { peak: 0, rms: 0, correlation: null };
  const renderer = createVisualRenderer(), outputRenderer = createVisualRenderer(), page = document.getElementById("visualPage"), canvas = document.getElementById("visualCanvas");
  page.innerHTML = '<nav class="visual-modes" aria-label="Visual mode"></nav><div class="visual-actions"><button type="button" id="visualAuto">Auto gain</button><button type="button" id="visualHold">Hold picture</button><span id="visualSignal">POST FX · PICTURE ONLY</span></div><div class="visual-fields"></div><p id="visualHelp" class="visual-help"></p>';
  const nav = page.querySelector(".visual-modes"), fields = page.querySelector(".visual-fields"), records = [];
  const caption = document.querySelector(".visual-caption");
  caption.innerHTML = '<span id="visualCaption">SPECTRUM</span><span id="visualReadout">START SOUND TO VIEW</span>';
  const stage = document.getElementById('visualStage');
  const probe = document.createElement('div'); probe.className = 'visual-probe'; probe.hidden = true;
  probe.innerHTML = '<span class="visual-probe-line"></span><output class="visual-probe-label"></output><input id="visualProbe" type="range" min="0" max="1000" step="1" value="566" aria-label="Inspect spectrum frequency">';
  stage.append(probe);
  const probeInput = probe.querySelector('input'), probeLine = probe.querySelector('.visual-probe-line'), probeLabel = probe.querySelector('output');
  let probeFraction = .566, probing = false, probeUsed = false;
  function updateProbe() {
    stage.dataset.mode = state.mode;
    probe.hidden = state.mode !== 'spectrum';
    const data = lastData || empty, maxHz = Math.min(20000, data.rate / 2), hz = 20 * (maxHz / 20) ** probeFraction;
    const bin = Math.min(data.db.length - 1, Math.round(hz / (data.rate / data.fftSize))), db = data.db[bin];
    const text = (hz >= 1000 ? (hz / 1000).toFixed(2)+' kHz' : Math.round(hz)+' Hz') + ' · ' + (Number.isFinite(db) ? db.toFixed(1)+' dBFS' : 'no signal');
    const width = canvas.clientWidth, x = 24 + Math.max(0,width-34) * probeFraction;
    probeLine.style.left = x+'px'; probeLabel.style.left = Math.max(75,Math.min(width-75,x))+'px';
    probeLine.hidden = !probeUsed; probeLabel.textContent = probeUsed ? text : 'Drag spectrum to inspect';
    probeInput.value = Math.round(probeFraction*1000); probeInput.setAttribute('aria-valuetext',text);
  }
  function positionProbe(event) { const rect=canvas.getBoundingClientRect();probeFraction=clamp((event.clientX-rect.left-24)/Math.max(1,rect.width-34),0,1);probeUsed=true;updateProbe(); }
  canvas.addEventListener('pointerdown',event=>{if(state.mode!=='spectrum'||event.button!==0)return;event.preventDefault();probing=true;canvas.setPointerCapture(event.pointerId);positionProbe(event);});
  canvas.addEventListener('pointermove',event=>{if(probing)positionProbe(event);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>probing=false);
  probeInput.addEventListener('input',()=>{probeFraction=+probeInput.value/1000;probeUsed=true;updateProbe();});
  const historyEvent = (type,label) => page.dispatchEvent(new CustomEvent('hushfield:'+type,{bubbles:true,detail:{label,source:'visual'}}));
  const descriptions = { scope: "Stereo waveforms. Time sets the window; gain and trails shape the display.", spectrum: "Logarithmic frequency bands with falling peaks. Levels show the post-effects mix.", vector: "Stereo phase portrait. Mono is vertical; opposite-phase audio spreads horizontally." };
  for (const [mode, label] of [["scope", "Scope"], ["spectrum", "Spectrum"], ["vector", "Vector"]]) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.dataset.visualMode = mode;
    button.addEventListener("click", () => {
      historyEvent("editstart", "visual mode");
      state.mode = mode;
      onChange();
      held = false;
      renderer.clear();
      refresh();
      ensureVisibleSelection();
      historyEvent("editend", "visual mode");
    });
    nav.append(button);
  }
  for (const field of [{ id: "gain", label: "Gain", min: 0.5, max: 8, step: 0.5, modes: ["scope", "vector"], format: (v) => v.toFixed(1) + "×" }, { id: "time", label: "Time", min: 10, max: 100, step: 5, modes: ["scope"], format: (v) => v + " ms" }, { id: "trail", label: "Trails", min: 0, max: 100, step: 5, modes: ["scope", "vector"] }, { id: "range", label: "Range", min: 48, max: 120, step: 12, modes: ["spectrum"], format: (v) => v + " dB" }, { id: "smoothing", label: "Smoothing", min: 0, max: 95, step: 5, modes: ["spectrum"] }, { id: "peak", label: "Peak decay", min: 0, max: 100, step: 5, modes: ["spectrum"] }]) {
    const row = document.createElement("div");
    row.className = "control";
    const top = document.createElement("div");
    top.className = "control-top";
    const label = document.createElement("label");
    label.textContent = field.label;
    label.htmlFor = "visual-" + field.id;
    top.append(label);
    const input = document.createElement("input");
    input.type = "range";
    input.id = label.htmlFor;
    input.min = field.min;
    input.max = field.max;
    input.step = field.step;
    input.value = state[field.id];
    row.append(top, input);
    fields.append(row);
    const stepper = attachStepper(row, input, { label: "Visual " + field.label, step: field.step, format: field.format || ((v) => v + "%") });
    input.addEventListener("input", () => {
      state[field.id] = +input.value;
      onChange();
    });
    records.push({ row, input, field, stepper });
  }
  const auto = document.getElementById("visualAuto"), hold = document.getElementById("visualHold");
  auto.onclick = () => {
    historyEvent("editstart", "display auto gain");
    state.auto = !state.auto;
    onChange();
    refresh();
    historyEvent("editend", "display auto gain");
  };
  hold.onclick = () => {
    held = !held;
    // The transport continues reading the capture while this picture is held.
    if (held && lastData) lastData = {...lastData,left:lastData.left.slice(),right:lastData.right.slice(),db:lastData.db.slice()};
    refresh();
  };
  function refresh() {
    page.dataset.visualMode = state.mode;
    probe.hidden = state.mode !== "spectrum";
    stage.dataset.mode = state.mode;
    nav.querySelectorAll("button").forEach((button) => {
      const active = button.dataset.visualMode === state.mode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    auto.disabled = state.mode === "spectrum";
    auto.textContent = state.mode === "spectrum" ? "LOG FREQUENCY" : state.auto ? "AUTO GAIN ON" : "AUTO GAIN OFF";
    auto.setAttribute("aria-pressed", String(state.mode !== "spectrum" && state.auto));
    hold.textContent = held ? "Resume picture" : "Hold picture";
    hold.setAttribute("aria-pressed", String(held));
    document.getElementById("visualHelp").textContent = descriptions[state.mode];
    document.getElementById("visualCaption").textContent = state.mode.toUpperCase();
    canvas.setAttribute("aria-label", { scope: "Live stereo oscilloscope", spectrum: "Live logarithmic audio spectrum", vector: "Live stereo vectorscope" }[state.mode]);
    for (const { row, input, field, stepper } of records) {
      row.hidden = !field.modes.includes(state.mode);
      input.value = state[field.id];
      stepper.render();
    }
  }
  const empty = { left: new Float32Array(8192), right: new Float32Array(8192), db: new Float32Array(4096).fill(-Infinity), rate: 48e3, fftSize: 8192 };
  refresh();
  return { connect(context, source) {
    capture?.dispose();
    capture = createVisualCapture(context, source);
    renderer.clear();
    outputRenderer.clear();
  }, outputFrame(fit, dt, reducedMotion = false) {
    const data = capture?.read(0, false) || empty;
    const metrics = outputRenderer.draw(fit, data,
      // Twice the previous width: retain the same horizontal waveform scale.
      {...VISUAL_DEFAULTS,mode:'scope',time:40,trail:reducedMotion ? 0 : VISUAL_DEFAULTS.trail}, dt, {single:true,frameless:true,hideSilent:true});
    fit.c.canvas.dataset.signal = String(metrics.rms > 1e-4);
  }, frame(fit, dt) {
    if (held && fit.w === lastWidth && fit.h === lastHeight) { updateProbe(); return; }
    const data = held ? lastData || empty : capture?.read(state.smoothing, state.mode === "spectrum") || empty;
    lastData = data;
    lastWidth = fit.w;
    lastHeight = fit.h;
    lastMetrics = renderer.draw(fit, data, state, held ? 1e-3 : dt);
    const signal = lastMetrics.rms > 1e-4;
    const readout = state.mode === "scope" ? "L / R · " + state.time + " ms" : state.mode === "spectrum" ? "20 Hz — " + Math.round(Math.min(2e4, data.rate / 2) / 1e3) + " kHz" : lastMetrics.correlation === null ? "CORR —" : "CORR " + (lastMetrics.correlation >= 0 ? "+" : "") + lastMetrics.correlation.toFixed(2);
    const el = document.getElementById("visualReadout"), value = signal ? readout : "NO SIGNAL · " + readout;
    if (el.textContent !== value) el.textContent = value;
    canvas.dataset.signal = String(signal);
    canvas.dataset.correlation = String(lastMetrics.correlation);
    updateProbe();
  }, setWaveformSmoothing(value) {
    state.waveformSmoothing = Math.round(clamp(value, 0, 100)); onChange();
  }, settings: () => ({ ...state }), restore(saved) {
    state = restoreVisual(saved);
    held = false;
    renderer.clear();
    refresh();
    ensureVisibleSelection();
  } };
}
export {
  createVisualRenderer,
  drawVisualGrid,
  drawScopeTrace,
  setupAudioVisuals
};
