function wavHeader(frames, rate, channels = 2) {
  const bytes = new ArrayBuffer(44), view = new DataView(bytes);
  const text = (offset, value) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  const size = frames * channels * 2;
  text(0, "RIFF");
  view.setUint32(4, 36 + size, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, size, true);
  return bytes;
}
function encodePcm(channels) {
  const frames = channels[0].length, bytes = new ArrayBuffer(frames * channels.length * 2), view = new DataView(bytes);
  let offset = 0;
  for (let i = 0; i < frames; i++) for (const channel of channels) {
    const value = Math.max(-1, Math.min(1, channel[i]));
    view.setInt16(offset, value < 0 ? value * 32768 : value * 32767, true);
    offset += 2;
  }
  return bytes;
}
function encodeWav(buffer) {
  const channels = Array.from({ length: Math.min(2, buffer.numberOfChannels) }, (_, i) => buffer.getChannelData(i));
  const bytes = new Uint8Array(44 + buffer.length * channels.length * 2);
  bytes.set(new Uint8Array(wavHeader(buffer.length, buffer.sampleRate, channels.length)));
  bytes.set(new Uint8Array(encodePcm(channels)), 44);
  return bytes.buffer;
}
export {
  encodePcm,
  encodeWav,
  wavHeader
};
