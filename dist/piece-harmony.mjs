function followChord(midi, notes) {
  const classes = new Set(notes?.filter(Number.isFinite).map((note) => (Math.round(note) % 12 + 12) % 12));
  if (!classes.size) return midi;
  for (let distance = 0; distance <= 6; distance++) {
    for (const candidate of [Math.round(midi) - distance, Math.round(midi) + distance]) {
      if (candidate >= 12 && candidate <= 120 && classes.has(candidate % 12)) return candidate;
    }
  }
  return midi;
}
export {
  followChord
};
