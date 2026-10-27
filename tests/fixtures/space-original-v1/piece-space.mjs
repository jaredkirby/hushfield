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
  room.connect(roomLow); roomLow.connect(roomHigh); roomHigh.connect(modernReturn);
  wet.connect(destination);
  return { input, parts, filter, wet, setDepth(settings) {
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
