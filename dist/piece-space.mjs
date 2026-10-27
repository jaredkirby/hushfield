import { generateReverbImpulse } from './vintage-reverb.mjs';
function createPieceSpace(context, destination) {
  const input = context.createGain(), filter = context.createBiquadFilter();
  const splitter = context.createChannelSplitter(2), merger = context.createChannelMerger(2);
  const widthGains = [];
  input.connect(filter);
  filter.connect(splitter);
  for (const [from, to] of [[0, 0], [1, 1], [0, 1], [1, 0]]) {
    const gain = context.createGain();
    splitter.connect(gain, from);
    gain.connect(merger, 0, to);
    widthGains.push(gain);
  }
  const room = context.createConvolver(), wet = context.createGain(), legacySend = context.createGain();
  const wetFilter = context.createBiquadFilter();
  wetFilter.frequency.value = filter.frequency.value;
  wetFilter.Q.value = filter.Q.value;
  wetFilter.connect(room);
  const legacyReturn = context.createGain(), modernReturn = context.createGain();
  const roomSplitter = context.createChannelSplitter(2), roomMerger = context.createChannelMerger(2), roomWidthGains = [];
  modernReturn.connect(roomSplitter);
  for (const [from, to] of [[0, 0], [1, 1], [0, 1], [1, 0]]) {
    const gain = context.createGain();
    roomSplitter.connect(gain, from); gain.connect(roomMerger, 0, to); roomWidthGains.push(gain);
  }
  roomMerger.connect(wet);
  const roomLow = context.createBiquadFilter(), roomHigh = context.createBiquadFilter();
  roomLow.type = 'highpass'; roomLow.frequency.value = 20; roomLow.Q.value = .707;
  roomHigh.type = 'lowpass'; roomHigh.frequency.value = Math.min(20000, context.sampleRate * .46); roomHigh.Q.value = .707;
  modernReturn.gain.value = 0;
  const parts = {}, sends = {};
  let depthInitialized = false;
  for (const part of ['foundation', 'texture', 'motion']) {
    parts[part] = context.createGain();
    sends[part] = context.createGain();
    sends[part].gain.value = 0;
    parts[part].connect(input);
    parts[part].connect(sends[part]);
    sends[part].connect(wetFilter);
  }
  const impulse = context.createBuffer(2, context.sampleRate * 4, context.sampleRate);
  let seed = 814;
  for (let ch = 0; ch < 2; ch++) {
    const samples = impulse.getChannelData(ch);
    for (let i = 0; i < samples.length; i++) {
      seed = Math.imul(seed, 1664525) + 1013904223 >>> 0;
      samples[i] = (seed / 2147483648 - 1) * (1 - i / samples.length) ** 3 * Math.min(1, i / 200);
    }
  }
  room.buffer = impulse;
  merger.connect(destination);
  merger.connect(legacySend);
  legacySend.connect(room);
  room.connect(legacyReturn); legacyReturn.connect(wet);
  const originalGate = context.createGain();
  room.connect(originalGate); originalGate.connect(roomLow); roomLow.connect(roomHigh); roomHigh.connect(modernReturn);
  // Two fixed convolution lanes keep replacement work and graph size bounded.
  const vintageInput = context.createDelay(.15), vintageTone = context.createBiquadFilter();
  vintageTone.type = 'lowpass'; vintageTone.frequency.value = Math.min(12000, context.sampleRate * .46);
  wetFilter.connect(vintageInput); vintageInput.connect(vintageTone);
  const vintageSplitter = context.createChannelSplitter(2), vintageMerger = context.createChannelMerger(2), vintageWidth = [];
  for (const [from, to] of [[0, 0], [1, 1], [0, 1], [1, 0]]) {
    const gain = context.createGain(); vintageSplitter.connect(gain, from); gain.connect(vintageMerger, 0, to); vintageWidth.push(gain);
    gain.gain.value = from === to ? 1 : 0;
  }
  vintageMerger.connect(roomLow);
  const lanes = Array.from({ length: 2 }, () => {
    const convolver = context.createConvolver(), gain = context.createGain();
    convolver.normalize = false; gain.gain.value = 0;
    vintageTone.connect(convolver); convolver.connect(gain); gain.connect(vintageSplitter);
    return { convolver, gain };
  });
  let selectedLane = -1, reverbKey = '', reverbInitialized = false, pendingReverb = null, swapTimer = null, swapUntil = 0;
  const smooth = (parameter, value, immediate = false) => {
    if (immediate) parameter.setValueAtTime(value, context.currentTime);
    else {
      if (parameter.cancelAndHoldAtTime) parameter.cancelAndHoldAtTime(context.currentTime);
      else parameter.cancelScheduledValues(context.currentTime);
      parameter.setTargetAtTime(value, context.currentTime, .025);
    }
  };
  const fadeModel = (parameter, value, immediate) => {
    if (immediate) parameter.setValueAtTime(value, context.currentTime);
    else {
      const heldValue = parameter.value;
      parameter.cancelAndHoldAtTime(context.currentTime);
      // Anchor even after a completed fade: otherwise a new linear ramp can
      // interpolate backwards from the previous endpoint and jump on selection.
      parameter.setValueAtTime(heldValue, context.currentTime);
      parameter.linearRampToValueAtTime(value, context.currentTime + .12);
    }
  };
  const setReverb = (settings = {}) => {
    const model = ['plate', 'spring', 'chamber'].includes(settings.reverbModel) ? settings.reverbModel : 'original';
    const decay = Number.isFinite(settings.reverbDecay) ? Math.max(.5, Math.min(8, settings.reverbDecay)) : 3;
    const key = model + ':' + decay;
    const immediate = !reverbInitialized;
    smooth(vintageInput.delayTime, Math.max(0, Math.min(150, Number.isFinite(settings.reverbPredelay) ? settings.reverbPredelay : 0)) / 1000, immediate);
    const tone = Math.max(0, Math.min(100, Number.isFinite(settings.reverbTone) ? settings.reverbTone : 65));
    smooth(vintageTone.frequency, Math.min(context.sampleRate * .46, 800 * 20 ** (tone / 100)), immediate);
    const width = Math.max(0, Math.min(100, Number.isFinite(settings.reverbWidth) ? settings.reverbWidth : 100)) / 100;
    vintageWidth.forEach((node, i) => smooth(node.gain, (1 + (i < 2 ? width : -width)) / 2, immediate));
    if (key !== reverbKey) {
      // Coalesce edits during a fade before replacing its inaudible lane. Latest selection wins.
      if (!immediate && model !== 'original' && context.currentTime < swapUntil) {
        pendingReverb = { ...settings };
        if (swapTimer === null) swapTimer = setTimeout(() => { swapTimer = null; const next = pendingReverb; pendingReverb = null; if (context.state === 'closed') return; if (context.state === 'suspended') { pendingReverb = next; return; } if (next) setReverb(next); }, 160);
        return;
      }
      pendingReverb = null;
      if (swapTimer !== null) { clearTimeout(swapTimer); swapTimer = null; }
      if (model !== 'original') {
        selectedLane = selectedLane === 0 ? 1 : 0;
        const channels = generateReverbImpulse(context.sampleRate, { reverbModel: model, reverbDecay: decay });
        const buffer = context.createBuffer(2, channels[0].length, context.sampleRate);
        channels.forEach((channel, index) => buffer.copyToChannel(channel, index));
        lanes[selectedLane].convolver.buffer = buffer;
      }
      fadeModel(originalGate.gain, model === 'original' ? 1 : 0, immediate);
      lanes.forEach((lane, index) => fadeModel(lane.gain.gain, model !== 'original' && index === selectedLane ? 1 : 0, immediate));
      reverbKey = key; swapUntil = context.currentTime + .15;
    } else if (pendingReverb) {
      pendingReverb = null; if (swapTimer !== null) { clearTimeout(swapTimer); swapTimer = null; }
    }
    reverbInitialized = true;
  };
  context.addEventListener('statechange', () => {
    if (context.state === 'running' && pendingReverb) {
      const latest = pendingReverb;
      pendingReverb = null;
      setReverb(latest);
    }
  });
  wet.connect(destination);
  return { input, parts, filter, wet, setReverb, setDepth(settings) {
    const modern = settings.spaceVersion === 2;
    const setParameter = (parameter, value) => depthInitialized ? parameter.setTargetAtTime(value, context.currentTime, .05) : parameter.setValueAtTime(value, context.currentTime);
    setParameter(legacySend.gain, modern ? 0 : 1);
    setParameter(legacyReturn.gain, modern ? 0 : 1);
    setParameter(modernReturn.gain, modern ? 1 : 0);
    setParameter(roomLow.frequency, Number.isFinite(settings.roomLow) ? Math.max(20, Math.min(2000, settings.roomLow)) : 180);
    setParameter(roomHigh.frequency, Number.isFinite(settings.roomHigh) ? Math.max(1000, Math.min(20000, context.sampleRate * .46, settings.roomHigh)) : Math.min(7500, context.sampleRate * .46));
    for (const part of Object.keys(parts)) {
      const value = settings[part + 'Room'];
      setParameter(sends[part].gain, modern && Number.isFinite(value) ? Math.max(0, Math.min(100, value)) / 100 : 0);
    }
    depthInitialized = true;
  }, setTone(type, cutoff, resonance) {
    for (const node of [filter, wetFilter]) {
      node.type = ['lowpass', 'highpass', 'bandpass'].includes(type) ? type : 'lowpass';
      node.frequency.setTargetAtTime(Number.isFinite(cutoff) ? Math.max(20, Math.min(context.sampleRate * .46, cutoff)) : 14000, context.currentTime, .03);
      node.Q.setTargetAtTime(Number.isFinite(resonance) ? Math.max(.1, Math.min(12, resonance)) : .6, context.currentTime, .03);
    }
  }, setWidth(value) {
    const width = Math.max(0, Math.min(1, value / 100));
    for (const gains of [widthGains, roomWidthGains]) gains.forEach((gain, i) => gain.gain.setTargetAtTime((1 + (i < 2 ? width : -width)) / 2, context.currentTime, 0.03));
  } };
}
export {
  createPieceSpace
};
