import { restorePiece } from "./piece-session.mjs";
import { encodeWav } from "./wave-file.mjs";
import { restoreAmbient } from "./ambient-settings.mjs";
import { restoreVisual } from "./visual-analysis.mjs";
import { restoreSoundState } from "./sound-patches.mjs";
import { restoreSpace } from "./space-settings.mjs";
import { restoreTape } from "./tape-settings.mjs";
const PROJECT_FORMAT = "hushfield-project";
const record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
function restoreProjectFile(saved) {
  if (!record(saved) || ![1, 2, 3, 4, 5].includes(saved.version) || typeof saved.sample !== "string" || !record(saved.params) || !record(saved.controls) || !(saved.format === PROJECT_FORMAT || typeof saved.format === "string" && saved.format.endsWith("-browser-lab"))) throw new Error("This is not a Hushfield project.");
  const project = { ...saved, format: PROJECT_FORMAT, params: { ...saved.params }, controls: { ...saved.controls } };
  const key = Object.keys(saved.params).find((key2) => key2.endsWith("Balls") && key2.length === 10), prefix = key?.slice(0, -5);
  if (prefix && prefix !== "orbit") {
    for (const field of ["params", "controls"]) for (const [key2, value] of Object.entries(saved[field])) if (key2.startsWith(prefix) && /^[A-Z]/.test(key2.slice(prefix.length))) {
      const renamed = "orbit" + key2.slice(prefix.length);
      if (!(renamed in project[field])) project[field][renamed] = value;
      delete project[field][key2];
    }
    if (!project.orbitSound && record(saved[prefix + "Sound"])) project.orbitSound = saved[prefix + "Sound"];
    delete project[prefix + "Sound"];
    if (record(saved.ambient)) {
      project.ambient = { ...saved.ambient };
      if (!("orbit" in project.ambient) && Number.isFinite(saved.ambient[prefix])) project.ambient.orbit = saved.ambient[prefix];
      delete project.ambient[prefix];
    }
  }
  return project;
}
function serializeProject(session) {
  const { buffer, ...settings } = session;
  const bytes = new Uint8Array(encodeWav(buffer));
  let binary = "";
  for (let i = 0; i < bytes.length; i += 16e3) binary += String.fromCharCode(...bytes.subarray(i, i + 16e3));
  return JSON.stringify({ ...settings, format: PROJECT_FORMAT, version: 5, sample: btoa(binary) });
}
async function decodeProject(text, { decodeAudio, defaults, ranges, controls }) {
  if (text.length > 30 * 1024 * 1024) throw new Error("Project exceeds the 30 MB limit.");
  const saved = restoreProjectFile(JSON.parse(text));
  const binary = atob(saved.sample);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  const buffer = await decodeAudio(bytes.buffer);
  if (!buffer.length || buffer.duration > 60.1) throw new Error("Project audio must contain up to 60 seconds.");
  const params = { ...defaults };
  for (const [id, fallback] of Object.entries(defaults)) {
    const value = saved.params[id], spec = ranges[id];
    if (spec && Number.isFinite(value)) {
      const min = +spec.min, max = +spec.max, step = +spec.step || 1;
      params[id] = Math.max(min, Math.min(max, min + Math.round((value - min) / step) * step));
      params[id] = Math.round(params[id] * 1e6) / 1e6;
    } else if (typeof fallback === "boolean" && typeof value === "boolean") params[id] = value;
  }
  if (["forward", "reverse", "pingpong"].includes(saved.params.scanMode)) params.scanMode = saved.params.scanMode;
  Object.assign(params, restoreSpace(saved.params, saved.version < 5));
  Object.assign(params, restoreTape(saved.params));
  const selected = {};
  for (const [id, options] of Object.entries(controls)) selected[id] = options.includes(saved.controls[id]) ? saved.controls[id] : options[0];
  return {
    name: String(saved.name || "Untitled").slice(0, 100),
    buffer,
    piece: restorePiece(saved.piece, saved.version < 4 ? {ambient:restoreAmbient(saved.ambient, saved.version < 3),params:saved.params} : undefined),
    params,
    controls: selected,
    volume: Number.isFinite(saved.volume) ? Math.max(0, Math.min(1, saved.volume)) : 0.55,
    ambient: restoreAmbient(saved.version < 5 ? { ...saved.ambient, compositionVersion: 1 } : saved.ambient, saved.version < 3),
    visual: restoreVisual(saved.visual),
    orbitSound: restoreSoundState(saved.orbitSound, saved)
  };
}
export {
  PROJECT_FORMAT,
  decodeProject,
  restoreProjectFile,
  serializeProject
};
