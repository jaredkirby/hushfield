import {attachStepper, ensureVisibleSelection} from './phone-ui.mjs';

export function setupTextureAdjustments({getSmoothing, setSmoothing, invalidate}) {
  const page = document.getElementById('grainPage');
  const group = document.createElement('div'); group.className = 'control-group texture-display-group';
  group.innerHTML = '<div class="group-title"><h3>Display</h3><span>VISUAL ONLY</span></div><div class="texture-display-fields"><div class="control"><div class="control-top"><label for="textureWaveSmoothing">Wave smoothing</label></div><input id="textureWaveSmoothing" type="range" min="0" max="100" step="1" aria-label="Texture wave smoothing"></div><p class="texture-display-help">Round the wave from detailed to flowing. Changes the picture only.</p></div>';
  page.querySelector('.control-grid').prepend(group);
  const input = group.querySelector('input'), row = group.querySelector('.control'); input.value = getSmoothing();
  const control = attachStepper(row, input, {label:'Texture wave smoothing',step:5,format:v=>v === 0 ? 'Raw' : Math.round(v)+'%'});
  input.addEventListener('input', () => {setSmoothing(+input.value); invalidate();});

  const toggle = document.createElement('button');
  toggle.id = 'textureAdjustmentsToggle'; toggle.type = 'button'; toggle.setAttribute('aria-controls','grainPage');
  document.querySelector('.piece-tools').append(toggle);
  let open = false;
  function setOpen(value, restoreFocus = false) {
    open = value;
    document.body.dataset.textureAdjustments = open ? 'open' : 'closed';
    page.inert = !open;
    page.setAttribute('aria-hidden',String(!open));
    toggle.setAttribute('aria-expanded',String(open));
    toggle.setAttribute('aria-label',open?'Hide Texture adjustments':'Show Texture adjustments');
    toggle.textContent = open ? 'Hide adjust ▴' : 'Adjust ▾';
    if (restoreFocus) toggle.focus({preventScroll:true});
    ensureVisibleSelection(); invalidate();
  }
  toggle.addEventListener('click', () => setOpen(!open));
  page.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !open || document.querySelector('dialog[open]')) return;
    event.preventDefault(); setOpen(false,true);
  });
  setOpen(true);
  return {refresh(){input.value=getSmoothing();control.render();},setOpen};
}
