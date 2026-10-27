// Browser interruption changes availability, not the player's Start/Stop choice.
// The caller owns audio activation and passes states from the current context.
export function createPlaybackIntent() {
  let revision = 0, desired = false, pending = false;
  let contextState = 'off', reason = 'initial';

  function status() {
    return {
      desired, pending, contextState, reason,
      shouldRun: desired && !pending && contextState === 'running'
    };
  }
  function stop(nextReason = 'user') {
    revision++;
    desired = false;
    pending = false;
    reason = nextReason;
    return status();
  }
  function requestStart() {
    revision++;
    desired = true;
    pending = true;
    reason = 'start';
    return revision;
  }
  function finishStart(token) {
    const accepted = token === revision && desired && pending;
    if (accepted) pending = false;
    // A successful resume promise does not prove the context is still running.
    return { accepted, ...status() };
  }
  function failStart(token, nextReason = 'activation-failed') {
    const accepted = token === revision && desired && pending;
    if (accepted) stop(nextReason);
    return { accepted, ...status() };
  }
  function reconcileContext(state) {
    contextState = typeof state === 'string' ? state : 'unknown';
    if (contextState === 'closed' && (desired || pending)) stop('closed');
    return status();
  }
  return { requestStart, finishStart, failStart, stop, reconcileContext, status };
}
