// History deliberately contains settings only, never audio buffers, transport,
// recordings or recovery operations. A gesture contributes at most one entry.
export function createControlHistory({ capture, restore, onChange = () => {}, limit = 40 }) {
  let past = [], future = [], pending, depth = 0;
  const clone = value => JSON.parse(JSON.stringify(value));
  const notify = () => onChange({ canUndo: past.length > 0, canRedo: future.length > 0, label: past.at(-1)?.label || '' });
  function begin(label = 'control change') {
    if (!depth++) pending = { state: clone(capture()), label };
  }
  function end({ cancelled = false } = {}) {
    if (!depth) return;
    pending.cancelled ||= cancelled;
    if (--depth) return;
    const entry = pending; pending = undefined;
    if (entry.cancelled) restore(clone(entry.state));
    else if (JSON.stringify(entry.state) !== JSON.stringify(capture())) {
      past.push(entry); if (past.length > limit) past.shift(); future = [];
    }
    notify();
  }
  function exchange(from, to) {
    if (depth || !from.length) return false;
    const entry = from.pop();
    to.push({ state: clone(capture()), label: entry.label });
    restore(clone(entry.state)); notify(); return true;
  }
  return { begin, end, undo: () => exchange(past, future), redo: () => exchange(future, past),
    clear() { past = []; future = []; pending = undefined; depth = 0; notify(); },
    get pending() { return depth > 0; }
  };
}
