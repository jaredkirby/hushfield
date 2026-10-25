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
  const room = context.createConvolver(), wet = context.createGain();
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
  merger.connect(room);
  room.connect(wet);
  wet.connect(destination);
  return { input, filter, wet, setWidth(value) {
    const width = Math.max(0, Math.min(1, value / 100));
    widthGains.forEach((gain, i) => gain.gain.setTargetAtTime((1 + (i < 2 ? width : -width)) / 2, context.currentTime, 0.03));
  } };
}
export {
  createPieceSpace
};
