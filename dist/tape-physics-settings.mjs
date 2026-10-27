// Visual mechanics are separate from the Tape sound presets.
export const TAPE_PHYSICS_DEFAULTS = Object.freeze({
  tapeSurfaceTension: 50,
  tapeStiffness: 80
});

export function tapePhysicsSettings(params = {}) {
  const percent = key => Number.isFinite(params[key])
    ? Math.max(0, Math.min(100, params[key])) : TAPE_PHYSICS_DEFAULTS[key];
  return {
    stiffness: percent('tapeStiffness') / 100,
    // Preserve the original 0.5 tray drag at 50%. Higher values resist sliding.
    drag: .5 * (percent('tapeSurfaceTension') / 50) ** 3
  };
}
