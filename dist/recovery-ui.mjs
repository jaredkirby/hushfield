import { createRecoveryStore, createSessionRecovery } from "./session-recovery.mjs";
function setupRecoveryUI({ snapshot, restore, onError }) {
  const status = document.createElement("button");
  status.type = "button";
  status.id = "sessionStatus";
  status.className = "session-status";
  document.getElementById("appLoadStatus").after(status);
  const dialog = document.createElement("dialog");
  dialog.id = "sessionDialog";
  dialog.innerHTML = '<h2>Keep your session</h2><p id="sessionHelp"></p><p>Recovery drafts stay on this device. Export a project file to keep a separate copy.</p><div class="session-actions"><button id="recoverSession">Recover last session</button><button id="discardSession">Discard recovery draft</button><button id="retryDraft">Save local draft</button><button id="closeSession">Close</button></div>';
  document.body.append(dialog);
  const help = dialog.querySelector("#sessionHelp"), recover = dialog.querySelector("#recoverSession"), discard = dialog.querySelector("#discardSession");
  const labels = { unsaved: "UNSAVED", saving: "SAVING", draft: "LOCAL DRAFT", exported: "EXPORTED", error: "SAVE ERROR", recovered: "RECOVERED", recovering: "RECOVERING", empty: "NO DRAFT", discarding: "DISCARDING" };
  const descriptions = { unsaved: "Your latest changes have not been saved to a local recovery draft yet.", saving: "Saving a recovery draft on this device…", draft: "A recovery draft is stored on this device. Export a project file for a separate copy.", exported: "A project file download was started. Your browser controls where it is saved.", error: "Local recovery could not be saved. Export a project file to protect your session.", recovered: "Your recovery draft is restored. Playback is paused.", recovering: "Restoring your recovery draft…", empty: "No recovery draft is stored.", discarding: "Removing the selected recovery draft…" };
  const controller = createSessionRecovery({
    store: createRecoveryStore(),
    snapshot,
    restore,
    onError,
    onState({ status: value, available, dirty }) {
      status.textContent = (available ? "RECOVER" : labels[value]) + (dirty ? "*" : "");
      status.setAttribute("aria-label", (available ? "Recover previous session" : `Session: ${labels[value].toLowerCase()}`) + (dirty ? "; changes since last project export" : ""));
      status.title = descriptions[value];
      status.dataset.dirty = String(dirty);
      help.textContent = available ? "A previous recovery draft is available. Recovering replaces the current session; discard removes the stored draft." : descriptions[value];
      recover.hidden = !available;
      discard.hidden = !available && value === "empty";
      recover.disabled = value === "recovering" || value === "discarding";
      discard.disabled = value === "recovering" || value === "discarding";
    }
  });
  status.textContent = "UNSAVED";
  status.onclick = () => dialog.showModal();
  recover.onclick = async () => {
    recover.disabled = true;
    if (await controller.recover()) dialog.close();
    recover.disabled = false;
  };
  discard.onclick = async () => {
    discard.disabled = true;
    await controller.discard();
    discard.disabled = false;
  };
  dialog.querySelector("#retryDraft").onclick = () => controller.flush();
  dialog.querySelector("#closeSession").onclick = () => dialog.close();
  return controller;
}
export {
  setupRecoveryUI
};
