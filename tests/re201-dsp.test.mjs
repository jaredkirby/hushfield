import test from 'node:test';
import assert from 'node:assert/strict';
import { TapeDelay } from '../dist/tape-dsp.mjs';
import { TapeDelay as OriginalTape } from './fixtures/tape-classic-v1/tape-dsp.mjs';

const rms = values => Math.sqrt(values.reduce((sum, x) => sum + x*x, 0) / values.length);
function render(tape, seconds, signal = () => 0, stereo) {
  const count = Math.ceil(seconds * tape.rate / 128) * 128;
  const result = [new Float32Array(count), new Float32Array(count)];
  for (let at = 0; at < count; at += 128) {
    const input = [new Float32Array(128), new Float32Array(128)];
    for (let i = 0; i < 128; i++) { input[0][i] = signal(at + i); input[1][i] = stereo ? stereo(at + i) : input[0][i]; }
    tape.process(input, [result[0].subarray(at, at + 128), result[1].subarray(at, at + 128)]);
  }
  return result;
}
function machine(rate, values = {}) {
  const tape = new TapeDelay(rate);
  tape.set({ tapeModel: 2, tapeOn: true, delayTime: .12, feedback: 0, delayMix: 70, drive: 0, wow: 0, flutter: 0, hiss: 0, tapeTone: 100, springMix: 0, ...values });
  render(tape, 1.2);
  return tape;
}
for (const rate of [44100, 48000]) {
  test(`${rate} Hz original twelve modes select the documented heads`, () => {
    // Literal transcription of RE-201 owner's manual, independent of settings table.
    const expected = [[1],[2],[3],[2,3],[1],[2],[3],[1,2],[2,3],[1,3],[1,2,3],[]];
    for (let mode = 1; mode <= 12; mode++) {
      const tape = machine(rate, { echoMode: mode });
      const [out] = render(tape, .16, i => i === 0 ? .5 : 0);
      for (let head = 1; head <= 3; head++) {
        const at = Math.round(rate * .04 * head);
        const energy = rms(out.slice(at - 3, at + 160));
        assert.equal(energy > .001, expected[mode - 1].includes(head), `mode ${mode}, head ${head}: ${energy}`);
      }
    }
  });
  test(`${rate} Hz bypass is immediate dry stereo after smoothing, with every control raised`, () => {
    const tape = machine(rate, { tapeOn: false, drive: 100, feedback: 80, delayMix: 70, echoMode: 11, springMix: 70, wow: 100, flutter: 100, hiss: 100 });
    const [left, right] = render(tape, .4, i => i === 0 ? .5 : 0, i => i === 5 ? -.25 : 0);
    assert.equal(left[0], .375); assert.equal(right[5], -.1875);
    assert(left.slice(1).every(value => Math.abs(value) < 1e-14));
    assert(right.filter((_, i) => i !== 5).every(value => Math.abs(value) < 1e-14));
  });
}
test('saved Classic is exactly the frozen original PCM in the same runtime', () => {
  for (const rate of [8000, 44100, 48000]) {
    const current = new TapeDelay(rate), original = new OriginalTape(rate);
    const changes = [
      { tapeModel: 1, tapeOn: true, drive: 55, wow: 65, flutter: 35, feedback: 38, delayMix: 23, tapeTone: 35 },
      { delayTime: .18, feedback: 80, drive: 100 },
      { tapeOn: false }
    ];
    let sample = 0;
    for (const params of changes) {
      current.set(params); original.set(params);
      const start = sample;
      const source = i => Math.sin((start+i)*2*Math.PI*220/rate)*.12;
      assert.deepEqual(render(current, .4, source), render(original, .4, source));
      sample += Math.ceil(.4*rate/128)*128;
    }
  }
});
for (const rate of [44100, 48000]) {
test(`${rate} Hz spring is an independent parallel return, with a dispersive decaying tail`, () => {
  const withSpring = machine(rate, { echoMode: 12, springMix: 70, delayMix: 0 });
  const noSpring = machine(rate, { echoMode: 12, springMix: 0, delayMix: 70 });
  const [a] = render(withSpring, 2.5, i => i === 0 ? .5 : 0);
  const [b] = render(noSpring, 2.5, i => i === 0 ? .5 : 0);
  assert(rms(a.slice(rate*.025, rate/3)) > .0001, 'audible spring without echo');
  assert(rms(a.slice(rate*1.5)) < rms(a.slice(rate*.025, rate/3)) * .05, 'spring decays');
  assert(rms(b.slice(100)) < 1e-12, 'echo level cannot add heads in mode 12');
  assert(a.slice(rate/30, rate/6).filter(x => Math.abs(x) > 1e-6).length > rate/48, 'dispersion spreads the impact');
  const short = machine(rate, { echoMode: 12, springMix: 70, delayTime: .05 });
  const long = machine(rate, { echoMode: 12, springMix: 70, delayTime: 1.5 });
  assert.deepEqual(render(short, .5, i => i === 0 ? .5 : 0), render(long, .5, i => i === 0 ? .5 : 0), 'spring timing is independent of tape speed');
});
test(`${rate} Hz high intensity can sustain a bounded echo and lowering feedback releases it`, () => {
  const tape = machine(rate, { echoMode: 3, feedback: 80, delayTime: .08, tapeTone: 100 });
  const [out] = render(tape, 5, i => i < rate*.1 ? Math.sin(i * 2*Math.PI*700/rate) * .3 : 0);
  assert(out.every(Number.isFinite));
  assert(out.every(x => Math.abs(x) < 2), 'saturation bounds the loop');
  assert(rms(out.slice(-rate)) > .005, 'oscillation survives the source');
  tape.set({ feedback: 0 });
  const [released] = render(tape, 2);
  assert(rms(released.slice(-rate/2)) < 1e-8, 'lower intensity drains the loop');
  const silent = machine(rate, { echoMode: 11, feedback: 80, hiss: 100, springMix: 70 });
  assert.equal(rms(render(silent, 1)[0]), 0, 'noise cannot start an idle runaway');
});
}
function crossings(values, rate, start, end) {
  const at = [];
  for (let i = Math.floor(start*rate)+1; i < Math.floor(end*rate); i++) if (values[i-1] <= 0 && values[i] > 0) at.push(i-1-values[i-1]/(values[i]-values[i-1]));
  return (at.length-1)*rate/(at.at(-1)-at[0]);
}
for (const rate of [44100, 48000]) {
test(`${rate} Hz motor changes bend echo pitch transiently, then settle at the source pitch`, () => {
  const tape = machine(rate, { echoMode: 3, delayTime: .12 });
  const control = machine(rate, { echoMode: 12, delayTime: .12 });
  const signal = i => .12*Math.sin(i*2*Math.PI*440/rate);
  render(tape, 1, signal); render(control, 1, signal);
  tape.set({ delayTime: .48 }); control.set({ delayTime: .48 });
  const [wet] = render(tape, 2, signal), [dry] = render(control, 2, signal);
  const echo = wet.map((x, i) => x-dry[i]);
  const bent = crossings(echo, rate, .08, .20), settled = crossings(echo, rate, 1.4, 1.9);
  assert(bent < 390, `slowing the transport lowers pitch (${bent})`);
  assert(Math.abs(settled-440) < 1, `new tape returns to source pitch (${settled})`);
});
test(`${rate} Hz each feedback pass darkens high frequencies`, () => {
  function ratio(hz) {
    const tape = machine(rate, { echoMode: 3, delayTime: .12, feedback: 45, tapeTone: 30 });
    const dry = machine(rate, { echoMode: 12, delayTime: .12, feedback: 0 });
    const source = i => i < rate*.025 ? Math.sin(i*2*Math.PI*hz/rate)*.1 : 0;
    const [out] = render(tape, .5, source), [direct] = render(dry, .5, source);
    const wet = out.map((x, i) => x-direct[i]);
    function amplitude(start) { let real = 0, imag = 0; for(let i = Math.round(rate*start); i < Math.round(rate*(start+.024)); i++) { real += wet[i]*Math.cos(i*2*Math.PI*hz/rate); imag += wet[i]*Math.sin(i*2*Math.PI*hz/rate); } return Math.hypot(real, imag); }
    return amplitude(.36)/amplitude(.12);
  }
  assert(ratio(6000) < ratio(500)*.5, 'over three repeats, treble retention is less than half the bass retention');
});

}
test('Off drains a saturated feedback loop instead of reviving hidden oscillation', () => {
  const tape = machine(48000, { echoMode: 3, feedback: 80, delayTime: .08 });
  render(tape, 2, i => i < 4800 ? Math.sin(i*2*Math.PI*700/48000)*.3 : 0);
  tape.set({ tapeOn: false }); render(tape, 5);
  tape.set({ tapeOn: true });
  assert(rms(render(tape, 1)[0].slice(-24000)) < 1e-12);
});
test('model and head switches during playback stay finite and bounded at several rates', () => {
  for (const rate of [8000, 44100, 48000, 96000]) {
    const tape = machine(rate, { echoMode: 11, feedback: 80, springMix: 70 });
    for (const values of [{ delayTime: .05, wow: 100, flutter: 100 }, { tapeModel: 1, drive: 100 }, { tapeModel: 2, echoMode: 12 }, { echoMode: 1, delayTime: 1.5 }, { tapeOn: false }]) {
      tape.set(values);
      const [out] = render(tape, .15, i => Math.sin(i*2*Math.PI*350/rate)*.3);
      assert(out.every(Number.isFinite)); assert(out.every(x => Math.abs(x) < 2));
    }
  }
});

