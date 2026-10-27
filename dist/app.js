import { createControlHistory } from "./control-history.mjs";
import { setupVisualEditors } from "./visual-editors.mjs";
import { setupMotionControls } from "./motion-controls.mjs";
import { TAPE_PRESETS, applyTapePreset, matchingTapePreset } from "./tape-presets.mjs";
import { TAPE_DEFAULTS, SPACE_ECHO_DEFAULTS, SPACE_ECHO_MODES } from "./tape-settings.mjs";
import { TAPE_PHYSICS_DEFAULTS } from "./tape-physics-settings.mjs";
import { applyFoundationPreset } from "./foundation-presets.mjs";
import { selectPiecePreset } from "./piece-presets.mjs";
import { restorePiece, piecePlayback } from "./piece-session.mjs";
import { followChord } from "./piece-harmony.mjs";
import { createPieceSpace } from "./piece-space.mjs";
import { setupSpaceControls } from './space-controls.mjs';
import { drawSpaceReverb } from './space-reverb-visual.mjs';
import { setupSpacePlateControls } from './space-plate-controls.mjs';
import { SPACE_DEFAULTS, SPACE_FIELDS } from "./space-settings.mjs";
import { createRenderClock } from "./render-clock.mjs";
import { createProcessorGuard, releaseAudioGraph } from "./audio-lifecycle.mjs";
import { setupPieceBlend } from "./piece-blend.mjs";
import { setupRecoveryUI } from "./recovery-ui.mjs";
import { createSampleSelection } from "./sample-selection.mjs";
import { createOutputCapture } from "./output-capture.mjs";
import { createMicrophoneTake } from "./microphone-take.mjs";
import { serializeProject, decodeProject } from "./project-file.mjs?v=hushfield-1";
import { setupAudioVisuals, createVisualRenderer } from "./audio-visuals.mjs?v=hushfield-1";
import { setupAmbientPoints } from "./ambient-interaction.mjs?v=hushfield-1";
import { ambientVisualSeconds, outputAudioTime } from "./ambient-points.mjs?v=hushfield-1";
import { AMBIENT_DEFAULTS, AMBIENT_SCENES, AMBIENT_KEYS, AMBIENT_SCALES, ambientChord, ambientChordName, restoreAmbient } from "./ambient-settings.mjs?v=hushfield-1";
import { setupAmbientUI, drawAmbient } from "./ambient-ui.mjs?v=hushfield-1";
import { prepareTextureWave } from "./texture-wave.mjs";
import { setupTextureAdjustments } from "./texture-adjustments.mjs";
import { setupSquareViewport } from "./square-viewport.mjs";
import { ditherCanvas, drawTape } from "./oled-visuals.mjs?v=hushfield-1";
import { PAD_COUNT, MAX_PADS, ORBIT_SCALES as scales, crossedPads, padAngle, padGeometry, padSound } from "./orbit-pads.mjs?v=hushfield-1";
import { attachStepper, phoneStepFor, setupPhoneUI, setupSharedAdjuster, ensureVisibleSelection, panelNav } from "./phone-ui.mjs?v=hushfield-1";
import { createSoundState, patchFor, editSound, resetSound, restoreSoundState, soundMidi, noteName } from "./sound-patches.mjs?v=hushfield-1";
import { createOrbitAudio } from "./orbit-audio.mjs?v=hushfield-1";
import { setupSoundEditors } from "./sound-editor.mjs?v=hushfield-1";
import { requestPlaybackSession, resumeFromTap, verifyAudioClock, playTestNotes } from "./audio-startup.mjs?v=hushfield-1";
import { boundary, containBalls, makeOrbitState, shapePoints } from "./orbit-physics.mjs?v=hushfield-1";
const $ = (id) => document.getElementById(id);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const initial = { sampleLevel: 100, orbitLevel: 100, position: 50, size: 320, density: 18, spray: 24, pitch: 0, scanOn: true, scanMode: "forward", range: 100, wander: 10, speed: 0.22, smooth: 0, static: 0, jump: 0, hold: 0, reverse: 15, elastic: 0, chaos: 0, freeze: false, cutoff: 14e3, resonance: 0.6, ...TAPE_DEFAULTS, ...SPACE_ECHO_DEFAULTS, ...TAPE_PHYSICS_DEFAULTS, ...SPACE_DEFAULTS, reverb: 30, width: 75, trimStart: 0, trimEnd: 100, denoise: 0, orbitTriggers: 8, orbitBalls: 5, orbitGravity: 35, orbitBounce: 84, orbitSpin: 12, orbitRotation: 0, orbitOctave: 0, orbitAttack: 0.01, orbitRelease: 1.5, orbitReverb: 70, orbitVolume: 35 };
const freshPiece = selectPiecePreset("still", { defaults: initial, cancelPending() {} });
let recovery, restoringSession = false, sampleDecoder;
let visualEditors, motionControls, controlHistory, textureAdjustments, spaceControlsUI, spacePlateUI, spaceAnalyser;
const spaceSamples = new Float32Array(512);
let piece = restorePiece(), solo = null, foundationLayer, spaceBus, harmonyChannel, texturePhraseChannel;
let phraseRequest, nextPhraseId = 0, foundationReady = false, motionReady = false, textureReady = false;
function markEdited() {
  renderClock.invalidate();
  if (!restoringSession) recovery?.edited();
}
function decodeContext() {
  if (ctx) return ctx;
  const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!Offline) throw new Error("Tap Start once before loading audio on this browser.");
  return sampleDecoder ||= new Offline(2, 1, 48e3);
}
let params = freshPiece.params, ctx, engine, master, filter, reverbWet, analyser, recordDestination, buffer, originalBuffer, sourceName = "Glass garden", demoKey = "glass", running = false, activeTab = "ambient", stats = { scan: 0.5, count: 0, peak: 0, grains: [] }, outputRecording = false, micRecording = false, previewNode, toastTimer, balls = [], lastFrame = 0, lastMeter = 0, orbitVoices = /* @__PURE__ */ new Set(), audioReady = false, playPending = false;
const ranges = {};
const textureScopeRenderer = createVisualRenderer();
let textureScopeContext;
let reportedOrbitVoices = 0;
let blendUI, visuals, volumeStepper, shapeStepper, soundEditors, showOrbitPanel, orbitAudio, limiter, tapeNode;
let tapeVisualSnapshot = null, tapeVisualSubscribed = false;
function syncTapeVisualSubscription() {
  const enabled = activeTab === "tape" && !document.hidden;
  if (tapeNode && enabled !== tapeVisualSubscribed) {
    tapeVisualSubscribed = enabled;
    tapeNode.port.postMessage({ type: "visuals", enabled });
  }
}
document.addEventListener("visibilitychange", syncTapeVisualSubscription);
let ambientState = freshPiece.ambient, ambientUI, ambientPoints, ambientPointsDirty = false, ambientNode, ambientStats = { elapsed: 0, chord: "Cm7", chordNotes: [36, 51, 55, 58], next: 48, notes: 0, section: 1 }, grainLayer, orbitLayer;
let audioGeneration = 0, restartPending = false, clockSnapshot;
let soundState = freshPiece.soundState;
const orbitState = makeOrbitState();
const padButtons = [], padFlashes = Array(MAX_PADS).fill(-Infinity);
let paddleFlash = -Infinity;
function toast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("visible"), 4500);
}
function makeControl(parent, id, label, min, max, step, unit = "", display, choices) {
  const row = document.createElement("div");
  row.className = "control";
  row.dataset.control = id;
  const top = document.createElement("div");
  top.className = "control-top";
  const lab = document.createElement("label");
  lab.htmlFor = id;
  lab.textContent = typeof label === "function" ? label() : label;
  const out = document.createElement("output");
  out.htmlFor = id;
  const input = document.createElement("input");
  input.type = "range";
  input.id = id;
  input.min = min;
  input.max = max;
  input.step = step;
  input.value = params[id];
  input.setAttribute("aria-label", lab.textContent);
  top.append(lab, out);
  row.append(top, input);
  $(parent).append(row);
  const format = (v) => display ? display(v) : `${Number(v).toFixed(step < 1 ? step < 0.1 ? 2 : 1 : 0)}${unit}`;
  let stepper;
  const descriptions = { position: "Choose where Texture reads within the phrase.", size: "Long grains make a smooth cloud; short grains make fragments.", density: "More grains overlap into a thicker texture.", spray: "Spread grains across more of the source phrase.", pitch: "Shift Texture higher or lower in semitones.", cutoff: "Darken or brighten the whole piece.", width: "Move the whole piece from mono to stereo." };
  if (descriptions[id]) row.addEventListener("click", () => {
    $("pieceHint").textContent = descriptions[id];
  });
  const render = () => {
    lab.textContent = typeof label === "function" ? label() : label;
    input.setAttribute("aria-label", lab.textContent);
    out.value = format(+input.value);
    input.style.background = `linear-gradient(to right, #a17956 0%, #a17956 ${(input.value - min) / (max - min) * 100}%, #384548 ${(input.value - min) / (max - min) * 100}%, #384548 100%)`;
    stepper?.render();
  };
  stepper = attachStepper(row, input, { label, step: phoneStepFor(id, step), format, choices });
  ranges[id] = { input, render };
  input.addEventListener("input", () => {
    params[id] = +input.value;
    if (SPACE_FIELDS.some(field => field.id === id)) params.spaceVersion = 2;
    if (id === "trimStart") params.trimStart = Math.min(params.trimStart, params.trimEnd - .1);
    if (id === "trimEnd") params.trimEnd = Math.max(params.trimEnd, params.trimStart + .1);
    input.value = params[id];
    render();
    if (["tapeModel", "echoMode"].includes(id)) refreshTapeControls();
    syncEngine();
    if (id === "orbitBalls") {
      resizeBalls();
      soundEditors?.refresh();
    }
    if (id === "orbitTriggers") {
      resizePads();
      soundEditors?.refresh();
    }
    if (id === "orbitSpin") updateOrbitReadout();
    if (id === "orbitRotation") containBalls(orbitState, orbitOptions());
    if (id === "orbitOctave") updatePadLabels();
    if (id.startsWith("trim")) trimInfo();
  });
  render();
}
makeControl("grainControls", "position", "Position", 0, 100, 0.1, "%", (v) => v.toFixed(1) + "%");
makeControl("grainControls", "size", "Grain length", 15, 1500, 1, " ms");
makeControl("grainControls", "density", "Density", 1, 80, 0.1, " /s");
makeControl("grainControls", "spray", "Position scatter", 0, 100, 1, "%");
makeControl("grainControls", "pitch", "Pitch", -24, 24, 1, " st", (v) => (v >= 0 ? "+" : "") + v + " st");
makeControl("scanControls", "range", "Range", 1, 100, 1, "%");
makeControl("scanControls", "wander", "Wander", 0, 100, 1, "%");
makeControl("scanControls", "speed", "Speed", 0, 2, 0.01, "\xD7");
makeControl("scanControls", "smooth", "Smoothing", 0, 100, 1, "%");
for (const [id, label] of [["static", "Repeat position"], ["jump", "Jump chance"], ["hold", "Skip grain"], ["reverse", "Reverse chance"], ["elastic", "Pitch variation"], ["chaos", "Timing variation"]]) makeControl("motionControls", id, label, 0, 100, 1, "%");
makeControl("trimControls", "trimStart", "Start", 0, 99.9, 0.1, "%");
makeControl("trimControls", "trimEnd", "End", 0.1, 100, 0.1, "%");
makeControl("trimControls", "denoise", "Denoise gate", 0, 80, 1, "%", (v) => v === 0 ? "Off" : v + "%");
makeControl("filterControls", "cutoff", "Cutoff", 100, 2e4, 1, " Hz", (v) => v >= 1e3 ? (v / 1e3).toFixed(1) + " kHz" : v + " Hz");
makeControl("filterControls", "resonance", "Resonance", 0.1, 12, 0.1, " Q");
makeControl("delayControls", "delayTime", () => params.tapeModel === 2 ? "Head 3 time" : "Time", 0.05, 1.5, 0.01, " s");
makeControl("delayControls", "feedback", "Feedback", 0, 80, 1, "%");
makeControl("delayControls", "delayMix", "Echo level", 0, 70, 1, "%");
makeControl("spaceControls", "reverb", "Amount", 0, 85, 1, "%");
makeControl("spaceControls", "width", "Stereo width", 0, 100, 1, "%");
const depthGroup = document.createElement("div");
depthGroup.className = "control-group";
depthGroup.innerHTML = '<div class="group-title"><h3>Depth</h3><span>PART ROOM</span></div><div id="depthControls"></div>';
$("fxPage").querySelector(".control-grid").append(depthGroup);
for (const field of SPACE_FIELDS) makeControl("depthControls", field.id, field.label, field.min, field.max, field.step, field.unit);
for (const [id, label] of [["drive", "Drive"], ["wow", "Wow"], ["flutter", "Flutter"], ["hiss", "Hiss"], ["tapeTone", "Tone"]]) makeControl("tapeControls", id, label, 0, 100, 1, "%");
for (const [id, label, help] of [
  ["tapeSurfaceTension", "Surface tension", "Resistance as the tape slides across the tray. Higher values slow loose tape movement."],
  ["tapeStiffness", "Tape stiffness", "Resistance to bending. Higher values make wider, firmer folds."]
]) {
  makeControl("tapeControls", id, label, 0, 100, 1, "%");
  const row = $(id).closest(".control");
  row.title = help;
  const description = document.createElement("span");
  description.id = id + "Description";
  description.hidden = true;
  description.textContent = help;
  row.append(description);
  $(id).setAttribute("aria-describedby", description.id);
  row.querySelector(".parameter-value").setAttribute("aria-describedby", description.id);
}
makeControl("tapeControls", "tapeModel", "Tape model", 1, 2, 1, "", value => value === 2 ? "Space Echo" : "Classic", [{ value: 1, label: "Classic" }, { value: 2, label: "Space Echo" }]);
makeControl("tapeControls", "echoMode", "Head mode", 1, 12, 1, "", value => SPACE_ECHO_MODES[value - 1].label, SPACE_ECHO_MODES);
makeControl("tapeControls", "springMix", "Spring level", 0, 70, 1, "%");
const tapePresetRow = document.createElement("div");
tapePresetRow.className = "control direct-control";
tapePresetRow.id = "tapePresetControl";
tapePresetRow.dataset.control = "tapePreset";
const tapePresetLabel = document.createElement("label");
tapePresetLabel.htmlFor = "tapePreset";
tapePresetLabel.textContent = "Tape preset";
const tapePresetMenu = document.createElement("select");
tapePresetMenu.id = "tapePreset";
tapePresetMenu.className = "parameter-choice";
tapePresetMenu.setAttribute("aria-describedby", "tapePresetDescription");
const customTapePreset = document.createElement("option");
customTapePreset.value = "";
customTapePreset.textContent = "Custom settings";
customTapePreset.disabled = true;
tapePresetMenu.append(customTapePreset);
for (const preset of TAPE_PRESETS) {
  const option = document.createElement("option");
  option.value = preset.id;
  option.textContent = preset.label;
  tapePresetMenu.append(option);
}
const tapePresetDescription = document.createElement("p");
tapePresetDescription.id = "tapePresetDescription";
tapePresetDescription.className = "muted";
const tapePresetEditor = document.createElement("div");
tapePresetEditor.className = "parameter-editor";
tapePresetEditor.append(tapePresetMenu);
tapePresetRow.append(tapePresetLabel, tapePresetEditor, tapePresetDescription);
$("tapeControls").prepend(tapePresetRow);
tapePresetMenu.addEventListener("change", () => {
  const selected = TAPE_PRESETS.find(preset => preset.id === tapePresetMenu.value);
  if (!selected) return;
  controlHistory?.begin("Tape preset: " + selected.label);
  try {
    params = applyTapePreset(params, selected.id);
    refreshControls();
    markEdited();
  } finally { controlHistory?.end(); }
});
function refreshTapePreset() {
  const preset = matchingTapePreset(params);
  tapePresetMenu.value = preset?.id || "";
  tapePresetDescription.textContent = preset?.description || "Your current Tape settings. Choosing a preset keeps Tape On or Off as you set it.";
}
let activeTapePanel = "echo";
function refreshTapeControls() {
  const spaceEcho = params.tapeModel === 2;
  const echoFields = ["delayTime", "feedback", "delayMix", "echoMode", "springMix"];
  const mechanicsFields = Object.keys(TAPE_PHYSICS_DEFAULTS);
  for (const row of $("tapeControls").children) {
    const id = row.dataset.control;
    row.hidden = ["tapeModel", "tapePreset"].includes(id) ? activeTapePanel === "mechanics"
      : activeTapePanel === "mechanics" ? !mechanicsFields.includes(id)
      : activeTapePanel === "echo" ? !echoFields.includes(id)
      : echoFields.includes(id) || mechanicsFields.includes(id);
    if (["echoMode", "springMix"].includes(id) && !spaceEcho) row.hidden = true;
  }
  refreshTapePreset();
  ranges.delayTime.render();
  $("delayTime").title = spaceEcho ? "Longest head time. Heads 1, 2 and 3 are at one third, two thirds and this time. Up to 1.5 seconds extends the original hardware range." : "Time between echoes.";
  const note = $("tapePage").querySelector(".tape-note");
  note.textContent = activeTapePanel === "mechanics"
    ? "Surface tension controls how freely the loose tape slides across the tray. Tape stiffness controls how easily it bends. Start the piece with Tape on to see the changes. These controls shape the animation only."
    : spaceEcho
    ? "Space Echo uses three tape heads and a parallel spring. Head 3 time sets the longest delay; heads 1 and 2 play at one third and two thirds. Modes 5 through 12 add spring; mode 12 is spring only. Echo level and Spring level are independent. Time extends to 1.5 s beyond the original hardware range. Drive colors the direct sound too. Off bypasses the whole effect."
    : "Warm vintage color for the whole piece. Wow sways the tape; Flutter adds fine ripples. Echo level controls only the repeats. Character colors the direct sound too. Off bypasses the whole effect.";
}
makeControl("orbitControls", "orbitTriggers", "Triggers", 1, 24, 1);
makeControl("orbitControls", "orbitBalls", "Balls", 1, 12, 1);
makeControl("orbitControls", "orbitGravity", "Gravity", 0, 100, 1, "%");
makeControl("orbitControls", "orbitBounce", "Bounce", 30, 100, 1, "%");
makeControl("orbitControls", "orbitSpin", "Spin rate", -60, 60, 1, "", (v) => v === 0 ? "Stopped" : `${Math.abs(v)} RPM ${v > 0 ? "\u21BB" : "\u21BA"}`);
makeControl("orbitControls", "orbitRotation", "Orientation", -180, 180, 1, "\xB0");
function refreshControls() {
  document.body.classList.toggle("tape-enabled", params.tapeOn);
  for (const [id, { input, render }] of Object.entries(ranges)) {
    input.value = params[id];
    render();
  }
  refreshTapeControls();
  $("scanToggle").textContent = params.scanOn ? "ON" : "OFF";
  $("scanToggle").classList.toggle("active", params.scanOn);
  $("scanToggle").setAttribute("aria-pressed", params.scanOn);
  $("scanMode").value = params.scanMode;
  $("freezeBtn").classList.toggle("active", params.freeze);
  $("freezeBtn").setAttribute("aria-pressed", params.freeze);
  $("tapeToggle").textContent = params.tapeOn ? "TAPE ON" : "TAPE OFF";
  $("tapeToggle").classList.toggle("active", params.tapeOn);
  $("tapeToggle").setAttribute("aria-pressed", params.tapeOn);
  trimInfo();
  syncEngine();
  updateOrbitReadout();
  if (soundEditors) {
    resizePads();
    soundEditors.refresh();
  }
  updatePadLabels();
  volumeStepper?.render();
  textureAdjustments?.refresh();
  updateTransport();
}
function syncEngine() {
  refreshTapePreset();
  spaceControlsUI?.refresh();
  spacePlateUI?.refresh();
  renderClock.invalidate();
  visualEditors?.refresh();
  motionControls?.refresh();
  if (!audioReady || !engine) return;
  const send = { ...params, width: 100, position: params.position / 100 };
  engine.port.postMessage({ type: "params", params: send });
  spaceBus?.setTone($("filterType").value, params.cutoff, params.resonance);
  spaceBus?.setDepth(params);
  spaceBus?.setReverb(params);
  tapeNode?.port.postMessage(params);
  spaceBus?.setWidth(params.width);
  reverbWet.gain.setTargetAtTime(params.reverb / 100, ctx.currentTime, 0.05);
  orbitAudio?.sync(soundState);
  orbitAudio?.setOptions({ ...orbitOptions(), balls: params.orbitBalls, triggers: params.orbitTriggers });
}
const processorGuard = createProcessorGuard((error) => {
  audioGeneration++;
  running = false;
  playPending = false;
  if (outputCapture.busy) outputCapture.fail(error);
  resetAudioGraph();
  $("playBtn").disabled = false;
  updateTransport();
  updateAudioState(error.message);
  toast(error.message);
});
function resetAudioGraph() {
  if (previewNode) {
    try {
      previewNode.stop();
    } catch {
    }
    previewNode = void 0;
    $("previewSource").textContent = "\u25B7 Listen to source";
  }
  if (phraseRequest) {
    phraseRequest.reject(new Error("Audio restarted. Try freezing again."));
    phraseRequest = null;
  }
  harmonyChannel?.port1.close();
  harmonyChannel?.port2.close();
  harmonyChannel = null;
  texturePhraseChannel?.port1.close();
  texturePhraseChannel?.port2.close();
  texturePhraseChannel = null;
  processorGuard.clear();
  releaseAudioGraph({ context: ctx, processors: [engine, tapeNode, ambientNode, recordDestination], orbit: orbitAudio });
  foundationReady = motionReady = textureReady = false;
  foundationLayer = spaceBus = null;
  spaceAnalyser = null;
  ctx = master = engine = orbitAudio = analyser = limiter = tapeNode = ambientNode = grainLayer = orbitLayer = recordDestination = void 0;
  lastMeter = 0;
  tapeVisualSnapshot = null;
  tapeVisualSubscribed = false;
  renderClock.invalidate();
  orbitVoices = { size: 0 };
  audioReady = false;
  audioInitialization = null;
  clockSnapshot = void 0;
}
let audioInitialization;
function ensureOutput() {
  if (!ctx) {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) throw new Error("This browser does not support Web Audio.");
    requestPlaybackSession();
    ctx = new Audio({ latencyHint: "interactive" });
    ctx.onstatechange = () => updateAudioState();
    master = ctx.createGain();
    master.gain.value = +$("volume").value;
    analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -8;
    limiter.knee.value = 10;
    limiter.ratio.value = 12;
    limiter.attack.value = 3e-3;
    limiter.release.value = 0.15;
    limiter.connect(master);
    master.connect(analyser);
    analyser.connect(ctx.destination);
    visuals?.connect(ctx, master);
  }
  return resumeFromTap(ctx);
}
async function ensureAudio() {
  if (audioReady) {
    await ensureOutput();
    updateAudioState();
    return;
  }
  if (!audioInitialization) {
    const attempt = initializeAudio(), attemptContext = ctx;
    audioInitialization = attempt.catch((e) => {
      if (ctx === attemptContext) {
        resetAudioGraph();
        updateAudioState(e.message);
      }
      throw e;
    });
  }
  await audioInitialization;
}
async function initializeAudio() {
  const activation = ensureOutput(), context = ctx;
  activation.catch(() => {
  });
  if (!ctx.audioWorklet) throw new Error("The sound engine is unavailable. Test sound still checks device output.");
  await ctx.audioWorklet.addModule("./build/grain-worklet.js?v=texture-source-scope-1");
  if (ctx !== context) throw new Error("Audio restarted. Tap Start sound.");
  await context.audioWorklet.addModule("./build/tape-worklet.js?v=tape-space-echo-integration-3");
  if (ctx !== context) throw new Error("Audio restarted. Tap Start sound.");
  await context.audioWorklet.addModule("./build/ambient-worklet.js?v=vintage-tape-1");
  if (ctx !== context) throw new Error("Audio restarted. Tap Start sound.");
  await context.audioWorklet.addModule("./build/orbit-worklet.js?v=vintage-tape-1");
  if (ctx !== context) throw new Error("Audio restarted. Tap Start sound.");
  engine = new AudioWorkletNode(ctx, "grain-engine", { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2] });
  const textureNode = engine;
  textureNode.port.onmessage = ({ data }) => {
    if (textureNode !== engine) return;
    if (data.type === "ready") {
      textureReady = true;
      connectTexturePhrase();
      syncEngine();
      sendBuffer();
      syncTextureSource();
      syncPlayback();
      return;
    }
    if (data.type === "phrase") {
      if (phraseRequest?.id === data.id) {
        phraseRequest.resolve(data);
        phraseRequest = null;
      }
    } else {
      stats = data;
      if (piece.source === "foundation" && activeTab !== "sample") $("duration").textContent = formatTime(data.liveSeconds || 0);
      if (running || data.peak > 1e-5) renderClock.invalidate();
    }
  };
  tapeNode = new AudioWorkletNode(ctx, "tape-delay", { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2], processorOptions: { params } });
  const activeTape = tapeNode;
  activeTape.port.onmessage = ({ data }) => {
    if (activeTape !== tapeNode) return;
    if (data.type === "ready") { syncEngine(); syncTapeVisualSubscription(); }
    else if (data.type === "tape-visuals") tapeVisualSnapshot = data;
  };
  tapeNode.connect(limiter);
  spaceBus = createPieceSpace(ctx, tapeNode);
  filter = spaceBus.filter;
  reverbWet = spaceBus.wet;
  spaceAnalyser = ctx.createAnalyser(); spaceAnalyser.fftSize = 512;
  reverbWet.connect(spaceAnalyser);
  grainLayer = ctx.createGain();
  engine.connect(grainLayer);
  grainLayer.connect(spaceBus.parts.texture);
  orbitLayer = ctx.createGain();
  orbitLayer.connect(spaceBus.parts.motion);
  orbitAudio = createOrbitAudio(ctx, orbitLayer, soundState, spaceBus.parts.motion, {
    options: { ...orbitOptions(), balls: params.orbitBalls, triggers: params.orbitTriggers },
    balls,
    onReady() {
      motionReady = true;
      connectPieceHarmony();
      syncPlayback();
    },
    onSnapshot(snapshot) {
      if (ctx !== context) return;
      if (snapshot.voices !== reportedOrbitVoices || snapshot.phase !== orbitState.phase || snapshot.balls.some((ball, i) => ball.x !== balls[i]?.x || ball.y !== balls[i]?.y)) renderClock.invalidate();
      reportedOrbitVoices = snapshot.voices;
      orbitState.phase = snapshot.phase;
      orbitState.elapsed = snapshot.elapsed;
      balls = snapshot.balls;
      orbitState.balls = balls;
      for (const hit of snapshot.hits) {
        padFlashes[hit.index] = performance.now() / 1e3 - Math.max(0, context.currentTime - hit.audioTime);
        paddleFlash = padFlashes[hit.index];
      }
    }
  });
  createAmbientAudio();
  orbitVoices = orbitAudio.voices;
  recordDestination = new AudioWorkletNode(ctx, "capture-engine", { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2] });
  master.connect(recordDestination);
  const silent = ctx.createGain();
  silent.gain.value = 0;
  recordDestination.connect(silent);
  silent.connect(ctx.destination);
  const captureNode = recordDestination;
  captureNode.port.onmessage = ({ data }) => {
    if (captureNode === recordDestination) outputCapture.receive(data);
  };
  processorGuard.watch([engine, tapeNode, ambientNode, recordDestination, orbitAudio.node]);
  await activation;
  if (ctx !== context) throw new Error("Audio restarted. Tap Start sound.");
  audioReady = true;
  syncEngine();
  syncAmbient();
  if (buffer) sendBuffer();
  else loadDemo(demoKey);
  syncTextureSource();
  updateAudioState();
}
function createAmbientAudio() {
  ambientNode = new AudioWorkletNode(ctx, "ambient-engine", { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2], processorOptions: { settings: { ...ambientState, enabled: true } } });
  const node = ambientNode;
  node.port.onmessage = ({ data }) => {
    if (node !== ambientNode) return;
    if (data.type === "ready") {
      foundationReady = true;
      connectPieceHarmony();
      connectTexturePhrase();
      node.port.postMessage({ type: "settings", value: { ...ambientState, enabled: true } });
      node.port.postMessage({ type: "play", value: running });
    } else {
      ambientStats = data;
      syncPieceGains(1.2);
      updatePadLabels();
    }
  };
  foundationLayer = ctx.createGain();
  ambientNode.connect(foundationLayer);
  foundationLayer.connect(spaceBus.parts.foundation);
  ambientNode.connect(engine);
  connectPieceHarmony();
}
function connectPieceHarmony() {
  if (!foundationReady || !motionReady || harmonyChannel || !ambientNode || !orbitAudio) return;
  harmonyChannel = new MessageChannel();
  orbitAudio.node.port.postMessage({ type: "harmonyPort", port: harmonyChannel.port2 }, [harmonyChannel.port2]);
  ambientNode.port.postMessage({ type: "harmonyPort", port: harmonyChannel.port1 }, [harmonyChannel.port1]);
}
function connectTexturePhrase() {
  if (!foundationReady || !textureReady || texturePhraseChannel || !ambientNode || !engine) return;
  texturePhraseChannel = new MessageChannel();
  engine.port.postMessage({ type: "phrasePort", port: texturePhraseChannel.port2 }, [texturePhraseChannel.port2]);
  ambientNode.port.postMessage({ type: "phrasePort", port: texturePhraseChannel.port1 }, [texturePhraseChannel.port1]);
}
function syncPieceGains(slew = .08) {
  const mix = piecePlayback(piece, running, solo, ambientStats.phrase);
  if (ctx) for (const [node, value] of [[foundationLayer, mix.foundation], [grainLayer, mix.texture], [orbitLayer, mix.motion]]) {
    node?.gain.setTargetAtTime(value, ctx.currentTime, slew);
  }
}
function syncPlayback() {
  const mix = piecePlayback(piece, running, solo, ambientStats.phrase);
  engine?.port.postMessage({ type: "captureFoundation", value: running });
  engine?.port.postMessage({ type: "play", value: running && mix.texture > 0 });
  ambientNode?.port.postMessage({ type: "play", value: mix.generate });
  syncPieceGains();
  orbitAudio?.setTransport({ simulate: running, audible: running && mix.motion > 0 });
  orbitAudio?.node.port.postMessage({ type: "followHarmony", value: piece.followHarmony });
}
function syncTextureSource() {
  engine?.port.postMessage({ type: "source", mode: piece.source === "foundation" ? "foundation" : "sample" });
  document.body.dataset.textureSource = piece.source;
  refreshPieceUI();
}
function refreshPieceUI() {
  blendUI?.refresh();
  const live = piece.source === "foundation";
  if ($("textureSourceStatus")) $("textureSourceStatus").textContent = live ? "LIVE \xB7 RECENT FOUNDATION" : piece.source === "frozen" ? "FROZEN PHRASE \xB7 ORIGINAL HARMONY" : "YOUR SOUND \xB7 ORIGINAL PITCH";
  if ($("freezePhrase")) {
    $("freezePhrase").textContent = live ? "Freeze phrase" : "Use live foundation";
    $("freezePhrase").disabled = live && !running;
  }
  if ($("followHarmony")) {
    $("followHarmony").textContent = piece.followHarmony ? "HARMONY LINKED" : "INDEPENDENT NOTES";
    $("followHarmony").setAttribute("aria-pressed", String(piece.followHarmony));
  }
  if ($("partAction")) {
    const kind = activeTab === "orbit" ? "motion" : ["sample", "grain"].includes(activeTab) ? "texture" : null;
    $("partAction").hidden = !kind || piece[kind] > 0;
    $("partAction").textContent = kind === "motion" ? "Add motion" : "Add texture";
  }
  if ($("pieceHint")) $("pieceHint").textContent = solo ? "SOLO \xB7 " + solo.toUpperCase() : activeTab === "grain" ? "LONG GRAINS: SMOOTH \xB7 SHORT: FRAGMENTS" : activeTab === "orbit" ? piece.followHarmony ? "FOLLOWS FOUNDATION HARMONY" : "INDEPENDENT NOTES" : "ONE PIECE \xB7 THREE PARTS";
  const textureOff = piece.texture === 0 && solo !== "texture";
  $("grainPage").querySelector(".control-grid").removeAttribute("inert");
  $("grainPage").querySelectorAll(".control-grid button,.control-grid input,.control-grid select").forEach((control) => control.disabled = false);
  if (textureOff && activeTab === "grain") $("pieceHint").textContent = "TEXTURE INAUDIBLE · EDIT FREELY / ADD OR SOLO TO HEAR";
  visualEditors?.refresh();
  $("openVisual")?.setAttribute("aria-pressed", String(activeTab === "visual"));
  if ($("openVisual")) $("openVisual").textContent = activeTab === "visual" ? "Back to sound" : "Visual";
  if (buffer) $("duration").textContent = formatTime(live && activeTab !== "sample" ? stats.liveSeconds || 0 : buffer.duration);
  document.body.dataset.textureEnabled = String(piece.texture > 0 || solo === "texture");
  document.body.dataset.motionEnabled = String(piece.motion > 0 || solo === "motion");
  $("waveform").setAttribute("aria-label", activeTab === "sample" ? "Source waveform. Drag In and Out to select material." : "Texture waveform. Drag to set read anchor or resize grain length.");
  if ($("waveHint")) $("waveHint").textContent = live && activeTab !== "sample" ? "SOURCE SCOPE · RECENT FOUNDATION · L / R" : activeTab === "sample" ? "DRAG IN / OUT TO SELECT MATERIAL" : "SOURCE SCOPE · FULL PHRASE · L / R";
}
async function freezePhrase() {
  if (piece.source !== "foundation") {
    controlHistory?.begin("Use live foundation");
    sampleSelection.cancel();
    piece.source = "foundation";
    markEdited();
    syncTextureSource();
    controlHistory?.end();
    return;
  }
  if (!running || phraseRequest) return toast("Play the piece briefly before freezing a phrase.");
  const operation = sampleSelection.reserve(), id = ++nextPhraseId;
  try {
    await operation.run(() => new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (phraseRequest?.id === id) {
          phraseRequest = null;
          reject(new Error("Phrase capture timed out."));
        }
      }, 3e3);
      phraseRequest = { id, resolve: (value) => {
        clearTimeout(timer);
        resolve(value);
      }, reject: (error) => {
        clearTimeout(timer);
        reject(error);
      } };
      engine.port.postMessage({ type: "freeze", id });
    }), (phrase) => {
      if (phrase.channels[0].length < phrase.sampleRate * 0.25) throw new Error("Let the Foundation play a little longer first.");
      piece.source = "frozen";
      setSample(createBuffer(phrase.channels, phrase.sampleRate), "Frozen foundation", "FROZEN PHRASE");
      syncTextureSource();
      toast("Phrase frozen. Its captured harmony stays fixed.");
    });
  } catch (error) {
    toast(error.message);
  }
}
function syncAmbient() {
  renderClock.invalidate();
  if (!ambientNode) ambientStats = { elapsed: 0, chord: ambientChordName(ambientState, 0), chordNotes: ambientChord(ambientState, 0), next: ambientState.change, notes: 0, section: 1 };
  ambientUI?.refresh();
  ambientNode?.port.postMessage({ type: "settings", value: ambientState });
  syncPlayback();
  $("freezeBtn").disabled = false;
  updateTransport();
  refreshPieceUI();
}
function newAmbientPiece() {
  controlHistory?.clear();
  markEdited();
  ambientState.seed = crypto.getRandomValues(new Uint32Array(1))[0];
  ambientStats = { ...ambientStats, elapsed: 0, section: 1 };
  syncAmbient();
  toast("A new piece. Your sounds and mix are kept.");
}
function orbitIsActive() {
  return piecePlayback(piece, running, solo).motion > 0;
}
function createBuffer(channels, rate) {
  const b = new AudioBuffer({ numberOfChannels: channels.length, length: channels[0].length, sampleRate: rate });
  channels.forEach((d, c) => b.copyToChannel(d, c));
  return b;
}
function generateDemo(key) {
  const rate = 32e3, n = rate * 8, channels = [new Float32Array(n), new Float32Array(n)];
  let seed = 721;
  const rnd = () => {
    seed = seed * 1664525 + 1013904223 >>> 0;
    return seed / 4294967296;
  };
  const notes = [130.8128, 164.8138, 195.9977, 261.6256, 329.6276, 391.9954, 523.2511, 659.2551];
  let noise = 0;
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    let v = 0;
    if (key === "glass" || key === "piano") {
      for (let j = 0; j < 8; j++) {
        const age = t - j * 0.78 - 0.15;
        if (age >= 0 && age < 4) {
          const f = notes[j];
          if (key === "glass") v += (Math.sin(t * f * 2 * Math.PI) + 0.4 * Math.sin(t * f * 2.76 * 2 * Math.PI) + 0.2 * Math.sin(t * f * 5.4 * 2 * Math.PI)) * Math.exp(-age * 2.3) * Math.min(1, age * 180) * 0.24;
          else v += (Math.sin(t * f * 2 * Math.PI) + 0.35 * Math.sin(t * f * 4 * Math.PI) + 0.14 * Math.sin(t * f * 6 * Math.PI)) * Math.exp(-age * 1.8) * Math.min(1, age * 90) * 0.25;
        }
      }
    } else if (key === "rain") {
      noise = noise * 0.94 + (rnd() * 2 - 1) * 0.06;
      v = noise * 0.9 + (rnd() < 1e-3 ? (rnd() - 0.5) * 0.8 : 0);
      v += Math.sin(t * 87 * 2 * Math.PI) * 0.06 * Math.sin(t * 0.8) ** 2;
    } else {
      const f = 110 + Math.sin(t * 0.7) * 3;
      const formant = 600 + 600 * (0.5 + 0.5 * Math.sin(t * 0.8));
      for (let h = 1; h < 32; h++) {
        const weight = Math.exp(-(((h * f - formant) / 300) ** 2)) + 0.25 * Math.exp(-(((h * f - 2300) / 450) ** 2));
        v += Math.sin(t * f * h * 2 * Math.PI) * weight * 0.06;
      }
      v *= Math.min(1, t * 4, Math.max(0, (8 - t) * 2));
    }
    channels[0][i] = v;
    channels[1][i] = v * 0.92 + Math.sin(t * 261.6256 * 2 * Math.PI) * 8e-3;
  }
  return createBuffer(channels, rate);
}
const demoNames = { glass: "Glass garden", piano: "Felt & fragments", rain: "After the rain", voice: "Vowel machine" };
const surgeSources = document.createElement('optgroup');
surgeSources.label = 'Surge textures · original C4';
for (const [id, label] of [['pad', 'Evolving pad'], ['pluck', 'Damped pluck'], ['bell', 'Soft FM bell']]) {
  const option = document.createElement('option');
  option.value = 'surge-' + id; option.textContent = label + ' · C4'; surgeSources.append(option);
}
$("demo").append(surgeSources);
let surgeManifest;
async function loadSurgeTexture(id) {
  try {
    await sampleSelection.run(async () => {
      if (!surgeManifest) {
        const response = await fetch('./audio/surge/manifest.json');
        if (!response.ok) throw new Error('The source library could not be loaded.');
        const manifest = await response.json();
        if (manifest.schema !== 1 || !Array.isArray(manifest.assets)) throw new Error('The source library is invalid.');
        surgeManifest = manifest;
      }
      const asset = surgeManifest.assets.find(item => item.id === id);
      if (!asset || !/^\.\/audio\/surge\/[a-z0-9-]+\.wav$/.test(asset.url)) throw new Error('This source is unavailable.');
      const response = await fetch(asset.url);
      if (!response.ok) throw new Error('The sound could not be loaded.');
      const decoded = await decodeContext().decodeAudioData(await response.arrayBuffer());
      if (decoded.duration > 60 || !decoded.length) throw new Error('This source has an unsupported duration.');
      return { asset, decoded };
    }, ({ asset, decoded }) => {
      piece.source = 'sample';
      setSample(decoded, asset.label + ' · C4', 'SURGE XT · ORIGINAL C4');
      $("sourceType").textContent = 'NATIVE SURGE XT';
      $("demo").value = 'surge-' + id;
      syncTextureSource();
      toast('C4 source selected. It keeps its original pitch as Foundation changes.');
    });
  } catch (error) {
    $("demo").selectedIndex = -1;
    toast('Could not load Surge texture: ' + error.message);
  }
}
function loadDemo(key) {
  sampleSelection.cancel();
  demoKey = key;
  setSample(generateDemo(key), demoNames[key], "GENERATED DEMO");
  $("sourceType").textContent = "LOCAL SYNTHESIS";
}
function sendBuffer() {
  if (engine && buffer) engine.port.postMessage({ type: "sample", channels: Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c).slice()), sampleRate: buffer.sampleRate, position: params.position / 100 });
}
function setSample(b, name, type = "IMPORTED AUDIO", keepOriginal = false) {
  controlHistory?.clear();
  markEdited();
  if (previewNode) {
    try {
      previewNode.stop();
    } catch {
    }
    previewNode = null;
  }
  $("previewSource").textContent = "\u25B7 Listen to source";
  buffer = b;
  if (!keepOriginal) originalBuffer = b;
  sourceName = name;
  $("sampleName").textContent = name;
  $("sampleMeta").textContent = `${type} \xB7 ${b.duration.toFixed(2)} SEC`;
  $("duration").textContent = formatTime(b.duration);
  $("sourceType").textContent = type === "GENERATED DEMO" ? "LOCAL SYNTHESIS" : "LOCAL AUDIO FILE";
  params.trimStart = 0;
  params.trimEnd = 100;
  params.position = 50;
  stats.scan = 0.5;
  refreshControls();
  sendBuffer();
  drawMini();
}
function formatTime(sec) {
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
}
const sampleSelection = createSampleSelection({ onState(state) {
  document.body.dataset.sampleLoading = String(state === "loading");
  $("sampleMeta").setAttribute("aria-busy", String(state === "loading"));
  if (state === "loading") toast("Loading sound\u2026 Your latest selection will be used.");
} });
async function importAudio(file) {
  try {
    await sampleSelection.run(async () => {
      if (file.size > 100 * 1024 * 1024) throw new Error("Choose an audio file smaller than 100 MB.");
      const context = decodeContext();
      const decoded = await context.decodeAudioData(await file.arrayBuffer());
      if (decoded.duration <= 60) return decoded;
      return createBuffer(Array.from({ length: Math.min(2, decoded.numberOfChannels) }, (_, c) => decoded.getChannelData(c).slice(0, Math.floor(60 * decoded.sampleRate))), decoded.sampleRate);
    }, (decoded) => {
      piece.source = "sample";
      setSample(decoded, file.name.replace(/\.[^.]+$/, ""));
      $("demo").selectedIndex = -1;
      showTab("sample");
      syncTextureSource();
      toast("Your sound is ready as Texture. Use Add texture to bring it into the piece.");
    });
  } catch (error) {
    toast("Could not load audio: " + error.message);
  }
}
function trimInfo() {
  if (!buffer) return;
  const a = params.trimStart / 100 * buffer.duration, b = params.trimEnd / 100 * buffer.duration;
  $("trimInfo").textContent = b > a ? `${a.toFixed(2)} s \u2192 ${b.toFixed(2)} s \xB7 ${(b - a).toFixed(2)} s` : "End must come after start";
}
function denoiseBuffer(b, strength) {
  if (!strength) return b;
  const channels = [];
  const threshold = 2e-4 + (strength / 80) ** 2 * 0.035;
  for (let c = 0; c < b.numberOfChannels; c++) {
    const src = b.getChannelData(c), out = new Float32Array(src.length);
    let env = 0, gain = 1;
    for (let i = 0; i < src.length; i++) {
      env = env * 0.995 + Math.abs(src[i]) * 5e-3;
      const target = clamp(env / threshold, 0, 1) ** 2;
      gain += (target - gain) * (target > gain ? 0.02 : 1e-3);
      out[i] = src[i] * gain;
    }
    channels.push(out);
  }
  return createBuffer(channels, b.sampleRate);
}
function applyTrim() {
  sampleSelection.cancel();
  if (!buffer) return;
  if (params.trimEnd <= params.trimStart + 0.1) return toast("Move End after Start before trimming.");
  const rate = buffer.sampleRate, start = Math.floor(buffer.length * params.trimStart / 100), end = Math.floor(buffer.length * params.trimEnd / 100), b = createBuffer(Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c).slice(start, end)), rate);
  if (piece.source === "foundation") piece.source = "sample";
  setSample(denoiseBuffer(b, params.denoise), sourceName, "TRIMMED AUDIO", true);
  syncTextureSource();
  toast("Trim applied. Restore full sample to undo.");
}
const pageNames = ["ambient", "sample", "grain", "fx", "tape", "orbit", "visual"];
function showTab(name) {
  if (!pageNames.includes(name)) return;
  activeTab = name;
  syncTapeVisualSubscription();
  window.HushfieldNavigation?.select(name, { notify: false });
  document.body.dataset.page = name;
  history.replaceState(null, "", "#" + name);
  document.querySelectorAll(".page").forEach((el) => el.classList.toggle("active", el.id === name + "Page"));
  document.querySelector(".main-panel").classList.toggle("orbit-active", name === "orbit");
  $("viewLabel").textContent = { ambient: "FOUNDATION / THE HEART OF THE PIECE", grain: "TEXTURE / RESHAPE THE FOUNDATION", sample: "SAMPLE / TEXTURE MATERIAL", fx: "SPACE / THE WHOLE PIECE", tape: "TAPE / THE WHOLE PIECE", orbit: "MOTION / ORBIT IN HARMONY", visual: "AUDIO VISUALIZATION" }[name];
  syncPlayback();
  if (name === "orbit" && !balls.length) resetBalls();
  $("freezeBtn").disabled = !ambientState.enabled && name === "orbit";
  syncEngine();
  updateTransport();
  refreshPieceUI();
  ensureVisibleSelection();
}
function updateTransport() {
  $("playLabel").textContent = running ? "STOP" : ctx && audioReady && ctx.state !== "running" ? "RESUME" : "START";
  $("playBtn").setAttribute("aria-label", running ? "Stop instrument" : "Start instrument");
  const held = ambientState.hold;
  $("freezeBtn").textContent = "Hold chord";
  $("freezeBtn").setAttribute("aria-label", "Hold current chord");
  $("freezeBtn").classList.toggle("active", held);
  $("freezeBtn").setAttribute("aria-pressed", String(held));
  $("transportStatus").textContent = solo ? "SOLO \xB7 " + solo.toUpperCase() : running ? "PLAYING THE PIECE" : "READY TO PLAY THE PIECE";
  refreshPieceUI();
  document.body.classList.toggle("playing", running);
}
function updateAudioState(message) {
  const state = ctx?.state || "off", active = state === "running";
  $("audioLED").classList.toggle("on", active);
  $("audioStatus").textContent = active ? running ? "PLAYING" : "AUDIO READY" : state === "off" ? "AUDIO OFF" : "AUDIO " + state.toUpperCase();
  if (message) $("audioDetail").textContent = message;
  else $("audioDetail").textContent = active ? running ? "Playing. Tap Stop to pause." : "Audio ready. Tap Start to play." : state === "off" ? "Tap Start sound to enable audio." : "Audio paused by the browser. Tap Resume audio.";
  if (!active && running) {
    running = false;
    syncPlayback();
    silenceOrbit();
    updateTransport();
  }
}
async function togglePlay() {
  if (playPending || restartPending) return;
  if (previewNode) {
    previewNode.stop();
    previewNode = null;
    $("previewSource").textContent = "\u25B7 Listen to source";
  }
  const generation = audioGeneration;
  playPending = true;
  $("playBtn").disabled = true;
  try {
    await ensureAudio();
    if (generation !== audioGeneration) return;
    running = !running;
    syncPlayback();
    if (!running) silenceOrbit();
    clockSnapshot = void 0;
    updateTransport();
    updateAudioState();
  } catch (e) {
    if (generation !== audioGeneration) return;
    running = false;
    updateTransport();
    updateAudioState(e.message);
    toast("Audio could not start: " + e.message);
  } finally {
    if (generation === audioGeneration) {
      playPending = false;
      $("playBtn").disabled = false;
    }
  }
}
async function testSound() {
  let context;
  try {
    const activation = ensureOutput();
    context = ctx;
    activation.catch(() => {
    });
    if (+$("volume").value === 0) {
      $("audioDetail").textContent = "VOL is 0%. Raise the volume slider.";
      return;
    }
    playTestNotes(context, master);
    $("audioDetail").textContent = "Playing two test notes\u2026";
    await activation;
    await verifyAudioClock(context);
    if (ctx === context) $("audioDetail").textContent = "Test notes sent \xB7 VOL " + Math.round(+$("volume").value * 100) + "% \xB7 audio clock OK.";
  } catch (e) {
    if (context && context !== ctx) return;
    updateAudioState(e.message);
    toast(e.message);
  }
}
async function restartAudio() {
  if (restartPending) return;
  if (outputRecording || micRecording || captureStarting) {
    toast("Finish the recording before restarting audio.");
    return;
  }
  restartPending = true;
  $("restartAudio").disabled = true;
  const generation = ++audioGeneration;
  try {
    running = false;
    playPending = false;
    syncPlayback();
    silenceOrbit();
    if (previewNode) {
      try {
        previewNode.stop();
      } catch {
      }
      previewNode = null;
      $("previewSource").textContent = "\u25B7 Listen to source";
    }
    resetAudioGraph();
    const activation = ensureOutput(), context = ctx;
    activation.catch(() => {
    });
    playTestNotes(context, master);
    updateTransport();
    $("audioDetail").textContent = "Restarting audio \xB7 playing two test notes\u2026";
    await ensureAudio();
    await verifyAudioClock(context);
    if (generation !== audioGeneration) return;
    running = true;
    syncPlayback();
    updateTransport();
    $("audioDetail").textContent = +$("volume").value === 0 ? "VOL is 0%. Raise the volume slider." : "Audio restarted \xB7 instrument running \xB7 VOL " + Math.round(+$("volume").value * 100) + "%.";
  } catch (e) {
    running = false;
    updateTransport();
    updateAudioState(e.message);
    toast(e.message);
  } finally {
    restartPending = false;
    $("restartAudio").disabled = false;
    $("playBtn").disabled = false;
  }
}
function inspectAudioClock(time) {
  if (!ctx || ctx.state !== "running" || !running || document.hidden || !ambientState.enabled && activeTab === "orbit" && params.orbitSpin === 0 && orbitVoices.size === 0) {
    clockSnapshot = void 0;
    return;
  }
  if (!clockSnapshot) {
    clockSnapshot = { wall: time, audio: ctx.currentTime };
    return;
  }
  if (time - clockSnapshot.wall < 1e3) return;
  if (ctx.currentTime <= clockSnapshot.audio + 1e-3) {
    running = false;
    syncPlayback();
    silenceOrbit();
    updateTransport();
    updateAudioState("Audio clock stopped. Tap Restart audio.");
  }
  clockSnapshot = { wall: time, audio: ctx.currentTime };
}
function toggleFreeze() {
  markEdited();
  if (ambientState.enabled) {
    ambientState.hold = !ambientState.hold;
    syncAmbient();
    updateTransport();
    return;
  }
  if (activeTab === "orbit") return;
  params.freeze = !params.freeze;
  refreshControls();
  updateTransport();
}
function silenceOrbit() {
  orbitAudio?.stopAll();
}
function newBall(i) {
  return { x: (Math.random() - 0.5) * 0.5, y: (Math.random() - 0.5) * 0.5, vx: (Math.random() - 0.5) * 1.2, vy: (Math.random() - 0.5) * 1.2, hue: i, lastHit: -Infinity, lastImpact: -Infinity, flash: 0 };
}
function resizeBalls() {
  while (balls.length < params.orbitBalls) balls.push(newBall(balls.length));
  balls.length = params.orbitBalls;
  orbitState.balls = balls;
  containBalls(orbitState, orbitOptions());
}
function resetBalls() {
  balls = Array.from({ length: params.orbitBalls }, (_, i) => newBall(i));
  orbitState.balls = balls;
  orbitState.collisions = 0;
  orbitAudio?.scatter(balls);
  containBalls(orbitState, orbitOptions());
}
function orbitOptions() {
  return { points: shapePoints($("orbitShape").value), rpm: params.orbitSpin, orientation: params.orbitRotation, gravity: params.orbitGravity, bounce: params.orbitBounce };
}
function updateOrbitReadout() {
  shapeStepper?.render();
  const points = shapePoints($("orbitShape").value);
  $("orbitPointCount").textContent = points ? `${points} points` : "Circle";
  $("removePoint").disabled = !points;
  $("addPoint").disabled = points >= 12;
  $("orbitSpinStatus").textContent = params.orbitSpin === 0 ? "SPIN STOPPED" : `${Math.abs(params.orbitSpin)} RPM ${params.orbitSpin > 0 ? "\u21BB" : "\u21BA"}`;
}
function changePoints(delta) {
  const current = shapePoints($("orbitShape").value);
  const next = delta > 0 ? current ? Math.min(12, current + 1) : 3 : current <= 3 ? 0 : current - 1;
  $("orbitShape").value = String(next);
  containBalls(orbitState, orbitOptions());
  syncEngine();
  updateOrbitReadout();
}
function currentPadSound(index) {
  const p = patchFor(soundState, "triggers", index), sound = padSound(index);
  sound.midi = piece.followHarmony ? followChord(soundMidi(p, index), ambientStats.chordNotes) : soundMidi(p, index);
  sound.note = noteName(sound.midi);
  sound.tone = p.wave;
  sound.enabled = p.enabled;
  return sound;
}
function updatePadLabels() {
  padButtons.forEach((button, i) => {
    const sound = currentPadSound(i);
    button.dataset.note = sound.note;
    button.style.setProperty("--pad-color", sound.color);
    button.classList.toggle("muted-pad", !sound.enabled);
    button.setAttribute("aria-label", `Trigger ${i + 1}, ${sound.note}, ${sound.tone}`);
    button.title = `Trigger ${i + 1}: ${sound.note} · select to edit; Listen auditions`;
    const selected = soundEditors?.getSelection?.("triggers") === i;
    button.classList.toggle("selected-pad", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}
function resizePads() {
  const layer = document.querySelector(".orbit-pads");
  if (!layer) return;
  const changed = padButtons.length !== params.orbitTriggers;
  while (padButtons.length > params.orbitTriggers) padButtons.pop().remove();
  while (padButtons.length < params.orbitTriggers) {
    const i = padButtons.length, button = document.createElement("button");
    button.type = "button";
    button.className = "orbit-pad";
    button.dataset.pad = i;
    button.addEventListener("click", () => {
      soundEditors.select("triggers", i);
      showOrbitPanel("triggers");
      updatePadLabels();
      $("orbitPadStatus").textContent = `TRIGGER ${i + 1} SELECTED · LISTEN TO AUDITION`;
    });
    padButtons.push(button);
    layer.append(button);
  }
  if (changed) $("orbitPadStatus").textContent = params.orbitTriggers + " TRIGGERS \xB7 SELECT TO EDIT";
  updatePadLabels();
}
function setupOrbitPads() {
  const layer = document.createElement("div");
  layer.className = "orbit-pads";
  layer.setAttribute("role", "group");
  layer.setAttribute("aria-label", "Orbit sound triggers");
  document.querySelector(".orbit-stage").append(layer);
  resizePads();
}
function triggerPad(index, audition = false) {
  const p = patchFor(soundState, "triggers", index), sound = currentPadSound(index);
  if (!audition && !orbitIsActive() || !orbitAudio?.play("triggers", index, sound.midi, p, audition)) return;
  padFlashes[index] = performance.now() / 1e3;
  paddleFlash = padFlashes[index];
  $("orbitPadStatus").textContent = `TRIGGER ${index + 1} \xB7 ${sound.note} \xB7 ${sound.tone.toUpperCase()}`;
}
function changeSound(bank, index, field, value) {
  markEdited();
  editSound(soundState, bank, index, field, value);
  if (field === "enabled" && !value) orbitAudio?.stop(bank, index === "all" ? void 0 : index);
  orbitAudio?.sync(soundState);
  updatePadLabels();
}
async function previewSound(bank, index) {
  try {
    await ensureAudio();
    const target = index === "all" ? 0 : index, p = patchFor(soundState, bank, target), midi = piece.followHarmony ? followChord(soundMidi(p, target), ambientStats.chordNotes) : soundMidi(p, target);
    orbitAudio.play(bank, target, midi, p, true);
    $("orbitPadStatus").textContent = `${bank === "triggers" ? "TRIGGER" : "BALL"} ${target + 1} \xB7 ${noteName(midi)} \xB7 ${p.wave.toUpperCase()}`;
  } catch (e) {
    toast(e.message);
  }
}
function fitCanvas(canvas) {
  const rect = canvas.getBoundingClientRect(), dpr = 1;
  if (rect.width === 0 || rect.height === 0) return null;
  const w = Math.round(rect.width * dpr), h = Math.round(rect.height * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const c = canvas.getContext("2d", { willReadFrequently: true });
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { c, w: rect.width, h: rect.height };
}
function drawMini() {
  const canvas = $("miniWave"), c = canvas.getContext("2d"), w = canvas.width, h = canvas.height;
  c.clearRect(0, 0, w, h);
  if (!buffer) return;
  const data = buffer.getChannelData(0);
  c.strokeStyle = "#aaa";
  c.lineWidth = 1;
  for (let x = 0; x < w; x++) {
    let peak = 0;
    const start = Math.floor(x / w * data.length), end = Math.floor((x + 1) / w * data.length);
    for (let i = start; i < end; i += Math.max(1, Math.floor((end - start) / 30))) peak = Math.max(peak, Math.abs(data[i]));
    c.beginPath();
    c.moveTo(x, h / 2 - peak * h * 0.75);
    c.lineTo(x, h / 2 + peak * h * 0.75);
    c.stroke();
  }
  ditherCanvas(canvas);
}
function drawWave(dt = 1 / 30) {
  const fit = fitCanvas($("waveform"));
  if (!fit || !buffer) return;
  const { c, w, h } = fit;
  c.clearRect(0, 0, w, h);
  const live = piece.source === "foundation" && activeTab !== "sample";
  const data = live ? stats.wave || new Float32Array(160) : buffer.getChannelData(0);
  const pos = running ? stats.scan : params.position / 100;
  if (activeTab === "grain") {
    const visual = visuals.settings(), smoothing = visual.waveformSmoothing;
    const right = live ? stats.waveRight || data : buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : data;
    if (textureScopeContext?.buffer !== buffer || textureScopeContext.source !== piece.source || textureScopeContext.smoothing !== smoothing) {
      textureScopeRenderer.clear(); textureScopeContext = {buffer,source:piece.source,smoothing};
    }
    const leftWave = prepareTextureWave(data, smoothing, w), rightWave = prepareTextureWave(right, smoothing, w);
    // Scope's own renderer provides the stereo lanes, grid, gain and afterglow.
    // The full source stays on the x axis so grain-position handles stay honest.
    textureScopeRenderer.draw(fit, {left:leftWave,right:rightWave,rate:ctx?.sampleRate || buffer.sampleRate},
      {...visual,mode:'scope',trail:reducedMotion.matches ? 0 : visual.trail}, dt, {overview:true,dither:false});
  } else {
    let peakGlobal = .1;
    for (let i = 0; i < data.length; i += 233) peakGlobal = Math.max(peakGlobal, Math.abs(data[i]));
    const gradient = c.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#bbb");
    gradient.addColorStop(1, "#555");
    for (let x = 0; x < w; x += 2) {
      const idx = Math.floor(x / w * data.length), step = Math.max(1, Math.floor(data.length / w));
      let peak = 0;
      for (let j = idx; j < idx + step && j < data.length; j += Math.max(1, Math.floor(step / 12))) peak = Math.max(peak, Math.abs(data[j]));
      const amp = peak / peakGlobal * h * .39;
      const selected = activeTab === "sample" ? x / w >= params.trimStart / 100 && x / w <= params.trimEnd / 100 : false;
      c.fillStyle = selected ? "#fff" : gradient;
      c.globalAlpha = selected ? 0.95 : .6;
      c.fillRect(x, h / 2 - amp, 1.1, Math.max(1, amp * 2));
    }
  }
  c.globalAlpha = 1;
  if (activeTab === "sample") {
    c.fillStyle = "#0c111299";
    c.fillRect(0, 0, params.trimStart / 100 * w, h);
    c.fillRect(params.trimEnd / 100 * w, 0, w, h);
    c.strokeStyle = "#fff";
    for (const p of [params.trimStart / 100, params.trimEnd / 100]) {
      c.beginPath();
      c.moveTo(p * w, 0);
      c.lineTo(p * w, h);
      c.stroke();
    }
  } else {
    for (const grain of stats.grains || []) {
      c.fillStyle = `rgba(255,255,255,${(1 - grain.life) * 0.4})`;
      c.fillRect(24 + grain.position * (w - 34), h - 12, 2, 8);
    }
    c.strokeStyle = "#fff";
    c.lineWidth = 1;
    c.beginPath();
    const cursorX = 24 + pos * (w - 34);
    c.moveTo(cursorX, 0);
    c.lineTo(cursorX, h);
    c.stroke();
    c.fillStyle = "#fff";
    c.beginPath();
    c.moveTo(cursorX - 3, 0);
    c.lineTo(cursorX + 3, 0);
    c.lineTo(cursorX, 5);
    c.fill();
  }
}
function drawOrbit(verts) {
  const fit = fitCanvas($("orbitCanvas"));
  if (!fit) return;
  const { c, w, h } = fit;
  c.clearRect(0, 0, w, h);
  const { radius, cx, cy, ring } = padGeometry(w, h), now = performance.now() / 1e3, canvas = $("orbitCanvas");
  const phase = orbitState.phase + params.orbitRotation * Math.PI / 180;
  c.strokeStyle = "#555";
  c.lineWidth = 1;
  c.beginPath();
  c.arc(cx, cy, ring, 0, Math.PI * 2);
  c.stroke();
  for (let i = 0; i < params.orbitTriggers; i++) {
    const a = padAngle(i, params.orbitTriggers), x = cx + Math.cos(a) * ring, y = cy + Math.sin(a) * ring, flash2 = Math.max(0, 1 - (now - padFlashes[i]) * 4);
    const button = padButtons[i];
    button.style.left = x + canvas.offsetLeft + "px";
    button.style.top = y + canvas.offsetTop + "px";
    button.classList.toggle("hit", flash2 > 0);
    const size = Math.max(10, Math.min(h >= 320 ? 40 : 32, params.orbitTriggers === 1 ? 40 : 2 * ring * Math.sin(Math.PI / params.orbitTriggers) * 0.82));
    button.style.width = button.style.height = size + "px";
    button.style.fontSize = (size < 20 ? 7 : size < 30 ? 8 : 10) + "px";
    button.textContent = size < 18 ? "" : size < 27 ? String(i + 1) : button.dataset.note;
    c.strokeStyle = flash2 ? "#fff" : "#777";
    c.lineWidth = flash2 ? 3 : 1;
    c.beginPath();
    c.moveTo(cx + Math.cos(a) * (ring - 18), cy + Math.sin(a) * (ring - 18));
    c.lineTo(cx + Math.cos(a) * (ring - 10), cy + Math.sin(a) * (ring - 10));
    c.stroke();
  }
  c.strokeStyle = "#ddd";
  c.lineWidth = 1.4;
  c.shadowColor = "#ddd";
  c.shadowBlur = 0;
  c.beginPath();
  if (verts.length) {
    verts.forEach((v, i) => i ? c.lineTo(cx + v.x * radius, cy + v.y * radius) : c.moveTo(cx + v.x * radius, cy + v.y * radius));
    c.closePath();
  } else c.arc(cx, cy, radius, 0, Math.PI * 2);
  c.stroke();
  for (let i = 1; i < (verts.length || 12); i++) {
    const a = -Math.PI / 2 + i * Math.PI * 2 / (verts.length || 12) + phase;
    c.fillStyle = "#777";
    c.beginPath();
    c.arc(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius, 2, 0, Math.PI * 2);
    c.fill();
  }
  const markerAngle = phase - Math.PI / 2, flash = Math.max(0, 1 - (now - paddleFlash) * 5);
  c.shadowColor = "#fff";
  c.shadowBlur = 0;
  c.strokeStyle = flash ? "#fff" : "#fff";
  c.lineWidth = 4;
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(cx + Math.cos(markerAngle) * radius, cy + Math.sin(markerAngle) * radius);
  c.lineTo(cx + Math.cos(markerAngle) * (ring + 5), cy + Math.sin(markerAngle) * (ring + 5));
  c.stroke();
  c.fillStyle = "#fff";
  c.beginPath();
  c.arc(cx + Math.cos(markerAngle) * radius, cy + Math.sin(markerAngle) * radius, 3.5, 0, Math.PI * 2);
  c.fill();
  c.shadowColor = "#ddd";
  c.lineCap = "butt";
  for (const b of balls) {
    c.fillStyle = b.flash > 0.1 ? "#fff" : "#ddd";
    c.shadowBlur = 0;
    c.beginPath();
    c.arc(cx + b.x * radius, cy + b.y * radius, 3.5 + b.flash * 2, 0, Math.PI * 2);
    c.fill();
    if (b.flash) {
      c.strokeStyle = `rgba(255,255,255,${b.flash})`;
      c.lineWidth = 1;
      c.beginPath();
      c.arc(cx + b.x * radius, cy + b.y * radius, 8 + (1 - b.flash) * 15, 0, Math.PI * 2);
      c.stroke();
    }
  }
  c.shadowBlur = 0;
  $("orbitAngle").textContent = `${Math.round((orbitState.phase * 180 / Math.PI + params.orbitRotation + 360) % 360)}\xB0`;
}
const tapeLayout = new URLSearchParams(location.search).get("tapeLayout") || "space-echo";
let frequencyData = new Uint8Array(512), tapeAngle = 0, tapeSeconds = 0;
const renderClock = createRenderClock(30);
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
function updateAmbientDisplay() {
  $("ambientHarmony").textContent = AMBIENT_KEYS[ambientState.key] + " " + AMBIENT_SCALES[ambientState.scale] + " / " + ambientStats.chord;
  $("ambientElapsed").textContent = String(Math.floor(ambientStats.elapsed / 60)).padStart(2, "0") + ":" + String(Math.floor(ambientStats.elapsed % 60)).padStart(2, "0");
  $("ambientNext").textContent = ambientState.hold ? "CHORD HELD" : "NEXT CHORD " + Math.ceil(ambientStats.next ?? ambientState.change) + " s";
}
function frame(time) {
  inspectAudioClock(time);
  syncTapeVisualSubscription();
  if (ambientPointsDirty) {
    ambientPointsDirty = false;
    ambientNode?.port.postMessage({ type: "points", value: ambientState.points });
  }
  if (!renderClock.shouldDraw(time, running || !!previewNode || lastMeter > 1e-3)) {
    requestAnimationFrame(frame);
    return;
  }
  const dt = Math.min(0.1, (time - lastFrame) / 1e3 || 0.033);
  lastFrame = time;
  const verts = boundary(shapePoints($("orbitShape").value), orbitState.phase + params.orbitRotation * Math.PI / 180);
  if (running && params.tapeOn && !reducedMotion.matches) {
    tapeAngle += dt * (1.2 + 0.4 / params.delayTime);
    tapeSeconds += dt;
  }
  if (ambientPointsDirty) {
    ambientPointsDirty = false;
    ambientNode?.port.postMessage({ type: "points", value: ambientState.points });
  }
  if (activeTab === "ambient") {
    const fit = fitCanvas($("ambientCanvas"));
    if (fit) {
      const seconds = ambientVisualSeconds(ambientStats, outputAudioTime(ctx, time), running && ambientState.enabled && ctx?.state === "running"), motionTime = reducedMotion.matches ? 0 : seconds, points = ambientPoints.render(fit.w, fit.h, motionTime, lastMeter, reducedMotion.matches);
      drawAmbient(fit, ambientState, ambientStats, motionTime * 1e3, lastMeter, points);
      ditherCanvas($("ambientCanvas"));
    }
    updateAmbientDisplay();
  } else if (activeTab === "visual") {
    const fit = fitCanvas($("visualCanvas"));
    if (fit) visuals.frame(fit, dt);
  } else {
    if (activeTab === "orbit") {
      drawOrbit(verts);
      ditherCanvas($("orbitCanvas"));
    } else if (activeTab === "tape") {
      const fit = fitCanvas($("tapeCanvas"));
      if (fit) {
        drawTape(fit, params, tapeAngle, lastMeter, tapeSeconds, tapeLayout, {
          dt, telemetry: tapeVisualSnapshot, audioTime: outputAudioTime(ctx, time),
          running: running && ctx?.state === "running" && !document.hidden,
          reducedMotion: reducedMotion.matches, trail: visuals.settings().trail
        });
        ditherCanvas($("tapeCanvas"));
      }
    } else if (activeTab === 'fx' && document.body.dataset.spacePanel !== 'filter') {
      const fit = fitCanvas($('spaceCanvas'));
      if (fit) {
        let level = 0;
        if (running && spaceAnalyser && ctx?.state === 'running') {
          spaceAnalyser.getFloatTimeDomainData(spaceSamples);
          for (const value of spaceSamples) level += value * value;
          level = Math.min(1, Math.sqrt(level / spaceSamples.length) * 16);
        }
        drawSpaceReverb(fit, params, { time: running ? ctx?.currentTime || 0 : 0, level, reducedMotion: reducedMotion.matches });
        ditherCanvas($('spaceCanvas'));
        $('spaceActivity').textContent = level > .002 ? 'REVERB ACTIVE' : 'REVERB QUIET';
      }
    } else {
      drawWave(dt);
      ditherCanvas($("waveform"));
    }
  }
  $("grainCount").textContent = activeTab === "orbit" ? `${balls.length} BALLS \xB7 ${orbitVoices.size} VOICES` : ambientState.enabled ? `${ambientStats.notes} NOTES \xB7 SECTION ${ambientStats.section}` : `${running ? stats.count : 0} ACTIVE GRAINS`;
  const outputFit = fitCanvas($("outputScope"));
  if (outputFit) visuals.outputFrame(outputFit, dt, reducedMotion.matches);
  if (analyser) {
    analyser.getByteFrequencyData(frequencyData);
    lastMeter += (Math.max(...frequencyData) / 255 - lastMeter) * (1 - Math.exp(-dt / 0.1));
    $("meterBar").style.height = lastMeter * 100 + "%";
  }
  requestAnimationFrame(frame);
}
function download(blob, name) {
  const url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2e3);
}
const projectControls = ["filterType", "orbitKey", "orbitScale", "orbitInstrument", "orbitShape"];
function sessionSnapshot() {
  const controls = Object.fromEntries(projectControls.map((id) => [id, $(id).value]));
  return { piece, name: sourceName, buffer, params, ambient: ambientState, visual: visuals.settings(), controls, orbitSound: soundState, volume: +$("volume").value };
}
function saveProject() {
  try {
    download(new Blob([serializeProject(sessionSnapshot())], { type: "application/json" }), sourceName.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".hushfield.json");
    recovery?.exported();
    toast("Project file download started with its audio sample and settings.");
  } catch (error) {
    toast("Could not save project: " + error.message);
  }
}
function projectDecodeOptions(context) {
  return {
    decodeAudio: (bytes) => context.decodeAudioData(bytes),
    defaults: initial,
    ranges: { ...Object.fromEntries(Object.entries(ranges).map(([id, range]) => [id, range.input])), sampleLevel: { min: 0, max: 100, step: 5 }, orbitLevel: { min: 0, max: 100, step: 5 } },
    controls: Object.fromEntries(projectControls.map((id) => [id, Array.from($(id).options, (o) => o.value)]))
  };
}
function applyProject(project) {
  solo = null;
  piece = project.piece;
  setSample(project.buffer, project.name, "PROJECT AUDIO");
  params = project.params;
  for (const [id, value] of Object.entries(project.controls)) $(id).value = value;
  $("volume").value = project.volume;
  if (master) master.gain.value = project.volume;
  ambientState = { ...project.ambient, enabled: true };
  visuals.restore(project.visual);
  soundState = project.orbitSound;
  orbitAudio?.sync(soundState);
  refreshControls();
  resetBalls();
  syncAmbient();
  $("demo").selectedIndex = -1;
  syncTextureSource();
}
async function loadProject(file) {
  try {
    await sampleSelection.run(async () => {
      if (file.size > 30 * 1024 * 1024) throw new Error("Project exceeds the 30 MB limit.");
      return decodeProject(await file.text(), projectDecodeOptions(decodeContext()));
    }, (project) => {
      applyProject(project);
      toast("Project restored, including its sample.");
    });
  } catch (error) {
    toast("Could not open project: " + error.message);
  }
}
const outputCapture = createOutputCapture({
  send: (message) => recordDestination.port.postMessage(message),
  onState(state) {
    outputRecording = state !== "idle";
    $("recordOut").disabled = state === "finishing";
    $("recordOut").classList.toggle("recording", state === "recording");
    $("recordOut").textContent = { idle: "\u25CF Capture", recording: "\u25A0 Finish capture", finishing: "Finishing capture\u2026" }[state];
    $("recordOut").setAttribute("aria-label", { idle: "Capture audio", recording: "Finish audio capture", finishing: "Finishing audio capture" }[state]);
  },
  onComplete(blob) {
    download(blob, "hushfield-capture.wav");
    toast("Performance WAV downloaded.");
  },
  onError(error) {
    toast("Capture unavailable: " + error.message);
  }
});
let captureStarting = false;
async function toggleCapture() {
  if (outputCapture.state === "recording") {
    outputCapture.stop();
    return;
  }
  if (outputCapture.busy || captureStarting) return;
  captureStarting = true;
  try {
    await ensureAudio();
    outputCapture.start(ctx.sampleRate);
  } catch (error) {
    toast("Capture unavailable: " + error.message);
  } finally {
    captureStarting = false;
  }
}
let microphoneSelection;
const microphone = createMicrophoneTake({
  ensureAudio,
  getUserMedia: (constraints) => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error("Microphone capture requires HTTPS or localhost and a supported browser.");
    return navigator.mediaDevices.getUserMedia(constraints);
  },
  Recorder: class {
    constructor(stream) {
      return new MediaRecorder(stream);
    }
  },
  onState(state) {
    if (state === "requesting") microphoneSelection = sampleSelection.reserve();
    micRecording = state !== "idle";
    $("micBtn").disabled = state === "finishing";
    $("micBtn").textContent = { idle: "Record microphone", requesting: "Cancel microphone request", recording: "Stop recording", finishing: "Finishing take\u2026" }[state];
    if (state === "recording" && running) {
      running = false;
      syncPlayback();
      silenceOrbit();
      updateTransport();
    }
  },
  async onComplete(blob) {
    await microphoneSelection.run(async () => decodeContext().decodeAudioData(await blob.arrayBuffer()), (decoded) => {
      piece.source = "sample";
      setSample(decoded, "Microphone take", "MICROPHONE");
      syncTextureSource();
      $("demo").selectedIndex = -1;
      showTab("sample");
      toast("Recording loaded. Trim it or apply the denoise gate.");
    });
  },
  onError(error) {
    toast(error.name === "NotAllowedError" ? "Microphone permission was declined. You can import an audio file instead." : "Microphone unavailable: " + error.message);
  }
});
function toggleMic() {
  if (microphone.busy) microphone.stop();
  else microphone.start();
}
function applyPreset(key) {
  controlHistory?.clear();
  const selected = selectPiecePreset(key, { defaults: initial, cancelPending: sampleSelection.cancel });
  if (!selected) return;
  markEdited();
  solo = null;
  piece = selected.piece;
  ambientState = selected.ambient;
  params = selected.params;
  soundState = selected.soundState;
  for (const [id, value] of Object.entries(selected.controls)) $(id).value = value;
  $("piecePreset").value = key;
  orbitAudio?.sync(soundState);
  resetBalls();
  refreshControls();
  syncTextureSource();
  syncAmbient();
  showTab(key === "still" ? "ambient" : "grain");
  toast(selected.label + " \xB7 Foundation, Texture, Motion and finishing restored.");
}
$("playBtn").onclick = togglePlay;
$("testSound").onclick = testSound;
$("restartAudio").onclick = restartAudio;
$("freezeBtn").onclick = toggleFreeze;
$("scanToggle").onclick = () => {
  params.scanOn = !params.scanOn;
  refreshControls();
};
$("tapeToggle").onclick = () => {
  params.tapeOn = !params.tapeOn;
  refreshControls();
};
$("scanMode").onchange = () => {
  params.scanMode = $("scanMode").value;
  syncEngine();
};
$("filterType").onchange = syncEngine;
$("volume").oninput = () => {
  if (master) master.gain.setTargetAtTime(+$("volume").value, ctx.currentTime, 0.03);
};
$("demo").onchange = () => {
  if ($("demo").value.startsWith('surge-')) {
    loadSurgeTexture($("demo").value.slice(6));
    return;
  }
  piece.source = "sample";
  loadDemo($("demo").value);
  syncTextureSource();
};
$("importBtn").onclick = () => $("audioFile").click();
$("audioFile").onchange = (e) => {
  if (e.target.files[0]) importAudio(e.target.files[0]);
  e.target.value = "";
};
$("micBtn").onclick = toggleMic;
$("applyTrim").onclick = applyTrim;
$("resetSample").onclick = () => {
  if (originalBuffer) {
    sampleSelection.cancel();
    if (piece.source === "foundation") piece.source = "sample";
    setSample(originalBuffer, sourceName, "RESTORED AUDIO", true);
    syncTextureSource();
    toast("Full original sample restored.");
  }
};
$("previewSource").onclick = async () => {
  try {
    await ensureAudio();
    if (previewNode) {
      previewNode.stop();
      previewNode = null;
      $("previewSource").textContent = "\u25B7 Listen to source";
      return;
    }
    running = false;
    syncPlayback();
    updateTransport();
    updateAudioState("Listening to original material; the piece is paused.");
    previewNode = ctx.createBufferSource();
    previewNode.buffer = buffer;
    previewNode.connect(master);
    const source = previewNode;
    previewNode.onended = () => {
      if (previewNode !== source) return;
      previewNode = null;
      $("previewSource").textContent = "\u25B7 Listen to source";
      updateAudioState();
    };
    previewNode.start();
    $("previewSource").textContent = "\u25A0 Stop source";
  } catch (e) {
    toast(e.message);
  }
};
$("saveProject").onclick = saveProject;
$("loadProject").onclick = () => $("projectFile").click();
$("projectFile").onchange = (e) => {
  if (e.target.files[0]) loadProject(e.target.files[0]);
  e.target.value = "";
};
$("recordOut").onclick = toggleCapture;
$("aboutBtn").onclick = () => $("about").showModal();
$("closeAbout").onclick = () => $("about").close();
$("about").addEventListener("click", (e) => {
  if (e.target === $("about")) {
    const r = $("about").getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) $("about").close();
  }
});
window.addEventListener("hushfield:pagechange", (event) => showTab(event.detail));
document.querySelectorAll("[data-preset]").forEach((b) => b.onclick = () => applyPreset(b.dataset.preset));
$("resetBalls").onclick = resetBalls;
$("orbitShape").onchange = () => {
  syncEngine();
  containBalls(orbitState, orbitOptions());
  updateOrbitReadout();
};
$("addPoint").onclick = () => changePoints(1);
$("removePoint").onclick = () => changePoints(-1);
$("reverseSpin").onclick = () => {
  params.orbitSpin = -params.orbitSpin;
  refreshControls();
};
$("stopSpin").onclick = () => {
  params.orbitSpin = 0;
  refreshControls();
};
$("orbitKey").value = "C";
$("orbitCanvas").addEventListener("pointerdown", () => {
  orbitAudio?.nudge();
  for (const b of balls) {
    b.vx += (Math.random() - 0.5) * 1.5;
    b.vy -= 1;
  }
  toast("A little nudge.");
});
$("randomize").onclick = () => {
  markEdited();
  Object.assign(params, { spray: Math.round(Math.random() * 75), size: Math.round(60 + Math.random() * 800), density: Math.round(8 + Math.random() * 35), reverse: Math.round(Math.random() * 70), jump: Math.round(Math.random() * 30), elastic: Math.round(Math.random() * 15), chaos: Math.round(Math.random() * 40) });
  refreshControls();
  toast("A new grain texture.");
};
// Waveform gestures are owned by visualEditors: Texture anchor/size and separate trim boundaries.
document.addEventListener("keydown", (e) => {
  if (["INPUT", "SELECT", "TEXTAREA", "BUTTON", "A"].includes(e.target.tagName) || $("about").open) return;
  if (e.code === "Space") {
    e.preventDefault();
    togglePlay();
  }
  if (e.code === "KeyF") {
    e.preventDefault();
    toggleFreeze();
  }
});
document.addEventListener("dragover", (e) => {
  e.preventDefault();
  document.body.classList.add("dragging");
});
document.addEventListener("dragleave", (e) => {
  if (!e.relatedTarget) document.body.classList.remove("dragging");
});
document.addEventListener("drop", (e) => {
  e.preventDefault();
  document.body.classList.remove("dragging");
  const f = e.dataTransfer.files[0];
  if (f) {
    if (f.name.endsWith(".json")) loadProject(f);
    else importAudio(f);
  }
});
window.addEventListener("beforeunload", (e) => {
  if (micRecording || outputRecording) {
    e.preventDefault();
    e.returnValue = "";
  }
});
function setupDisplay() {
  const stage = document.createElement("div");
  stage.id = "displayStage";
  $("waveWrap").before(stage);
  stage.append($("waveWrap"), document.querySelector(".orbit-stage"));
  const deck = document.createElement("div");
  deck.id = "tapeDeck";
  deck.innerHTML = '<canvas id="tapeCanvas" aria-label="A physical tape loop folds and slides without crossing itself. The lower tape follows the audible Wow and Flutter; the head responds to sound and echo energy."></canvas>';
  stage.append(deck);
  const ambient = document.createElement("div");
  ambient.id = "ambientStage";
  ambient.innerHTML = '<canvas id="ambientCanvas" aria-label="Ambient landscape. Drag the four voice dots to change pitch and stereo position."></canvas><div class="ambient-readout"><strong id="ambientSceneName">Stillwater</strong><span id="ambientHarmony">C minor / Cm7</span></div><div class="ambient-time"><span id="ambientElapsed">00:00</span><span id="ambientNext">NEXT CHORD 48 s</span></div>';
  stage.append(ambient);
  const visual = document.createElement("div");
  visual.id = "visualStage";
  visual.append($("visualCanvas"), document.querySelector(".visual-caption"));
  stage.append(visual);
  const tools = document.createElement("div");
  tools.className = "piece-tools";
  tools.innerHTML = '<button id="partAction" hidden>Add texture</button><span id="pieceHint">ONE PIECE \xB7 THREE PARTS</span><button id="openVisual">Visual</button>';
  stage.append(tools);
  const utility = document.createElement("div");
  utility.className = "utility-strip";
  document.querySelector(".main-panel").after(utility);
  utility.append($("freezeBtn"), $("recordOut"), document.querySelector(".volume-label"), document.querySelector(".meter"));
  for (const id of ["delayMix", "feedback", "delayTime"]) $("tapeControls").prepend(document.querySelector(`[data-control="${id}"]`));
  $("tapeControls").prepend(document.querySelector('[data-control="tapeModel"]'));
  $("tapeControls").prepend(tapePresetRow);
  $("delayControls").closest(".control-group").remove();
}
setupDisplay();
let editorBeforeVisual = "ambient";
$("openVisual").onclick = () => {
  if (activeTab === "visual") showTab(editorBeforeVisual);
  else {
    editorBeforeVisual = activeTab;
    showTab("visual");
  }
  $("openVisual").textContent = activeTab === "visual" ? "Back to sound" : "Visual";
};
$("partAction").onclick = () => {
  const kind = activeTab === "orbit" ? "motion" : "texture";
  piece[kind] = kind === "motion" ? 25 : 35;
  markEdited();
  syncPlayback();
  refreshPieceUI();
};
$("freezePhrase").onclick = freezePhrase;
$("editTextureSource").onclick = () => showTab("sample");
$("useTextureSample").onclick = () => {
  sampleSelection.cancel();
  piece.source = "sample";
  markEdited();
  syncTextureSource();
  showTab("grain");
  toast("Selected material is ready as Texture.");
};
$("followHarmony").onclick = () => {
  piece.followHarmony = !piece.followHarmony;
  soundEditors?.refresh();
  markEdited();
  syncPlayback();
  updatePadLabels();
  refreshPieceUI();
};
$("choosePiece").onclick = () => {
  $("piecePreset").focus();
  $("piecePreset").showPicker?.();
};
$("piecePreset").onchange = () => {
  applyPreset($("piecePreset").value);
};
blendUI = setupPieceBlend({ getPiece: () => piece, getSolo: () => solo, onSolo(kind) {
  solo = solo === kind ? null : kind;
  syncPlayback();
  updateTransport();
}, onChange() {
  markEdited();
  syncAmbient();
} });
visuals = setupAudioVisuals({ onChange: markEdited });
textureAdjustments = setupTextureAdjustments({getSmoothing: () => visuals.settings().waveformSmoothing, setSmoothing: value => visuals.setWaveformSmoothing(value), invalidate: () => renderClock.invalidate()});
ambientPoints = setupAmbientPoints({ getState: () => ambientState, getStatus: () => ambientStats, onChange: () => {
  ambientPointsDirty = true;
  markEdited();
} });
ambientUI = setupAmbientUI({ getState: () => ambientState, onChange: () => {
  markEdited();
  syncAmbient();
  ensureVisibleSelection();
}, onInstrument: instrument => {
  controlHistory?.begin('Foundation instrument');
  try { ambientState.instrument=instrument; if(instrument!=='current')ambientState.compositionVersion=2; markEdited();syncAmbient();ensureVisibleSelection(); }
  finally { controlHistory?.end(); }
}, onPreset: id => {
  controlHistory?.begin("Foundation preset");
  try { ambientState = applyFoundationPreset(ambientState, id); markEdited(); syncAmbient(); ensureVisibleSelection(); }
  finally { controlHistory?.end(); }
}, onNew: newAmbientPiece });
volumeStepper = attachStepper(document.querySelector(".volume-label"), $("volume"), { label: "Master volume", step: 0.05, format: (v) => Math.round(v * 100) + "%" });
const shape = document.querySelector(".orbit-shape-tools");
shape.classList.add("control");
const shapeTop = document.createElement("div");
shapeTop.className = "control-top";
shapeTop.textContent = "Shape";
shape.prepend(shapeTop);
shapeStepper = attachStepper(shape, $("orbitShape"), { label: "Shape", format: (v) => v ? v + " points" : "Circle" });
soundEditors = setupSoundEditors({ getState: () => soundState, getHarmonyLinked: () => piece.followHarmony, getCount: (bank) => bank === "triggers" ? params.orbitTriggers : params.orbitBalls, onSelect: (bank, index) => {
  updatePadLabels();
  $("orbitPadStatus").textContent = index === "all" ? `ALL ${bank.toUpperCase()} SELECTED · LISTEN FIRST TO AUDITION` : `${bank === "triggers" ? "TRIGGER" : "BALL"} ${index + 1} SELECTED · LISTEN TO AUDITION`;
}, onChange: changeSound, onReset: (bank, index) => {
  markEdited();
  resetSound(soundState, bank, index);
  orbitAudio?.stop(bank, index === "all" ? void 0 : index);
  orbitAudio?.sync(soundState);
  updatePadLabels();
}, onPreview: previewSound });

function editParameters(patch) {
  markEdited();
  for (const [id, value] of Object.entries(patch)) {
    if (!ranges[id] || !Number.isFinite(value)) continue;
    const input = ranges[id].input;
    params[id] = clamp(value, +input.min, +input.max);
    if (id === "trimStart") params.trimStart = Math.min(params.trimStart, params.trimEnd - .1);
    if (id === "trimEnd") params.trimEnd = Math.max(params.trimEnd, params.trimStart + .1);
    input.value = params[id];
    ranges[id].render();
  }
  if ('position' in patch) stats.scan = params.position / 100;
  if ('orbitBalls' in patch) resizeBalls();
  if ('orbitTriggers' in patch) resizePads();
  if ('orbitRotation' in patch) containBalls(orbitState, orbitOptions());
  trimInfo(); updateOrbitReadout(); syncEngine();
}
function setupControlHistory() {
  const undo = document.createElement('button'), redo = document.createElement('button');
  undo.type = redo.type = 'button'; undo.id = 'undoControl'; redo.id = 'redoControl';
  undo.textContent = 'Undo'; redo.textContent = 'Redo';
  undo.disabled = redo.disabled = true;
  document.querySelector('.utility-strip').prepend(undo, redo);
  controlHistory = createControlHistory({
    capture: () => ({ params, piece, ambient: ambientState, sound: soundState, visual: visuals.settings(), volume: +$('volume').value,
      controls: Object.fromEntries(projectControls.map(id => [id, $(id).value])) }),
    restore(snapshot) {
      params = snapshot.params; piece = snapshot.piece; ambientState = snapshot.ambient; soundState = snapshot.sound;
      for (const [id, value] of Object.entries(snapshot.controls)) $(id).value = value;
      $('volume').value = snapshot.volume;
      master?.gain.setTargetAtTime(snapshot.volume, ctx.currentTime, .03);
      visuals.restore(snapshot.visual); resizeBalls(); refreshControls(); syncTextureSource(); syncAmbient(); markEdited();
    },
    onChange({canUndo,canRedo,label}) { undo.disabled = !canUndo; redo.disabled = !canRedo; undo.setAttribute('aria-label',label ? 'Undo '+label : 'Undo control change'); }
  });
  document.addEventListener('hushfield:editstart', e => controlHistory.begin(e.detail?.label || 'control change'));
  document.addEventListener('hushfield:editend', e => controlHistory.end({cancelled: Boolean(e.detail?.cancelled)}));
  undo.onclick = () => controlHistory.undo(); redo.onclick = () => controlHistory.redo();
  document.addEventListener('keydown', e => {
    if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z' || (e.target.matches('textarea,select,input:not([type=range])')) || document.querySelector('dialog[open]')) return;
    e.preventDefault(); e.shiftKey ? controlHistory.redo() : controlHistory.undo();
  });
  // Discrete settings changes share history; transport, file I/O and navigation do not.
  const buttons = ['scanToggle','tapeToggle','freezeBtn','randomize','reverseSpin','stopSpin','followHarmony','partAction','useTextureSample'];
  for (const id of buttons) {
    const button = $(id); if (!button) continue;
    const handler = button.onclick;
    button.onclick = event => { controlHistory.begin(button.textContent.trim()); try { handler?.(event); } finally { controlHistory.end(); markEdited(); } };
  }
  for (const id of ['filterType','scanMode']) {
    const input = $(id); let previous = input.value;
    input.addEventListener('focus', () => previous = input.value);
    const handler = input.onchange;
    input.onchange = event => { const next = input.value; input.value = previous; controlHistory.begin(id === 'filterType' ? 'filter type' : 'scan direction'); input.value = next; handler?.(event); controlHistory.end(); previous = next; markEdited(); };
  }
}

showOrbitPanel = setupPhoneUI({ showPage: showTab, currentPage: () => activeTab });
const spaceStage = document.createElement('div'); spaceStage.id = 'spaceReverbStage';
spaceStage.innerHTML = '<canvas id="spaceCanvas" role="img" aria-label="Sound moving through the reverb: ripples across a plate, waves along springs, or reflections through a room. Motion follows the measured reverb return."></canvas><div class="space-reverb-caption"><output id="spaceModelName"></output><span id="spaceActivity">REVERB QUIET</span></div><div class="space-reverb-readout"><span id="spaceModelReadout"></span><span>WET SIGNAL</span></div>';
$('displayStage').append(spaceStage);
spaceControlsUI = setupSpaceControls({ getParams: () => params, makeControl, invalidate: () => renderClock.invalidate(), onModel: model => {
  controlHistory?.begin('Reverb model');
  try { params.reverbModel = model; if (model !== 'original') params.spaceVersion = 2; markEdited(); syncEngine(); ensureVisibleSelection(); }
  finally { controlHistory?.end(); }
} });
spacePlateUI = setupSpacePlateControls({ stage: spaceStage, getParams: () => params, setParams: editParameters, begin: label => controlHistory?.begin(label), end: options => controlHistory?.end(options) });
setupOrbitPads();
setupSharedAdjuster();
visualEditors = setupVisualEditors({ getParams: () => params, setParams: editParameters, getPage: () => activeTab, getDuration: () => buffer?.duration || 0, getSource: () => piece.source, getFilterType: () => $("filterType").value });
motionControls = setupMotionControls({ getParams: () => params, setParams: editParameters });
const tapePanels = panelNav($("tapePage"), [["echo", "Echo"], ["character", "Character"], ["mechanics", "Mechanics"]], key => {
  $("tapePage").dataset.tapePanel = key;
  activeTapePanel = key;
  refreshTapeControls();
}, { ariaLabel: "Tape controls" });
setupSquareViewport();
setupControlHistory();
loadDemo("glass");
resetBalls();
updateOrbitReadout();
showTab(pageNames.includes(location.hash.slice(1)) ? location.hash.slice(1) : activeTab);
window.addEventListener("hashchange", () => {
  if (pageNames.includes(location.hash.slice(1))) showTab(location.hash.slice(1));
});
requestAnimationFrame(frame);
window.addEventListener("pagehide", () => microphone.cancel());
recovery = setupRecoveryUI({
  snapshot: () => serializeProject(sessionSnapshot()),
  restore: (project, canApply) => sampleSelection.run(() => decodeProject(project, projectDecodeOptions(decodeContext())), (value) => {
    if (!canApply()) return false;
    restoringSession = true;
    try {
      running = false;
      syncPlayback();
      silenceOrbit();
      applyProject(value);
    } finally {
      restoringSession = false;
    }
  }),
  onError: (error) => toast("Recovery: " + error.message)
});
document.addEventListener("input", (event) => {
  if (!["audioFile", "projectFile", "visualProbe"].includes(event.target.id) && !event.target.closest(".direct-value-dialog")) markEdited();
});
document.addEventListener("change", (event) => {
  if (!["audioFile", "projectFile", "visualProbe"].includes(event.target.id) && !event.target.closest(".direct-value-dialog")) markEdited();
});
document.addEventListener("click", (event) => {
  if (event.target.closest("#scanToggle,#tapeToggle,#reverseSpin,#stopSpin,#addPoint,#removePoint")) markEdited();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) recovery.flush();
});
window.addEventListener("pagehide", () => recovery.flush());
for (const event of ["input", "change", "click", "pointermove", "keydown"]) document.addEventListener(event, () => renderClock.invalidate());
for (const event of ["resize", "orientationchange", "hushfield:layoutchange", "hushfield:visualresize"]) window.addEventListener(event, () => renderClock.invalidate());
