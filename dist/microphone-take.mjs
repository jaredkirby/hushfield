function createMicrophoneTake({
  ensureAudio,
  getUserMedia,
  Recorder,
  onComplete = () => {
  },
  onState = () => {
  },
  onError = () => {
  },
  schedule = setTimeout,
  unschedule = clearTimeout
}) {
  let current, state = "idle";
  const setState = (value) => {
    state = value;
    onState(value);
  };
  function release(take) {
    unschedule(take.timer);
    take.stream?.getTracks().forEach((track) => track.stop());
  }
  function finish(take) {
    release(take);
    if (current === take) {
      current = void 0;
      setState("idle");
    }
  }
  function cancel() {
    const take = current;
    if (!take) return;
    take.cancelled = true;
    release(take);
    if (take.recorder?.state === "recording") take.recorder.stop();
    finish(take);
  }
  async function start() {
    if (current) return;
    const take = { chunks: [], cancelled: false };
    current = take;
    setState("requesting");
    try {
      await ensureAudio();
      if (take.cancelled) return;
      take.stream = await getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      if (take.cancelled) {
        release(take);
        return;
      }
      const recorder = new Recorder(take.stream);
      take.recorder = recorder;
      recorder.ondataavailable = (event) => {
        if (!take.cancelled && event.data.size) take.chunks.push(event.data);
      };
      recorder.onerror = (event) => {
        take.cancelled = true;
        release(take);
        if (recorder.state === "recording") recorder.stop();
        finish(take);
        onError(event.error || new Error("Microphone recording failed."));
      };
      recorder.onstop = async () => {
        release(take);
        try {
          if (!take.cancelled) await onComplete(new Blob(take.chunks, { type: recorder.mimeType }));
        } catch (error) {
          if (!take.cancelled) onError(error);
        } finally {
          finish(take);
        }
      };
      recorder.start();
      setState("recording");
      take.timer = schedule(() => {
        if (current === take) stop();
      }, 6e4);
    } catch (error) {
      finish(take);
      if (!take.cancelled) onError(error);
    }
  }
  function stop() {
    if (state === "requesting") {
      cancel();
      return;
    }
    if (state !== "recording") return;
    setState("finishing");
    try {
      current.recorder.stop();
      release(current);
    } catch (error) {
      const take = current;
      finish(take);
      onError(error);
    }
  }
  return { start, stop, cancel, get state() {
    return state;
  }, get busy() {
    return state !== "idle";
  } };
}
export {
  createMicrophoneTake
};