test('reversing a model change mid-crossfade retains the already audible machine', () => {
  for (const initial of [1, 2]) {
    const tape = machine(48000, { tapeModel: initial, drive: 100, delayMix: 0, springMix: 0 });
    render(tape, 1, () => .3);
    tape.set({ tapeModel: initial === 2 ? 1 : 2 });
    const [before] = render(tape, 128/48000, () => .3);
    tape.set({ tapeModel: initial });
    const [after] = render(tape, 128/48000, () => .3);
    assert(Math.abs(after[0] - before.at(-1)) < .002, 'a reversal must not reset a contributing processor');
  }
});
test('wow and flutter modulate the shared echo transport while leaving direct pitch intact', () => {
  for (const rate of [44100, 48000]) {
    const source = i => .1*Math.sin(i*2*Math.PI*440/rate);
    const still = render(machine(rate, { echoMode: 3 }), 1.5, source)[0];
    const direct = render(machine(rate, { echoMode: 3, delayMix: 0 }), 1.5, source)[0];
    for (const modulation of [{ wow: 25 }, { flutter: 25 }]) {
      const moving = render(machine(rate, { echoMode: 3, ...modulation }), 1.5, source)[0];
      assert(rms(moving.map((value,i) => value-still[i])) > .001, 'each transport modulation changes echo PCM');
      const movingDirect = render(machine(rate, { echoMode: 3, delayMix: 0, ...modulation }), 1.5, source)[0];
      assert(rms(movingDirect.map((value,i) => value-direct[i])) < 1e-10, 'direct signal does not pass the moving tape heads; allow the vanishing wet-gain slew residual');
    }
  }
});
