function createOrbitAudio(ctx, destination, state, auditionDestination, { options, balls, onSnapshot = () => {
} } = {}) {
  const node = new AudioWorkletNode(ctx, "orbit-engine", { numberOfInputs: 0, numberOfOutputs: 12, outputChannelCount: Array(12).fill(2), processorOptions: { options, balls, patches: state } });
  const voices = { size: 0 }, buses = {};
  let disposed = false;
  function makeBus(target, offset) {
    const output = ctx.createGain(), dry = ctx.createGain(), delay = ctx.createDelay(2), feedback = ctx.createGain(), delayReturn = ctx.createGain(), reverb = ctx.createConvolver(), reverbReturn = ctx.createGain();
    dry.gain.value = 0.75;
    delayReturn.gain.value = 0.5;
    reverbReturn.gain.value = 0.55;
    node.connect(dry, offset);
    node.connect(delay, offset + 1);
    node.connect(reverb, offset + 2);
    dry.connect(output);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(delayReturn);
    delayReturn.connect(output);
    reverb.connect(reverbReturn);
    reverbReturn.connect(output);
    output.connect(target);
    return { output, delay, feedback, reverb, room: 0 };
  }
  for (const [index, bank] of ["triggers", "balls"].entries()) buses[bank] = [makeBus(destination, index * 3), makeBus(auditionDestination || destination, 6 + index * 3)];
  function sync(next) {
    state = next;
    node.port.postMessage({ type: "patches", value: state });
    for (const bank of ["triggers", "balls"]) {
      const settings = state[bank], fx = settings.effects, [normal, audition] = buses[bank];
      if (normal.room !== fx.reverbTime) {
        normal.room = fx.reverbTime;
        const n = Math.round(ctx.sampleRate * fx.reverbTime), ir = ctx.createBuffer(2, n, ctx.sampleRate);
        let random = 341;
        for (let ch = 0; ch < 2; ch++) {
          const data = ir.getChannelData(ch);
          for (let i = 0; i < n; i++) {
            random = Math.imul(random, 1664525) + 1013904223 >>> 0;
            data[i] = (random / 2147483648 - 1) * (1 - i / n) ** 3 * Math.min(1, i / 200);
          }
        }
        normal.reverb.buffer = audition.reverb.buffer = ir;
      }
      const enabled = settings.base.enabled || Object.values(settings.items).some((item) => item.enabled === true);
      for (const bus of buses[bank]) {
        bus.delay.delayTime.setTargetAtTime(fx.delayTime, ctx.currentTime, 0.03);
        bus.feedback.gain.setTargetAtTime(fx.feedback / 100, ctx.currentTime, 0.03);
        bus.output.gain.setTargetAtTime(enabled ? 1 : 0, ctx.currentTime, 0.015);
      }
    }
  }
  node.port.onmessage = ({ data }) => {
    if (disposed) return;
    voices.size = data.voices;
    onSnapshot(data);
  };
  sync(state);
  const stop = (bank, index) => node.port.postMessage({ type: "stop", bank, index });
  return {
    node,
    voices,
    sync,
    stop,
    stopAll: () => stop(),
    setOptions: (value) => node.port.postMessage({ type: "options", value }),
    setTransport: (value) => node.port.postMessage({ type: "transport", value }),
    scatter: (balls2) => node.port.postMessage({ type: "scatter", balls: balls2 }),
    nudge: () => node.port.postMessage({ type: "nudge" }),
    play(bank, index, midi, patch, audition = false) {
      if (!audition || !patch.enabled || patch.level <= 0 || ctx.state !== "running" && typeof ctx.startRendering !== "function") return false;
      node.port.postMessage({ type: "audition", bank, index, midi, patch });
      return true;
    },
    dispose() {
      disposed = true;
      node.port.onmessage = null;
      node.disconnect();
    }
  };
}
export {
  createOrbitAudio
};
