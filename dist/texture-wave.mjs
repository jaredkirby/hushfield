// Display-only filtering: source samples and audio parameters are never changed.
export function prepareTextureWave(samples, smoothing = 65, width = 640) {
  const count = Math.min(160, samples.length), points = new Float32Array(count);
  const amount = Math.max(0, Math.min(100, Number(smoothing) || 0)) / 100;
  const output = new Float32Array(Math.max(2, Math.min(1024, Math.ceil(width) || 2)));
  if (!count) return output;
  for (let i = 0; i < count; i++) {
    const at = count > 1 ? i / (count - 1) * (samples.length - 1) : 0;
    const index = Math.floor(at), next = Math.min(samples.length - 1, index + 1);
    points[i] = (samples[index] || 0) + ((samples[next] || 0) - (samples[index] || 0)) * (at - index);
  }
  const filtered = new Float32Array(points);
  if (amount > 0) {
    const sigma = .3 + amount * 3.2, radius = Math.ceil(sigma * 3);
    const weights = Array.from({length:radius * 2 + 1}, (_, i) => Math.exp(-.5 * ((i - radius) / sigma) ** 2));
    for (let i = 0; i < count; i++) {
      let total = 0, weight = 0;
      for (let j = -radius; j <= radius; j++) {
        if (i + j < 0 || i + j >= count) continue;
        const w = weights[j + radius]; total += points[i + j] * w; weight += w;
      }
      filtered[i] = total / weight;
    }
  }
  for (let i = 0; i < output.length; i++) {
    const at = i / (output.length - 1) * (count - 1), index = Math.floor(at), t = at - index;
    const a = filtered[Math.max(0, index - 1)], b = filtered[index];
    const c = filtered[Math.min(count - 1, index + 1)], d = filtered[Math.min(count - 1, index + 2)];
    const value = .5 * ((2 * b) + (-a + c) * t + (2*a - 5*b + 4*c - d)*t*t + (-a + 3*b - 3*c + d)*t*t*t);
    output[i] = Math.max(Math.min(b, c), Math.min(Math.max(b, c), value));
  }
  return output;
}
