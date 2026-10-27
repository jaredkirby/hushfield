// Independent seeded coordinates allow natural clusters and gaps without
// reshuffling the sky on each frame or when the star count changes.
function starRandom(index) {
  let value = Math.imul(index ^ 0x53544152, 0x45d9f3b);
  value = Math.imul(value ^ value >>> 16, 0x45d9f3b);
  return ((value ^ value >>> 16) >>> 0) / 4294967296;
}
export function drawFoundationStars({c,w,h}, visual, seconds, reducedMotion = false) {
  if (w <= 0 || h <= 0) return;
  const top = 0, bottom = Math.max(1, h * (.52 - visual.foundationHeight / 200) - 24);
  const twinkle = reducedMotion ? 0 : visual.foundationTwinkle / 100;
  for (let i = 0; i < visual.foundationStars; i++) {
    const x = Math.floor(Math.min(12,w/4) + starRandom(i * 2) * Math.max(1,w - 24));
    const y = Math.floor(top + starRandom(i * 2 + 1) * (bottom - top));
    const shimmer = .7 * Math.sin(seconds * (.55 + i % 7 * .07) + i * 2.39996)
      + .3 * Math.sin(seconds * (1.1 + i % 5 * .06) + i * 1.618);
    const brightness = Math.round(190 + 65 * twinkle * shimmer);
    c.fillStyle = `rgb(${brightness},${brightness},${brightness})`;
    c.fillRect(x,y,1,1);
  }
}
