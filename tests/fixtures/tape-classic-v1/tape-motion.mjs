function tapeWow(seconds, amount) {
  return (Math.sin(seconds * 2 * Math.PI * 0.47) + 0.28 * Math.sin(seconds * 2 * Math.PI * 0.79)) * 5e-3 * amount;
}
function tapeFlutter(seconds, amount) {
  return (Math.sin(seconds * 2 * Math.PI * 6.7) + 0.35 * Math.sin(seconds * 2 * Math.PI * 11.3)) * 35e-5 * amount;
}
export {
  tapeFlutter,
  tapeWow
};
