const defaultClock = () => ({
  wallTime: Date.now(),
  monotonicTime: globalThis.performance?.now?.() ?? null
});
const finite = value => typeof value === 'number' && Number.isFinite(value) ? value : null;
const oneOf = (value, choices) => choices.includes(value) ? value : null;
const boolean = value => typeof value === 'boolean' ? value : null;
const copy = entry => ({ ...entry, state: { ...entry.state } });

function snapshot(state) {
  return {
    visibility: oneOf(state?.visibility, ['visible', 'hidden', 'prerender', 'unloaded']),
    contextState: oneOf(state?.contextState, ['off', 'running', 'suspended', 'interrupted', 'closed', 'unknown']),
    audioTime: finite(state?.audioTime) !== null && state.audioTime >= 0 ? state.audioTime : null,
    audioSessionState: oneOf(state?.audioSessionState, ['inactive', 'active', 'interrupted']),
    audioSessionType: oneOf(state?.audioSessionType ?? state?.type, ['auto', 'playback', 'transient', 'transient-solo', 'ambient', 'play-and-record']),
    desired: boolean(state?.desired),
    pending: boolean(state?.pending),
    shouldRun: boolean(state?.shouldRun)
  };
}

// An in-memory event log only. Callers choose lifecycle events, never audio frames.
export function createPlaybackDiagnostics({ readState = () => ({}), limit = 200, now = defaultClock } = {}) {
  const capacity = Number.isFinite(limit) ? Math.max(1, Math.min(2000, Math.floor(limit))) : 200;
  let log = [];
  function record(event, detail) {
    let state, clock;
    try { state = snapshot(readState()); } catch { state = snapshot({}); }
    try { clock = now(); } catch { clock = null; }
    const entry = {
      wallTime: finite(typeof clock === 'number' ? clock : clock?.wallTime),
      monotonicTime: finite(typeof clock === 'object' ? clock?.monotonicTime : null),
      event: typeof event === 'string' ? event.slice(0, 80) : 'unknown',
      state
    };
    if (typeof detail === 'string') entry.detail = detail.slice(0, 160);
    else if (detail === null || typeof detail === 'boolean' || typeof detail === 'number' && Number.isFinite(detail)) entry.detail = detail;
    log.push(entry);
    if (log.length > capacity) log.splice(0, log.length - capacity);
    return copy(entry);
  }
  return {
    record,
    mark: label => record('marker', label),
    entries: () => log.map(copy),
    clear() { log = []; }
  };
}
