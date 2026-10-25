import { followChord } from "./piece-harmony.mjs";
import { makeOrbitState, stepOrbit, containBalls } from "./orbit-physics.mjs";
import { crossedPads } from "./orbit-pads.mjs";
import { createSoundState, restoreSoundState, patchFor, soundMidi } from "./sound-patches.mjs";
const TAU = Math.PI * 2;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
function blep(phase, delta) {
  if (phase < delta) {
    const t = phase / delta;
    return t + t - t * t - 1;
  }
  if (phase > 1 - delta) {
    const t = (phase - 1) / delta;
    return t * t + t + t + 1;
  }
  return 0;
}
function waveform(voice, delta) {
  const phase = voice.phase;
  switch (voice.patch.wave) {
    case "square":
      return (phase < 0.5 ? 1 : -1) + blep(phase, delta) - blep((phase + 0.5) % 1, delta);
    case "sawtooth":
      return 2 * phase - 1 - blep(phase, delta);
    case "triangle":
      return 1 - 4 * Math.abs(phase - 0.5);
    case "noise":
      voice.noise = Math.imul(voice.noise, 1664525) + 1013904223 >>> 0;
      return voice.noise / 2147483648 - 1;
    default:
      return Math.sin(phase * TAU);
  }
}
function envelope(voice) {
  const p = voice.patch, t = voice.age;
  if (voice.releaseAt !== void 0) return voice.releaseLevel * Math.max(0, 1 - (t - voice.releaseAt) / 0.02);
  if (t < p.attack) return voice.peak * t / p.attack;
  if (t < p.attack + p.decay) return voice.peak * (1 - (1 - p.sustain / 100) * (t - p.attack) / p.decay);
  const held = p.attack + p.decay + p.gate, sustain = Math.max(1e-5, voice.peak * p.sustain / 100);
  if (t < held) return sustain;
  return sustain * Math.exp(Math.log(1e-5 / sustain) * (t - held) / p.release);
}
function filterCoefficients(cutoff, q, rate) {
  const w = TAU * Math.min(cutoff, rate * 0.46) / rate, cos = Math.cos(w), alpha = Math.sin(w) / (2 * q), a0 = 1 + alpha;
  return { b0: (1 - cos) / 2 / a0, b1: (1 - cos) / a0, b2: (1 - cos) / 2 / a0, a1: -2 * cos / a0, a2: (1 - alpha) / a0 };
}
class OrbitEngine {
  constructor(rate) {
    this.rate = rate;
    this.frames = 0;
    this.tick = 0;
    this.state = makeOrbitState();
    this.options = { rpm: 12, points: 0, balls: 5, triggers: 8, gravity: 35, bounce: 84, orientation: 0 };
    this.patches = createSoundState();
    this.voices = [];
    this.harmony = [];
    this.followHarmony = false;
    this.simulate = false;
    this.audible = false;
    this.triggerCount = 0;
    this.hits = [];
    this.seed = 893;
    this.configure(this.options);
  }
  random() {
    this.seed = Math.imul(this.seed, 1664525) + 1013904223 >>> 0;
    return this.seed / 4294967296;
  }
  ball(index) {
    return { x: (this.random() - 0.5) * 0.5, y: (this.random() - 0.5) * 0.5, vx: (this.random() - 0.5) * 1.2, vy: (this.random() - 0.5) * 1.2, hue: index, lastImpact: -Infinity, flash: 0 };
  }
  configure(options) {
    this.options = { ...this.options, ...options };
    const count = clamp(Math.round(this.options.balls), 0, 12);
    while (this.state.balls.length < count) this.state.balls.push(this.ball(this.state.balls.length));
    this.state.balls.length = count;
    containBalls(this.state, this.options);
  }
  scatter(balls) {
    this.state.balls = balls ? balls.map((ball) => ({ ...ball, lastImpact: -Infinity })) : Array.from({ length: this.options.balls }, (_, i) => this.ball(i));
    this.state.collisions = 0;
    containBalls(this.state, this.options);
  }
  nudge() {
    for (const ball of this.state.balls) {
      ball.vx += (this.random() - 0.5) * 1.5;
      ball.vy -= 1;
    }
  }
  setHarmony(notes) {
    this.harmony = Array.isArray(notes) ? notes.filter(Number.isFinite) : [];
  }
  setPatches(patches) {
    this.patches = restoreSoundState(patches);
  }
  play({ simulate, audible }) {
    this.simulate = simulate;
    this.audible = audible;
    if (!audible) this.stop();
  }
  stop(bank, index) {
    for (const voice of this.voices) if ((!bank || voice.bank === bank) && (index === void 0 || voice.index === index) && voice.releaseAt === void 0) {
      voice.releaseLevel = envelope(voice);
      voice.releaseAt = voice.age;
    }
  }
  note(bank, index, midi, audition = false, resolvedPatch) {
    const patch = resolvedPatch ? patchFor(restoreSoundState({ [bank]: { base: resolvedPatch } }), bank) : patchFor(this.patches, bank, index);
    if (!patch.enabled || patch.level <= 0 || !audition && !this.audible) return false;
    const active = this.voices.filter((voice) => voice.bank === bank && voice.releaseAt === void 0);
    if (active.length >= 24) {
      const oldest = active[0];
      oldest.releaseLevel = envelope(oldest);
      oldest.releaseAt = oldest.age;
    }
    if (this.voices.length >= 96) this.voices.shift();
    if (this.followHarmony) midi = followChord(midi, this.harmony);
    const frequency = 440 * 2 ** ((midi - 69) / 12);
    this.voices.push({
      bank,
      index,
      patch,
      frequency,
      phase: 0,
      modPhase: 0,
      age: 0,
      peak: patch.level / 100 * 0.18,
      duration: patch.attack + patch.decay + patch.gate + patch.release,
      noise: (index + 1) * 893,
      coefficients: filterCoefficients(patch.cutoff, patch.resonance, this.rate),
      z1: 0,
      z2: 0,
      left: Math.sqrt((1 - patch.pan / 100) / 2),
      right: Math.sqrt((1 + patch.pan / 100) / 2),
      output: (audition ? 6 : 0) + (bank === "balls" ? 3 : 0)
    });
    return true;
  }
  audition(bank, index, midi, resolvedPatch) {
    return this.note(bank, index, midi, true, resolvedPatch);
  }
  step() {
    if (!this.simulate) return;
    const orientation = this.options.orientation * Math.PI / 180, previous = this.state.phase + orientation;
    stepOrbit(this.state, this.options, 1 / 240, (edge, ball) => {
      if (!this.audible) return;
      const patch = patchFor(this.patches, "balls", ball.hue);
      const length = { minor: 7, major: 7, pentatonic: 5, chromatic: 12 }[patch.scale] || 12;
      const midi = Math.min(120, soundMidi(patch, (edge + ball.hue) % length) + (ball.hue % 3 === 0 ? 12 : 0));
      this.note("balls", ball.hue, midi);
    });
    for (const index of crossedPads(previous, this.state.phase + orientation, this.options.triggers)) {
      this.triggerCount++;
      if (this.audible) {
        const patch = patchFor(this.patches, "triggers", index);
        if (this.note("triggers", index, soundMidi(patch, index))) this.hits.push({ index, time: this.frames / this.rate });
      }
    }
    if (this.hits.length > 48) this.hits.splice(0, this.hits.length - 48);
  }
  status() {
    return {
      phase: this.state.phase,
      elapsed: this.state.elapsed,
      collisions: this.state.collisions,
      balls: this.state.balls.map((ball) => ({ ...ball })),
      triggerCount: this.triggerCount,
      voices: this.voices.filter((voice) => voice.releaseAt === void 0).length,
      time: this.frames / this.rate
    };
  }
  process(outputs) {
    for (const output of outputs) for (const channel of output) channel.fill(0);
    const count = outputs[0][0].length;
    for (let i = 0; i < count; i++) {
      this.frames++;
      this.tick += 240;
      if (this.tick >= this.rate) {
        this.tick -= this.rate;
        this.step();
      }
      for (let v = this.voices.length - 1; v >= 0; v--) {
        const voice = this.voices[v], patch = voice.patch;
        if (voice.age >= voice.duration || voice.releaseAt !== void 0 && voice.age - voice.releaseAt >= 0.02) {
          this.voices.splice(v, 1);
          continue;
        }
        const depth = voice.frequency * patch.fmAmount / 100;
        const fm = depth ? depth * Math.exp(Math.log(0.01 / depth) * Math.min(1, voice.age / voice.duration)) * Math.sin(voice.modPhase * TAU) : 0;
        const delta = clamp((voice.frequency + fm) / this.rate, 1e-6, 0.46);
        let sample = waveform(voice, delta);
        voice.phase = (voice.phase + delta) % 1;
        voice.modPhase = (voice.modPhase + Math.min(0.46, voice.frequency * patch.fmRatio / this.rate)) % 1;
        const c = voice.coefficients, filtered = c.b0 * sample + voice.z1;
        voice.z1 = c.b1 * sample - c.a1 * filtered + voice.z2;
        voice.z2 = c.b2 * sample - c.a2 * filtered;
        sample = filtered;
        if (patch.drive) {
          const drive = 1 + patch.drive / 100 * 6;
          sample = Math.tanh(sample * drive) / Math.tanh(drive);
        }
        sample *= envelope(voice);
        voice.age += 1 / this.rate;
        for (let bus = 0; bus < 3; bus++) {
          const output = outputs[voice.output + bus];
          output[0][i] += sample * voice.left * (bus === 0 ? 1 : bus === 1 ? patch.delaySend / 100 : patch.reverbSend / 100);
          output[1][i] += sample * voice.right * (bus === 0 ? 1 : bus === 1 ? patch.delaySend / 100 : patch.reverbSend / 100);
        }
      }
    }
  }
}
export {
  OrbitEngine
};
