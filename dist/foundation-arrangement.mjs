// Developing arrangement for Foundation (arrangementVersion 2).
// Replaces the fixed eight-chord loop and endlessly repeated motif with:
// - a seeded motif that is varied from cycle to cycle,
// - a melody that voice-leads across chord changes and lands on chord tones,
// - sections (statement, develop, sparse, rest) spanning several minutes,
// - a weighted chord progression that does not repeat on a fixed period.
// Everything is driven by its own seeded generator, so a seed always renders
// the same music and the original arrangement's random stream is untouched.
import { AMBIENT_INTERVALS, scaleMidi } from './ambient-settings.mjs?v=hushfield-1';

const DIATONIC = [
  { 5: 3, 3: 3, 2: 2, 4: 1, 1: 1 },
  { 4: 3, 6: 1, 2: 1 },
  { 5: 2, 3: 3, 0: 1 },
  { 0: 3, 4: 2, 1: 2, 6: 1 },
  { 0: 4, 5: 2, 2: 1 },
  { 3: 3, 1: 2, 2: 1, 0: 1 },
  { 0: 2, 2: 3, 4: 1 },
];
const PENTATONIC = [
  { 3: 3, 2: 2, 1: 1, 4: 2 },
  { 4: 2, 0: 2, 3: 1 },
  { 0: 2, 3: 3, 1: 1 },
  { 0: 3, 4: 2, 1: 1 },
  { 0: 3, 2: 2 },
];
const STEPS = [[-1, 4], [1, 4], [-2, 1], [2, 1], [0, 1], [3, .4], [-3, .4]];
const RHYTHMS = [1, 1, 1, 1.5, .75, 2];
const LOW = 55, HIGH = 84;

function seeded(seed) {
  let state = (Math.imul((seed >>> 0) ^ 0x5bd1e995, 0x27d4eb2d) >>> 0) || 1;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
}
function pick(random, entries) {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let at = random() * total;
  for (const [value, weight] of entries) if ((at -= weight) < 0) return value;
  return entries[entries.length - 1][0];
}
const scaleLength = settings => (AMBIENT_INTERVALS[settings.scale] || AMBIENT_INTERVALS[0]).length;

export function createMotif(random) {
  const steps = [];
  const restCount = random() < .5 ? 1 : 2;
  const rests = new Set();
  while (rests.size < restCount) rests.add(2 + Math.floor(random() * 5));
  let contour = 0;
  for (let step = 0; step < 8; step++) {
    if (rests.has(step)) { steps.push({ rest: true, contour: null, length: 2 }); continue; }
    if (step > 0) contour = Math.max(-5, Math.min(5, contour + pick(random, STEPS)));
    steps.push({ rest: false, contour, length: RHYTHMS[Math.floor(random() * RHYTHMS.length)] });
  }
  const last = steps.findLastIndex(step => !step.rest);
  steps[last].length = Math.max(1.5, steps[last].length);
  return steps;
}

// Each variation returns new steps; the motif itself is never edited here.
const VARIATIONS = {
  original: motif => motif.map(step => ({ ...step })),
  ending: (motif, random) => {
    const steps = motif.map(step => ({ ...step })), last = steps.findLastIndex(step => !step.rest);
    steps[last].contour += random() < .5 ? -1 : 1;
    return steps;
  },
  // Sequences move by a third so the phrase still starts on a chord tone.
  sequenceUp: motif => motif.map(step => step.rest ? { ...step } : { ...step, contour: step.contour + 2, shift: 2 }),
  sequenceDown: motif => motif.map(step => step.rest ? { ...step } : { ...step, contour: step.contour - 2, shift: -2 }),
  invert: motif => motif.map(step => step.rest ? { ...step } : { ...step, contour: -step.contour }),
  retrograde: motif => {
    const notes = motif.filter(step => !step.rest).map(step => step.contour).reverse();
    let index = 0;
    return motif.map(step => step.rest ? { ...step } : { ...step, contour: notes[index++] - notes[0] });
  },
  augment: motif => motif.slice(0, 5).map(step => ({ ...step, length: step.length * 1.5 })),
  thin: motif => motif.map((step, index) => step.rest || index === 0 || step.length >= 1.5 ? { ...step, length: step.length * 1.25 } : { rest: true, contour: null, length: step.length * 1.25 }),
  silence: () => Array.from({ length: 4 }, () => ({ rest: true, contour: null, length: 2 })),
};

const NEXT_SECTION = {
  statement: evolution => [['develop', .35 + .4 * evolution], ['sparse', .65 - .4 * evolution]],
  develop: () => [['sparse', .45], ['rest', .35], ['statement', .2]],
  sparse: () => [['rest', .5], ['statement', .5]],
  rest: () => [['statement', .75], ['sparse', .25]],
};
const SECTION_CYCLES = { statement: [2, 2], develop: [2, 3], sparse: [1, 2], rest: [1, 1] };

export class FoundationArrangement {
  constructor(seed) {
    this.random = seeded(seed);
    this.motif = createMotif(this.random);
    this.section = 'statement';
    this.sectionIndex = 0;
    this.sectionCycles = 2;
    this.cycleInSection = 0;
    this.cycle = 0;
    this.step = 0;
    this.steps = VARIATIONS.original(this.motif);
    this.variation = 'original';
    this.lastMidi = null;
    this.anchor = null;
    this.previousRoot = null;
    this.register = 0;
  }

