import { retireAudioContext } from "./audio-startup.mjs";
function createProcessorGuard(onFailure) {
  let generation = 0, nodes = [];
  function clear() {
    generation++;
    for (const node of nodes) node.onprocessorerror = null;
    nodes = [];
  }
  function watch(next) {
    clear();
    nodes = next.filter(Boolean);
    const current = generation;
    for (const node of nodes) node.onprocessorerror = () => {
      if (current !== generation) return;
      clear();
      onFailure(new Error("Sound engine stopped. Tap Restart audio."));
    };
  }
  return { watch, clear };
}
function releaseAudioGraph({ context, processors, orbit }) {
  orbit?.dispose();
  for (const node of processors.filter(Boolean)) {
    node.onprocessorerror = null;
    node.port.onmessage = null;
    try {
      node.disconnect();
    } catch {
    }
  }
  retireAudioContext(context);
}
export {
  createProcessorGuard,
  releaseAudioGraph
};
