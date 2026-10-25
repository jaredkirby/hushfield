import { attachStepper } from "./phone-ui.mjs";
function setupPieceBlend({ getPiece, getSolo, onChange, onSolo }) {
  const row = document.createElement("div");
  row.className = "piece-blend";
  row.setAttribute("role", "group");
  row.setAttribute("aria-label", "Piece blend");
  const records = [];
  for (const kind of ["foundation", "texture", "motion"]) {
    const cell = document.createElement("div");
    cell.className = "blend-part control";
    const label = document.createElement("label");
    label.textContent = kind[0].toUpperCase() + kind.slice(1);
    const input = document.createElement("input");
    input.type = "range";
    input.id = "blend-" + kind;
    input.min = 0;
    input.max = 100;
    input.step = 5;
    input.hidden = true;
    label.htmlFor = input.id;
    const listen = document.createElement("button");
    listen.type = "button";
    listen.id = "solo-" + kind;
    listen.className = "part-solo";
    listen.textContent = "Solo";
    listen.setAttribute("aria-label", "Hear only " + kind);
    listen.addEventListener("click", (event) => {
      event.stopPropagation();
      onSolo(kind);
      refresh();
    });
    cell.append(label, input);
    const stepper = attachStepper(cell, input, { label: kind + " blend", step: 5, format: (value) => value + "%" });
    cell.append(listen);
    row.append(cell);
    records.push({ kind, input, stepper, listen });
    input.addEventListener("input", () => {
      getPiece()[kind] = +input.value;
      onChange();
      refresh();
    });
  }
  document.getElementById("displayStage").append(row);
  function refresh() {
    for (const { kind, input, stepper, listen } of records) {
      input.value = getPiece()[kind];
      stepper.render();
      listen.setAttribute("aria-pressed", String(getSolo() === kind));
      listen.textContent = getSolo() === kind ? "Full mix" : "Solo";
      listen.setAttribute("aria-label", getSolo() === kind ? "Return to full mix" : "Hear only " + kind);
    }
  }
  refresh();
  return { refresh };
}
export {
  setupPieceBlend
};
