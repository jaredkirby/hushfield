const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const FADE_OUT_MS = 60, FADE_IN_MS = 180;

/** Mask a settings reset in the existing audio graph. This helper never starts
 * audio and serializes callbacks so each one reads the latest session state. */
export function createResetTransition({ getAudio, getVolume, wait = pause }) {
  const queue = [];
  let active = false;

  function sameGraph(graph) {
    const current = getAudio();
    return current?.context === graph.context && current?.gain === graph.gain
      && graph.context.state !== 'closed';
  }

  async function perform(apply) {
    const graph = getAudio();
    if (!graph?.playing || graph.context?.state !== 'running' || !graph.gain) return apply();
    const { context, gain } = graph, now = context.currentTime;
    if (typeof gain.cancelAndHoldAtTime === 'function') gain.cancelAndHoldAtTime(now);
    else {
      gain.cancelScheduledValues(now);
      gain.setValueAtTime(gain.value, now);
    }
    gain.linearRampToValueAtTime(0, now + FADE_OUT_MS / 1000);
    try {
      await wait(FADE_OUT_MS);
      return apply();
    } finally {
      // Stop/restart, an interruption or a project operation can replace the
      // graph during the wait or callback. Leave any replacement alone.
      if (sameGraph(graph)) {
        const time = context.currentTime, current = getAudio();
        gain.cancelScheduledValues(time);
        if (context.state === 'running' && current.playing) {
          gain.setValueAtTime(0, time);
          gain.linearRampToValueAtTime(getVolume(), time + FADE_IN_MS / 1000);
          await wait(FADE_IN_MS);
        } else gain.setValueAtTime(getVolume(), time);
      }
    }
  }

  function drain() {
    if (active || !queue.length) return;
    active = true;
    const { apply, resolve, reject } = queue.shift();
    // perform begins synchronously: a stopped editor never waits for a fade.
    perform(apply).then(resolve, reject).finally(() => { active = false; drain(); });
  }

  return {
    run(apply) {
      return new Promise((resolve, reject) => {
        queue.push({ apply, resolve, reject });
        drain();
      });
    }
  };
}
