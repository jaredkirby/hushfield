const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const round = (value, scale) => Math.round(value * scale) / scale;

// Both Tape models accept .05–1.5 seconds. Relative movement preserves the
// current setting when the player first touches any point on the artwork.
export function tapeLoopDrag(start, dx = 0, dy = 0) {
  return {
    delayTime: dx === 0 ? start.delayTime : round(clamp(start.delayTime + dx * 1.45, .05, 1.5), 100),
    // Existing deliberate feedback above 65 can be lowered without a jump.
    // The artwork never raises it further; the full control remains available.
    feedback: dy === 0 ? start.feedback : round(clamp(start.feedback - dy * 65, 0, Math.max(65, start.feedback)), 1)
  };
}

export function setupTapeLoopInteraction({canvas, getParams, setParams, onBegin = () => {}, onEnd = () => {}, isActive = () => true}) {
  const listeners = [], doc = canvas.ownerDocument, host = doc?.defaultView;
  let gesture = null;
  const listen = (element, type, fn) => {
    if (!element) return;
    element.addEventListener(type, fn);
    listeners.push(() => element.removeEventListener(type, fn));
  };
  const settings = () => {
    const {delayTime, feedback} = getParams();
    return {delayTime, feedback};
  };
  const detail = () => ({label: 'Shape Tape loop', source: 'tape-loop', value: settings()});
  const apply = patch => {
    const current = getParams();
    if (patch.delayTime !== current.delayTime || patch.feedback !== current.feedback) setParams(patch);
  };
  function finish(cancelled = false) {
    if (!gesture) return;
    const old = gesture;
    gesture = null;
    if (canvas.hasPointerCapture?.(old.id)) canvas.releasePointerCapture(old.id);
    if (cancelled) apply(old.start);
    onEnd({...detail(), cancelled});
  }
  listen(canvas, 'pointerdown', event => {
    if (event.target !== canvas || event.button !== 0 || event.isPrimary === false || gesture || !isActive()) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    event.preventDefault(); event.stopPropagation();
    canvas.focus({preventScroll: true});
    onBegin(detail());
    gesture = {id: event.pointerId, x: event.clientX, y: event.clientY, width: rect.width, height: rect.height, start: settings()};
    canvas.setPointerCapture(event.pointerId);
  });
  listen(canvas, 'pointermove', event => {
    if (!gesture || gesture.id !== event.pointerId) return;
    if (!isActive()) { finish(true); return; }
    event.preventDefault();
    apply(tapeLoopDrag(gesture.start, (event.clientX - gesture.x) / gesture.width, (event.clientY - gesture.y) / gesture.height));
  });
  listen(canvas, 'pointerup', event => { if (gesture?.id === event.pointerId) finish(); });
  for (const type of ['pointercancel', 'lostpointercapture']) {
    listen(canvas, type, event => { if (gesture?.id === event.pointerId) finish(true); });
  }
  listen(canvas, 'keydown', event => {
    if (event.key === 'Escape' && gesture) { event.preventDefault(); finish(true); return; }
    if (gesture || !isActive() || event.altKey || event.ctrlKey || event.metaKey) return;
    const step = event.shiftKey ? 10 : 1;
    const horizontal = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    const vertical = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
    if (!horizontal && !vertical) return;
    event.preventDefault(); event.stopPropagation();
    const patch = tapeLoopDrag(settings(), horizontal * step * .01 / 1.45, vertical * step / 65);
    onBegin(detail());
    try { apply(patch); } finally { onEnd({...detail(), cancelled: false}); }
  });
  listen(canvas, 'blur', () => finish(true));
  listen(host, 'blur', () => finish(true));
  listen(host, 'resize', () => finish(true));
  listen(doc, 'visibilitychange', () => { if (doc.hidden) finish(true); });
  listen(doc, 'keydown', event => { if (event.key === 'Escape' && gesture) { event.preventDefault(); finish(true); } });
  return {
    refresh() { if (!isActive()) finish(true); },
    cancel() { finish(true); },
    destroy() { finish(true); listeners.forEach(remove => remove()); }
  };
}
