import { VINTAGE_REVERB_FIELDS, REVERB_MODELS } from './space-settings.mjs';
import { attachStepper, panelNav } from './phone-ui.mjs';

export const REVERB_LABELS = { original: 'Original room', plate: 'Plate', spring: 'Spring', chamber: 'Chamber' };
const help = {
  original: 'The original Hushfield room. Its fixed response preserves existing Pieces. Choose a vintage model to use Decay, Pre-delay, Tone and Reverb width.',
  plate: 'A dense, diffused tail inspired by a vibrating metal plate. Decay extends the tail; Tone softens its upper edge.',
  spring: 'Dispersive echoes inspired by a spring tank. This reverb is independent of the spring inside Tape’s Space Echo.',
  chamber: 'Early wall reflections lead into a diffuse room tail. Pre-delay leaves space around the source.'
};

export function setupSpaceControls({ getParams, makeControl, onModel, invalidate }) {
  const page = document.getElementById('fxPage'), grid = page.querySelector('.control-grid');
  const fields = document.getElementById('spaceControls'), reverb = fields.closest('.control-group');
  const filter = document.getElementById('filterControls').closest('.control-group');
  const depth = document.getElementById('depthControls').closest('.control-group');
  reverb.querySelector('h3').textContent = 'Reverb';
  reverb.querySelector('.group-title span').textContent = 'VINTAGE SPACE';
  filter.querySelector('.group-title span').textContent = 'WHOLE PIECE';
  page.querySelector('.section-heading h3').textContent = 'A space around the sound.';
  page.querySelector('.section-heading p').textContent = 'Choose a reverb character, then place Foundation, Texture and Motion within it.';
  document.getElementById('filterControls').append(document.getElementById('width').closest('.control'));
  grid.prepend(reverb); grid.append(depth, filter);
  const row = document.createElement('div'), label = document.createElement('label'), menu = document.createElement('select');
  row.className = 'control'; label.htmlFor = 'reverbModel'; label.textContent = 'Reverb model'; menu.id = label.htmlFor;
  for (const model of REVERB_MODELS) { const option = document.createElement('option'); option.value = model; option.textContent = REVERB_LABELS[model]; menu.append(option); }
  row.append(label, menu); fields.prepend(row);
  const stepper = attachStepper(row, menu, { label: 'Reverb model', format: () => REVERB_LABELS[menu.value] });
  const descriptions = document.createElement('p'); descriptions.className = 'space-model-help'; descriptions.id = 'spaceModelHelp'; reverb.append(descriptions);
  stepper.inputElement.setAttribute('aria-describedby', descriptions.id);
  menu.addEventListener('change', () => onModel(menu.value));
  for (const field of VINTAGE_REVERB_FIELDS) makeControl('spaceControls', field.id,
    field.id === 'reverbPredelay' ? 'Pre-delay' : field.id === 'reverbWidth' ? 'Reverb width' : field.label,
    field.min, field.max, field.step, field.unit);
  const groups = { reverb, depth, filter };
  const nav = panelNav(page, [['reverb','Reverb'],['depth','Depth'],['filter','Filter']], key => {
    for (const [id, group] of Object.entries(groups)) group.classList.toggle('phone-selected', id === key);
    document.body.dataset.spacePanel = key;
    invalidate();
  }, { ariaLabel: 'Space controls' });
  function refresh() {
    const params = getParams(), model = REVERB_MODELS.includes(params.reverbModel) ? params.reverbModel : 'original';
    menu.value = model; stepper.render(); descriptions.textContent = help[model];
    for (const field of VINTAGE_REVERB_FIELDS) document.getElementById(field.id).disabled = model === 'original';
    document.getElementById('spaceModelName').textContent = REVERB_LABELS[model].toUpperCase();
    document.getElementById('spaceModelReadout').textContent = model === 'original' ? `AMOUNT ${params.reverb}% · ORIGINAL RESPONSE` : `${params.reverbDecay.toFixed(1)} s · ${params.reverbPredelay} ms · AMOUNT ${params.reverb}%`;
  }
  refresh(); return { refresh, nav };
}
