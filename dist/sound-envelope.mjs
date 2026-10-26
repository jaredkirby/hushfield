import { FIELD_MAP, formatSoundValue } from './sound-patches.mjs?v=hushfield-1';
import { envelopeGeometry, envelopeDragValue } from './sound-editor-model.mjs?v=hushfield-1';

export function createSoundEnvelope({ bank, getPatch, onChange, getContext }) {
  const owner = document.createElement('section');
  owner.className = 'sound-envelope';
  owner.setAttribute('aria-label', 'Sound amplitude envelope');
  const heading = document.createElement('div');
  heading.className = 'sound-envelope-heading';
  const title = document.createElement('strong'), duration = document.createElement('output');
  title.textContent = 'Shape the note';
  heading.append(title, duration);
  const graph = document.createElement('div');
  graph.className = 'sound-envelope-graph';
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(ns, 'path');
  path.classList.add('sound-envelope-path');
  svg.append(path);
  graph.append(svg);
  const hint = document.createElement('p');
  hint.className = 'sound-envelope-hint';
  hint.textContent = 'Drag A / D / H / R sideways for time. Drag S up or down for sustain.';
  owner.append(heading, graph, hint);
  let gesture = null, lastMixed = new Set();
  const handles = [];
  const dispatch = (type, field, cancelled = false) => owner.dispatchEvent(new CustomEvent('hushfield:' + type, { bubbles: true, detail: { id: bank + '-' + field, label: getContext() + ' · ' + FIELD_MAP[field].label, source: 'envelope', cancelled } }));
  const change = (field, value) => { onChange(field, value); refresh(); };
  const finish = (cancelled = false) => {
    if (!gesture) return;
    const { field, button, id } = gesture;
    gesture = null;
    dispatch('editend', field, cancelled);
    if (button.hasPointerCapture(id)) button.releasePointerCapture(id);
    refresh();
  };
  for (const [field, letter, lane] of [['attack', 'A', 12], ['decay', 'D', 36], ['sustain', 'S', null], ['gate', 'H', 60], ['release', 'R', 88]]) {
    const stem = document.createElementNS(ns, 'line');
    stem.classList.add('sound-envelope-stem');
    svg.prepend(stem);
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'sound-envelope-handle'; button.textContent = letter;
    button.setAttribute('role', 'slider');
    button.setAttribute('aria-orientation', field === 'sustain' ? 'vertical' : 'horizontal');
    button.setAttribute('aria-valuemin', String(FIELD_MAP[field].min));
    button.setAttribute('aria-valuemax', String(FIELD_MAP[field].max));
    graph.append(button);
    button.addEventListener('pointerdown', event => {
      if (event.button !== 0 || gesture) return;
      event.preventDefault();
      const rect = graph.getBoundingClientRect();
      gesture = { field, button, id: event.pointerId, initial: getPatch()[field], x: event.clientX, y: event.clientY, width: rect.width, height: rect.height, domain: envelopeGeometry(getPatch()).duration };
      dispatch('editstart', field);
      button.setPointerCapture(event.pointerId);
      button.focus({ preventScroll: true });
      refresh();
    });
    button.addEventListener('pointermove', event => {
      if (gesture?.field !== field || gesture.id !== event.pointerId) return;
      change(field, envelopeDragValue(field, gesture.initial, event.clientX - gesture.x, event.clientY - gesture.y, gesture.width, gesture.height, gesture.domain));
    });
    const end = event => {
      if (gesture?.field !== field || gesture.id !== event.pointerId) return;
      finish(event.type === 'pointercancel');
    };
    button.addEventListener('pointerup', end);
    button.addEventListener('pointercancel', end);
    button.addEventListener('lostpointercapture', end);
    button.addEventListener('blur', () => { if (gesture?.field === field) finish(); });
    button.addEventListener('keydown', event => {
      if (event.key === 'Escape' && gesture?.field === field) { event.preventDefault(); finish(true); return; }
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      if (gesture) return;
      const definition = FIELD_MAP[field], direction = ['ArrowUp', 'ArrowRight'].includes(event.key) ? 1 : -1;
      const value = event.key === 'Home' ? definition.min : event.key === 'End' ? definition.max : getPatch()[field] + direction * definition.step * (event.shiftKey ? 5 : 1);
      dispatch('editstart', field);
      change(field, Math.max(definition.min, Math.min(definition.max, value)));
      dispatch('editend', field);
    });
    handles.push({ field, button, stem, lane });
  }
  function refresh(mixed = lastMixed) {
    lastMixed = mixed;
    const patch = getPatch(), geometry = envelopeGeometry(patch, gesture?.domain);
    path.setAttribute('d', geometry.points.map(([x, y], index) => `${index ? 'L' : 'M'}${x},${y}`).join(' '));
    duration.textContent = geometry.total.toFixed(2) + ' s note';
    for (const { field, button, stem, lane } of handles) {
      const [x, y] = geometry.handles[field], bx = field === 'sustain' ? 96 : x, by = lane ?? y;
      button.style.left = bx + '%'; button.style.top = by + '%';
      button.setAttribute('aria-label', `${getContext()} · ${FIELD_MAP[field].label}`);
      button.setAttribute('aria-valuenow', String(patch[field]));
      const value = formatSoundValue(FIELD_MAP[field], patch[field]);
      button.setAttribute('aria-valuetext', mixed.has(field) ? `Mixed values; example ${value}` : value);
      button.title = FIELD_MAP[field].label + ': ' + value;
      for (const [name, value] of [['x1', x], ['y1', y], ['x2', bx], ['y2', by]]) stem.setAttribute(name, value);
    }
    const hasMixed = handles.some(({ field }) => mixed.has(field));
    title.textContent = hasMixed ? 'Mixed envelopes · first sound shown' : 'Shape the note';
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) finish(); });
  return { element: owner, refresh, finish };
}
