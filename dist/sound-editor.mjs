import { SOUND_FIELDS, SOUND_GROUPS, patchFor, formatSoundValue } from "./sound-patches.mjs?v=hushfield-1";
import { attachStepper, panelNav, ensureVisibleSelection } from "./phone-ui.mjs?v=hushfield-1";
import { mixedSoundFields } from './sound-editor-model.mjs?v=hushfield-1';
import { createSoundEnvelope } from './sound-envelope.mjs?v=hushfield-1';
function setupSoundEditors({ getState, getCount, getHarmonyLinked = () => false, onChange, onReset, onPreview, onSelect = () => {} }) {
  const editors = {};
  for (const bank of ["triggers", "balls"]) {
    let refresh = function() {
      const count = getCount(bank), previous = target.value;
      if (target.options.length !== count + 1) {
        target.replaceChildren();
        const all = document.createElement("option");
        all.value = "all";
        all.textContent = "All " + bank;
        target.append(all);
        for (let i = 0; i < count; i++) {
          const option = document.createElement("option");
          option.value = i;
          option.textContent = singular + " " + (i + 1);
          target.append(option);
        }
        target.value = previous === "all" || previous !== "" && +previous < count ? previous : "all";
      }
      const p = patchFor(getState(), bank, current() === 'all' ? 0 : current());
      const mixed = current() === 'all' ? mixedSoundFields(getState(), bank, count) : new Set();
      scope.textContent = current() === 'all' ? `Editing all ${count} ${bank} · each change sets only that field` : `Editing ${context().toLowerCase()} only`;
      preview.textContent = current() === 'all' ? '▶ Listen first' : '▶ Listen';
      preview.setAttribute('aria-label', `Listen to ${current() === 'all' ? singular.toLowerCase() + ' 1' : context().toLowerCase()}`);
      for (const { f, input, controller, row } of fields) {
        row.hidden = f.group !== owner.dataset.soundGroup || getHarmonyLinked() && ["key", "scale"].includes(f.id);
        row.dataset.mixed = String(mixed.has(f.id));
        input.value = f.choices ? f.choices.indexOf(p[f.id]) : p[f.id];
        controller.render();
      }
      bankEffects.hidden = owner.dataset.soundGroup !== 'space';
      envelope.element.hidden = owner.dataset.soundGroup !== 'envelope';
      envelope.refresh(mixed);
      note.hidden = owner.dataset.soundGroup !== "space" && !(owner.dataset.soundGroup === "voice" && getHarmonyLinked());
      note.textContent = owner.dataset.soundGroup === "voice" ? "Harmony follows Foundation. Unlink in Orbit for independent tuning." : "Delay, feedback and room apply to this bank.";
      mute.textContent = mixed.has('enabled') ? 'Mute all' : p.enabled ? "Mute" : "Unmute";
      mute.setAttribute("aria-label", (mixed.has('enabled') || p.enabled ? "Mute " : "Unmute ") + context().toLowerCase());
      mute.setAttribute("aria-pressed", mixed.has('enabled') ? 'mixed' : String(!p.enabled));
    };
    const singular = bank === "triggers" ? "Trigger" : "Ball", name = bank === "triggers" ? "Triggers" : "Balls";
    const owner = document.createElement("section");
    owner.className = "sound-editor";
    owner.dataset.panel = bank;
    owner.id = bank + "Editor";
    const targetRow = document.createElement("div");
    targetRow.className = "sound-target-row";
    const target = document.createElement("select");
    target.id = bank + "Target";
    target.setAttribute("aria-label", singular + " sound target");
    const preview = document.createElement("button"), mute = document.createElement("button"), reset = document.createElement("button");
    for (const b of [preview, mute, reset]) b.type = "button";
    preview.textContent = "\u25B6 Listen";
    preview.setAttribute("aria-label", "Preview " + bank + " sound");
    mute.id = bank + "Mute";
    reset.textContent = "Reset";
    reset.setAttribute("aria-label", "Reset selected " + bank + " sound");
    targetRow.append(target, preview, mute, reset);
    owner.append(targetRow);
    const scope = document.createElement('p');
    scope.className = 'sound-scope';
    owner.append(scope);
    const controls = document.createElement("div");
    controls.className = "sound-fields";
    const fields = [];
    const current = () => target.value === "all" ? "all" : Number(target.value);
    const context = () => target.value === "all" ? "All " + bank : singular + " " + (Number(target.value) + 1);
    const envelope = createSoundEnvelope({ bank, getPatch: () => patchFor(getState(), bank, current() === 'all' ? 0 : current()), getContext: context, onChange: (field, value) => { onChange(bank, current(), field, value); refresh(); } });
    owner.append(envelope.element);
    const bankEffects = document.createElement('section');
    bankEffects.className = 'sound-bank-effects';
    const bankHeading = document.createElement('p');
    bankHeading.className = 'sound-bank-heading';
    bankHeading.textContent = `Shared by every ${singular.toLowerCase()} · bank effects`;
    const bankFields = document.createElement('div');
    bankFields.className = 'sound-fields';
    bankEffects.append(bankHeading, bankFields);
    for (const f of SOUND_FIELDS) {
      const row = document.createElement("div");
      row.className = "control";
      row.dataset.soundGroup = f.group;
      const top = document.createElement("div");
      top.className = "control-top";
      const label = document.createElement("label");
      label.textContent = f.label;
      const input = document.createElement("input");
      input.type = "range";
      input.id = bank + "-" + f.id;
      label.htmlFor = input.id;
      input.min = f.choices ? 0 : f.min;
      input.max = f.choices ? f.choices.length - 1 : f.max;
      input.step = "any";
      top.append(label);
      row.append(top, input);
      (f.bankOnly ? bankFields : controls).append(row);
      const value = () => f.choices ? f.choices[+input.value] : +input.value;
      const controller = attachStepper(row, input, { label: () => `${f.bankOnly ? "All " + bank : context()} \xB7 ${f.label}`, step: f.choices ? 1 : f.step, choices: f.choices, format: (v) => formatSoundValue(f, f.choices ? f.choices[v] : v) });
      input.addEventListener("input", () => {
        onChange(bank, current(), f.id, value());
        refresh();
      });
      fields.push({ f, input, controller, row });
    }
    owner.append(controls);
    owner.append(bankEffects);
    const note = document.createElement("p");
    note.className = "sound-editor-note";
    note.textContent = "Delay, feedback and room apply to this bank.";
    owner.append(note);
    panelNav(owner, SOUND_GROUPS, (key) => {
      envelope.finish();
      owner.dataset.soundGroup = key;
      refresh();
    }, { className: "sound-group-tabs", ariaLabel: name + " sound sections" });
    owner.prepend(targetRow);
    target.addEventListener("change", () => {
      envelope.finish();
      refresh();
      onSelect(bank, current());
      ensureVisibleSelection();
    });
    preview.addEventListener("click", () => onPreview(bank, current()));
    mute.addEventListener("click", () => {
      envelope.finish();
      const p = patchFor(getState(), bank, current() === 'all' ? 0 : current());
      const mixed = current() === 'all' && mixedSoundFields(getState(), bank, getCount(bank)).has('enabled');
      editEvent('editstart', 'enabled');
      onChange(bank, current(), "enabled", mixed ? false : !p.enabled);
      refresh();
      editEvent('editend', 'enabled');
    });
    reset.addEventListener("click", () => {
      envelope.finish();
      editEvent('editstart', 'reset');
      onReset(bank, current());
      refresh();
      editEvent('editend', 'reset');
    });
    function editEvent(type, field) { owner.dispatchEvent(new CustomEvent('hushfield:' + type, { bubbles: true, detail: { id: bank + '-' + field, label: context() + ' · ' + field, source: 'sound' } })); }
    document.querySelector(".orbit-settings").append(owner);
    editors[bank] = { refresh, target, current, finish: envelope.finish };
    refresh();
  }
  return { refresh: () => Object.values(editors).forEach((e) => e.refresh()), select: (bank, index) => {
    editors[bank].finish();
    editors[bank].target.value = String(index);
    editors[bank].refresh();
    onSelect(bank, editors[bank].current());
    ensureVisibleSelection();
  }, getSelection: bank => editors[bank].current() };
}
export {
  setupSoundEditors
};
