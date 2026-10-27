import { tapeWow, tapeFlutter } from './tape-motion.mjs';
import { TAPE_HEAD_POSES, TAPE_SUPPORT_X } from './tape-mechanism.mjs';
import { SPACE_ECHO_MODES } from './tape-settings.mjs';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const TAPE_HEADS = TAPE_HEAD_POSES.map(head => head.x);

// The audio processor supplies its own phase and smoothed controls. Align
// that phase to the output clock, including the device's output latency.
export function tapeVisualState(params, snapshot, audioTime, fallbackSeconds = 0) {
  const p = snapshot?.params;
  const live = !!p && [snapshot.phase, snapshot.audioTime, p.on, p.delayTime, p.wow, p.flutter].every(Number.isFinite);
  const seconds = live ? Math.max(0, snapshot.phase + clamp(audioTime - snapshot.audioTime, -.2, .2)) : fallbackSeconds;
  const on = params.tapeOn ? (live ? p.on : 1) : 0;
  const phaseOffset = live ? clamp(audioTime - snapshot.audioTime, -.2, .2) : 0;
  const selected = params.tapeModel === 2 ? SPACE_ECHO_MODES[(params.echoMode || 4) - 1].heads : [2];
  return {
    seconds, on, live,
    waveform: live ? snapshot.waveform : null,
    modulation: live && snapshot.modulation ? snapshot.modulation.map(model => ({...model, phase: Math.max(0, model.phase + phaseOffset), on: params.tapeOn ? model.on : 0})) : null,
    speed: live && Number.isFinite(snapshot.speed) ? snapshot.speed : undefined,
    headWeights: live && snapshot.headWeights ? snapshot.headWeights : [1, 2, 3].map(head => Number(selected.includes(head))),
    headSignal: live && snapshot.headRms ? snapshot.headRms.map(value => clamp(value * 12, 0, 1)) : [0, 0, 0],
    spring: live ? clamp((snapshot.springRms || 0) * 12, 0, 1) : 0,
    delayTime: live ? p.delayTime : params.delayTime,
    wow: on * (live ? p.wow : params.wow / 100),
    flutter: on * (live ? p.flutter : params.flutter / 100),
    drive: on * (live ? p.drive : params.drive / 100),
    hiss: on * (live ? p.hiss : params.hiss / 100),
    tone: live ? p.tone : params.tapeTone / 100,
    signal: live ? clamp(snapshot.outputRms * 8, 0, 1) : 0,
    echo: live ? clamp(snapshot.echoRms * 12, 0, 1) : 0
  };
}

// Bounded displacement on the exposed lower run. Endpoints and all three
// heads stay fixed, with zero slope at each support. The frequencies and
// phase come from the exact modulation functions used by the tape DSP.
export function tapeHeadOffset(x, state) {
  const segment = TAPE_SUPPORT_X.findIndex((end,i) => i>0 && x<=end);
  if(segment<1)return 0;
  const start=TAPE_SUPPORT_X[segment-1],end=TAPE_SUPPORT_X[segment];
  const u = clamp((x-start)/(end-start),0,1);
  const support = Math.sin(Math.PI*u) ** 2;
  // Exaggerate the audio modulation for the small dithered display. A soft
  // limit keeps high settings readable without a hard stop in the motion.
  let detail = 0;
  if (state.waveform?.length > 1 && state.on) {
    const position = clamp((x - TAPE_SUPPORT_X[0]) / (TAPE_SUPPORT_X.at(-1) - TAPE_SUPPORT_X[0]), 0, 1) * (state.waveform.length - 1);
    const index = Math.floor(position), fraction = position - index;
    const smooth = fraction * fraction * (3 - 2 * fraction);
    const sample = state.waveform[index] * (1 - smooth) + state.waveform[Math.min(index + 1, state.waveform.length - 1)] * smooth;
    detail = 6.75 * state.on * Math.tanh(sample * 12);
  }
  const sway = state.modulation ? state.modulation.reduce((sum, model) => sum + model.weight * model.on *
    (tapeWow(model.phase, model.wow) * 3000 + tapeFlutter(model.phase, model.flutter) * 11000), 0)
    : tapeWow(state.seconds, state.wow) * 3000 + tapeFlutter(state.seconds, state.flutter) * 11000;
  const displacement = sway + detail;
  return support * 20 * Math.tanh(displacement / 20);
}