  // Next chord root (scale degree) after the current one.
  nextRoot(settings, current) {
    const table = scaleLength(settings) === 5 ? PENTATONIC : DIATONIC;
    const from = table[((current % table.length) + table.length) % table.length];
    const sharpness = 2 - 1.5 * settings.evolution / 100;
    const entries = Object.entries(from).map(([root, weight]) => [Number(root), weight ** sharpness * (Number(root) === this.previousRoot ? .4 : 1)]);
    this.previousRoot = current;
    return pick(this.random, entries);
  }

  advanceCycle(settings) {
    this.cycle++;
    this.cycleInSection++;
    const evolution = settings.evolution / 100;
    if (this.cycleInSection >= this.sectionCycles) {
      const returning = this.section === 'rest';
      this.section = pick(this.random, NEXT_SECTION[this.section](evolution));
      const [low, high] = SECTION_CYCLES[this.section];
      this.sectionCycles = low + Math.floor(this.random() * (high - low + 1));
      this.cycleInSection = 0;
      this.sectionIndex++;
      this.register = pick(this.random, [[0, 3], [3, 1], [-3, 1]]);
      // After silence the motif can slowly drift, so an hour is not one fixed tune.
      if (returning && this.random() < evolution * .5) {
        const notes = this.motif.map((step, index) => [step, index]).filter(([step, index]) => !step.rest && index > 0);
        if (notes.length) notes[Math.floor(this.random() * notes.length)][0].contour += this.random() < .5 ? -1 : 1;
      }
      this.anchor = null;
    }
    this.variation = this.chooseVariation(evolution);
    this.steps = VARIATIONS[this.variation](this.motif, this.random);
    this.step = 0;
  }

  chooseVariation(evolution) {
    if (this.section === 'rest') return 'silence';
    if (this.section === 'sparse') return 'thin';
    if (this.section === 'statement') return this.cycleInSection === 0 ? 'original' : 'ending';
    return pick(this.random, [['sequenceUp', 1], ['sequenceDown', 1], ['invert', .6 + evolution], ['retrograde', .4 + evolution], ['augment', .8], ['ending', 1.2 - evolution]]);
  }

  // Nearest tone of the chord on `root` to absolute scale degree `degree`.
  chordTone(degree, root, length) {
    let best = degree, distance = Infinity;
    for (let octave = -2; octave <= 2; octave++) for (const offset of [0, 2, 4, 6]) {
      const tone = root + offset + octave * length, gap = Math.abs(tone - degree);
      if (gap < distance || (gap === distance && tone < best)) { best = tone; distance = gap; }
    }
    return best;
  }

  // Place a degree in the octave closest to the previous note, near the section's register.
  voice(settings, degree, length) {
    const center = 69 + this.register, previous = this.lastMidi ?? center;
    let best = null, cost = Infinity;
    for (let octave = -3; octave <= 3; octave++) {
      const candidate = degree + octave * length, midi = scaleMidi(settings, candidate, 60);
      if (midi < LOW || midi > HIGH) continue;
      const score = Math.abs(midi - previous) + .15 * Math.abs(midi - center);
      if (score < cost) { cost = score; best = candidate; }
    }
    return best ?? degree;
  }

  // Returns the next melody event; `beat` is seconds per motif step.
  next(settings, root, beat) {
    if (this.step >= this.steps.length) this.advanceCycle(settings);
    const index = this.step++, step = this.steps[index], length = scaleLength(settings);
    const humanize = 1 + (this.random() - .5) * .08;
    const event = { step: index, cycle: this.cycle, section: this.section, sectionIndex: this.sectionIndex, variation: this.variation, rest: step.rest, degree: null, midi: null, duration: beat * step.length * humanize };
    if (step.rest) return event;
    if (this.anchor === null || index === 0) {
      // Start each cycle on the chord tone nearest the previous phrase, not on a transposed copy.
      const near = this.lastMidi === null ? root : this.voice(settings, root, length);
      this.anchor = this.chordTone(near, root, length) - (step.contour - (step.shift || 0));
    }
    let degree = this.anchor + step.contour;
    const strong = index === 0 || step.length >= 1.5;
    if (strong) degree = this.chordTone(degree, root, length);
    degree = this.voice(settings, degree, length);
    const midi = scaleMidi(settings, degree, 60);
    const notes = this.steps.filter(entry => !entry.rest).length, position = this.steps.slice(0, index + 1).filter(entry => !entry.rest).length - 1;
    const arc = notes > 1 ? Math.sin(Math.PI * position / (notes - 1 + 1e-9)) : 1;
    event.degree = degree - root;
    event.midi = midi;
    event.velocity = Math.min(1, .6 + .28 * arc + this.random() * .08) * (this.section === 'sparse' ? .85 : 1);
    event.pan = Math.max(-.8, Math.min(.8, (midi - 69) / 24 * .8 + (this.random() - .5) * .3));
    event.strong = strong;
    this.lastMidi = midi;
    return event;
  }
}
