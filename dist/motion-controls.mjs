export const normalizeOrientation = degrees => Math.round((((degrees + 180) % 360 + 360) % 360 - 180) * 10) / 10;
export function orientationAt(x, y, rect) {
  return normalizeOrientation(Math.atan2(y - rect.top - rect.height / 2, x - rect.left - rect.width / 2) * 180 / Math.PI + 90);
}

export function setupMotionControls({ getParams, setParams }) {
  const owner = document.createElement('section');
  owner.className = 'motion-direct-controls';
  owner.dataset.panel = 'motion';
  owner.setAttribute('aria-label', 'Motion orientation and signed speed');
  const orientation = document.createElement('div');
  orientation.className = 'motion-orientation';
  const dial = document.createElement('button');
  dial.type = 'button'; dial.className = 'motion-orientation-dial';
  dial.setAttribute('role', 'slider'); dial.setAttribute('aria-label', 'Shape orientation offset');
  dial.setAttribute('aria-valuemin', '-180'); dial.setAttribute('aria-valuemax', '180');
  const hand = document.createElement('span'); hand.className = 'motion-orientation-hand'; hand.setAttribute('aria-hidden', 'true');
  dial.append(hand);
  const orientationLabel = document.createElement('label');
  orientationLabel.textContent = 'Orientation offset';
  const angle = document.createElement('input');
  angle.type = 'number'; angle.min = '-180'; angle.max = '180'; angle.step = '1'; angle.setAttribute('aria-label', 'Orientation offset in degrees');
  orientationLabel.append(angle);
  orientation.append(dial, orientationLabel);
  const speed = document.createElement('div'); speed.className = 'motion-speed';
  const speedLabel = document.createElement('label'); speedLabel.textContent = 'Spin · signed RPM';
  const readout = document.createElement('output'); readout.id = 'motionSignedSpeed';
  const spin = document.createElement('input');
  spin.type = 'range'; spin.min = '-60'; spin.max = '60'; spin.step = '1'; spin.id = 'motionSpinSlider';
  spin.setAttribute('aria-describedby', readout.id);
  speedLabel.htmlFor = spin.id;
  const directions = document.createElement('div'); directions.className = 'motion-directions';
  directions.innerHTML = '<span>↺ −60</span><span>0 · stop</span><span>+60 ↻</span>';
  const stop = document.createElement('button'); stop.type = 'button'; stop.textContent = 'Stop spin';
  speed.append(speedLabel, readout, spin, directions, stop);
  const hint = document.createElement('p'); hint.className = 'motion-direct-hint';
  hint.textContent = 'Turn the handle to offset the shape. Spin passes through zero to reverse direction.';
  owner.append(orientation, speed, hint);
  document.querySelector('.orbit-spin-tools').before(owner);
  const dispatch = (type, id, cancelled = false) => owner.dispatchEvent(new CustomEvent('hushfield:' + type, { bubbles: true, detail: { id, label: id === 'orbitRotation' ? 'Motion orientation' : 'Motion spin', source: 'motion', cancelled } }));
  const set = (key, value) => { setParams({ [key]: value }); refresh(); };
  let pointer = null, spinGesture = false;
  dial.addEventListener('pointerdown', event => {
    if (event.button !== 0 || pointer !== null) return;
    event.preventDefault(); pointer = event.pointerId;
    dispatch('editstart', 'orbitRotation');
    dial.setPointerCapture(pointer); dial.focus({ preventScroll: true });
    set('orbitRotation', orientationAt(event.clientX, event.clientY, dial.getBoundingClientRect()));
  });
  dial.addEventListener('pointermove', event => {
    if (pointer === event.pointerId) set('orbitRotation', orientationAt(event.clientX, event.clientY, dial.getBoundingClientRect()));
  });
  const endDial = event => { if (pointer === event.pointerId) { pointer = null; dispatch('editend', 'orbitRotation', event.type === 'pointercancel'); } };
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) dial.addEventListener(type, endDial);
  dial.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
    event.preventDefault(); dispatch('editstart', 'orbitRotation');
    const direction = ['ArrowUp', 'ArrowRight'].includes(event.key) ? 1 : -1;
    set('orbitRotation', event.key === 'Home' ? 0 : normalizeOrientation(getParams().orbitRotation + direction * (event.shiftKey ? 15 : 1)));
    dispatch('editend', 'orbitRotation');
  });
  angle.addEventListener('change', () => {
    if (!Number.isFinite(angle.valueAsNumber)) { refresh(); return; }
    dispatch('editstart', 'orbitRotation');
    set('orbitRotation', Math.min(180, Math.max(-180, angle.valueAsNumber)));
    angle.value = getParams().orbitRotation;
    dispatch('editend', 'orbitRotation');
  });
  spin.addEventListener('pointerdown', event => { if (event.button !== 0 || spinGesture) return; spinGesture = true; dispatch('editstart', 'orbitSpin'); });
  spin.addEventListener('input', () => {
    if (!spinGesture) dispatch('editstart', 'orbitSpin');
    set('orbitSpin', +spin.value);
    if (!spinGesture) dispatch('editend', 'orbitSpin');
  });
  const endSpin = event => { if (spinGesture) { spinGesture = false; dispatch('editend', 'orbitSpin', event?.type === 'pointercancel'); } };
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture', 'change', 'blur']) spin.addEventListener(type, endSpin);
  // Native range dragging must retain its native capture behavior. The window
  // fallback closes history when a mouse is released outside the range.
  window.addEventListener('pointerup', endSpin);
  window.addEventListener('pointercancel', endSpin);
  stop.addEventListener('click', () => { dispatch('editstart', 'orbitSpin'); set('orbitSpin', 0); dispatch('editend', 'orbitSpin'); });
  function refresh() {
    const params = getParams();
    hand.style.transform = `rotate(${params.orbitRotation}deg)`;
    dial.setAttribute('aria-valuenow', String(params.orbitRotation));
    dial.setAttribute('aria-valuetext', `${params.orbitRotation} degrees offset`);
    if (document.activeElement !== angle) angle.value = params.orbitRotation;
    spin.value = params.orbitSpin;
    const text = params.orbitSpin === 0 ? '0 RPM · stopped' : `${params.orbitSpin > 0 ? '+' : '−'}${Math.abs(params.orbitSpin)} RPM · ${params.orbitSpin > 0 ? 'clockwise' : 'counterclockwise'}`;
    readout.textContent = text; spin.setAttribute('aria-valuetext', text);
    stop.disabled = params.orbitSpin === 0;
  }
  refresh();
  return { refresh, destroy: () => { endSpin(); window.removeEventListener('pointerup', endSpin); window.removeEventListener('pointercancel', endSpin); owner.remove(); } };
}
