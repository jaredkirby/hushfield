import { wavHeader, encodePcm } from "./wave-file.mjs";
function createOutputCapture({ send, onState = () => {
}, onComplete = () => {
}, onError = () => {
} }) {
  let state = "idle", serial = 0, take;
  const setState = (value) => {
    state = value;
    onState(value);
  };
  function start(rate) {
    if (state !== "idle") return false;
    take = { id: ++serial, rate, frames: 0, parts: [] };
    setState("recording");
    try {
      send({ type: "start", id: take.id, maxFrames: Math.floor(rate * 300) });
    } catch (error) {
      fail(error);
      return false;
    }
    return true;
  }
  function stop() {
    if (state !== "recording") return;
    setState("finishing");
    try {
      send({ type: "stop", id: take.id });
    } catch (error) {
      fail(error);
    }
  }
  function fail(error) {
    take = void 0;
    setState("idle");
    onError(error);
  }
  function receive(message) {
    if (!take || message.id !== take.id) return;
    if (message.type === "chunk") {
      const remaining = Math.floor(take.rate * 300) - take.frames;
      const length = Math.min(message.left.length, message.right.length, remaining);
      if (length > 0) {
        take.parts.push(encodePcm([message.left.subarray(0, length), message.right.subarray(0, length)]));
        take.frames += length;
      }
    } else if (message.type === "done") {
      const finished = take;
      setState("finishing");
      try {
        if (!finished.frames) throw new Error("No audio captured. Start sound first.");
        const blob = new Blob([wavHeader(finished.frames, finished.rate), ...finished.parts], { type: "audio/wav" });
        onComplete(blob);
      } catch (error) {
        onError(error);
      } finally {
        take = void 0;
        setState("idle");
      }
    }
  }
  return { start, stop, receive, fail, get state() {
    return state;
  }, get busy() {
    return state !== "idle";
  } };
}
export {
  createOutputCapture
};
