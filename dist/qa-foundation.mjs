import { INSTRUMENT_LABELS, INSTRUMENT_HELP } from './foundation-instruments.mjs';
import { AMBIENT_DEFAULTS } from './ambient-settings.mjs';
import { TAPE_DEFAULTS } from './tape-settings.mjs';
import { encodeWav } from './wave-file.mjs';

const status = document.getElementById('status');
const results = document.getElementById('results');
const clips = document.getElementById('clips');
const receiptView = document.getElementById('receipt');
const instruments = Object.keys(INSTRUMENT_LABELS);
const settings = { ...AMBIENT_DEFAULTS, seed: 719, hold: true, pads: 85, melody: 35, air: 0, activity: 65, color: 58, drift: 48, bloom: 65 };
const echoSettings = { ...TAPE_DEFAULTS, tapeOn: true, tapeModel: 2, echoMode: 11, delayTime: .36, feedback: 42, delayMix: 32, springMix: 22, drive: 18, wow: 12, flutter: 6, hiss: 0 };
const urls = [];
const rms = values => Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length);
const pauseMessages = () => new Promise(resolve => setTimeout(resolve, 20));
const hash = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), value => value.toString(16).padStart(2, '0')).join('');

function ready(node) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('Audio processor readiness timed out')), 5000);
    node.port.onmessage = ({ data }) => {
      if (data.type === 'ready') { clearTimeout(timer); resolve(); }
    };
    node.onprocessorerror = () => { clearTimeout(timer); reject(Error('Audio processor failed')); };
  });
}

async function render(instrument, { rate = 48000, seconds = 5, texture = false, echo = false, switches = false } = {}) {
  const context = new OfflineAudioContext(2, Math.round(rate * seconds), rate);
  await context.audioWorklet.addModule('./build/ambient-worklet.js');
  if (texture) await context.audioWorklet.addModule('./build/grain-worklet.js');
  if (echo) await context.audioWorklet.addModule('./build/tape-worklet.js');
  const foundation = new AudioWorkletNode(context, 'ambient-engine', { numberOfInputs: 0, outputChannelCount: [2], processorOptions: { settings: { ...settings, instrument }, playing: true } });
  const pending = [ready(foundation)];
  let end = foundation;
  if (texture) {
    const grains = new AudioWorkletNode(context, 'grain-engine', { numberOfInputs: 1, outputChannelCount: [2], processorOptions: { source: 'foundation', playing: true, params: { size: 300, density: 24, position: .5, width: 100, spray: 20, pitch: 0 } } });
    pending.push(ready(grains));
    foundation.connect(grains); end = grains;
  }
  if (echo) {
    const tape = new AudioWorkletNode(context, 'tape-delay', { numberOfInputs: 1, outputChannelCount: [2], processorOptions: { params: echoSettings } });
    pending.push(ready(tape)); end.connect(tape); end = tape;
  }
  end.connect(context.destination);
  const pauses = switches ? instruments.slice(1).map((id, index) => ({ id, at: (index + 1) * 1.5, promise: context.suspend((index + 1) * 1.5) })) : [];
  await Promise.all(pending);
  const rendering = context.startRendering();
  for (const pause of pauses) {
    await pause.promise;
    foundation.port.postMessage({ type: 'settings', value: { instrument: pause.id } });
    await pauseMessages(); await context.resume();
  }
  return rendering;
}

function metrics(buffer) {
  let peak = 0, finite = true;
  for (let channel = 0; channel < 2; channel++) {
    for (const value of buffer.getChannelData(channel)) { finite &&= Number.isFinite(value); peak = Math.max(peak, Math.abs(value)); }
  }
  return { finite, peak, rms: rms(buffer.getChannelData(0).subarray(Math.round(buffer.sampleRate * 2))) };
}

async function save(name, bytes) {
  try { return (await fetch('/.listening-save/' + name, { method: 'POST', body: bytes })).ok; }
  catch { return false; }
}

async function baseReceipt(kind) {
  const build = await (await fetch('./build/manifest.json')).json();
  const source = await (await fetch('./qa-foundation.mjs')).text();
  return { createdAt: new Date().toISOString(), kind, buildInputs: build.inputs, harnessSha256: await hash(new TextEncoder().encode(source)), settings, hardwareMatchVerified: false };
}

async function checks() {
  results.textContent = '';
  const receipt = { ...await baseReceipt('Foundation worklet checks'), checks: [], renders: [] };
  function check(condition, label) {
    receipt.checks.push({ label, passed: Boolean(condition) });
    results.textContent += (condition ? 'PASS ' : 'FAIL ') + label + '\n';
    if (!condition) throw Error(label);
  }
  try {
    for (const rate of [44100, 48000]) {
      let baseline;
      for (const instrument of instruments) {
        status.textContent = 'Checking ' + INSTRUMENT_LABELS[instrument] + ' at ' + rate + ' Hz…';
        const dry = await render(instrument, { rate }), data = dry.getChannelData(0), stats = metrics(dry);
        receipt.renders.push({ instrument, rate, route: 'dry', ...stats });
        check(stats.finite && stats.peak < .8 && stats.rms > .0001, `${rate} Hz ${instrument}: audible, finite dry output with headroom`);
        if (!baseline) baseline = data;
        else check(rms(data.map((value, index) => value - baseline[index])) > .001, `${rate} Hz ${instrument}: differs from original Foundation`);
        const texture = await render(instrument, { rate, texture: true }), textureStats = metrics(texture);
        receipt.renders.push({ instrument, rate, route: 'live Texture only', ...textureStats });
        check(textureStats.finite && textureStats.peak < 1 && textureStats.rms > .0001, `${rate} Hz ${instrument}: supplies live Texture with dry Foundation disconnected`);
      }
      const changed = await render('current', { rate, seconds: 10, switches: true }), stats = metrics(changed);
      check(stats.finite && stats.peak < .8, `${rate} Hz live instrument changes remain bounded`);
    }
    document.body.dataset.result = 'passed';
    status.textContent = receipt.checks.length + ' Worklet checks passed.';
  } catch (error) {
    document.body.dataset.result = 'failed'; status.textContent = error.message;
  } finally {
    receiptView.textContent = JSON.stringify(receipt, null, 2);
    await save('foundation-worklet-receipt.json', receiptView.textContent);
  }
}

function player(container, title, src, filename) {
  const heading = document.createElement('h3'), audio = document.createElement('audio'), download = document.createElement('a');
  heading.textContent = title; audio.controls = true; audio.preload = 'metadata'; audio.src = src;
  audio.addEventListener('play', () => { for (const other of clips.querySelectorAll('audio')) if (other !== audio) other.pause(); });
  download.href = src; download.download = filename; download.textContent = 'Download WAV';
  const column = document.createElement('div'); column.append(heading, audio, download); container.append(column);
}

function section(instrument) {
  const element = document.createElement('section'), heading = document.createElement('h2'), note = document.createElement('p'), pair = document.createElement('div');
  heading.textContent = INSTRUMENT_LABELS[instrument]; note.textContent = INSTRUMENT_HELP[instrument]; pair.className = 'pair';
  element.append(heading, note, pair); clips.append(element); return pair;
}

async function renderComparisons() {
  urls.splice(0).forEach(url => URL.revokeObjectURL(url)); clips.replaceChildren();
  const receipt = { ...await baseReceipt('Foundation listening comparisons'), gain: 'common engine gain; no per-clip normalization', rate: 48000, seconds: 12, echoSettings, clips: [] };
  for (const instrument of instruments) {
    const pair = section(instrument);
    for (const echo of [false, true]) {
      const id = instrument + (echo ? '-echo' : '-dry'), name = 'foundation-' + id + '.wav';
      status.textContent = 'Rendering ' + INSTRUMENT_LABELS[instrument] + (echo ? ' with Space Echo…' : ' dry…');
      const buffer = await render(instrument, { seconds: 12, echo }), wav = encodeWav(buffer), url = URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }));
      urls.push(url); player(pair, echo ? 'With Space Echo' : 'Dry', url, name);
      receipt.clips.push({ id, instrument, echo, ...metrics(buffer), sha256: await hash(wav), saved: await save(name, wav) });
    }
  }
  receiptView.textContent = JSON.stringify(receipt, null, 2);
  await save('foundation-listening-receipt.json', receiptView.textContent);
  status.textContent = 'Twelve clips ready. Listen dry first, then compare with Space Echo.';
  document.body.dataset.render = 'passed';
}

for (const [id, action] of [['check', checks], ['render', renderComparisons]]) {
  document.getElementById(id).onclick = async () => {
    const buttons = [...document.querySelectorAll('button')]; buttons.forEach(button => button.disabled = true);
    try { await action(); } catch (error) { status.textContent = error.message; document.body.dataset.result = 'failed'; }
    finally { buttons.forEach(button => button.disabled = false); }
  };
}

if (new URLSearchParams(location.search).has('saved')) {
  try {
    const response = await fetch('/.listening-artifacts/foundation-listening-receipt.json');
    if (!response.ok) throw Error('No saved comparisons yet');
    const receipt = await response.json();
    for (const instrument of instruments) {
      const pair = section(instrument);
      for (const clip of receipt.clips.filter(clip => clip.instrument === instrument && clip.saved)) {
        const name = 'foundation-' + clip.id + '.wav';
        player(pair, clip.echo ? 'With Space Echo' : 'Dry', '/.listening-artifacts/' + name, name);
      }
    }
    receiptView.textContent = JSON.stringify(receipt, null, 2);
    status.textContent = 'Saved comparisons ready. These clips are our synthesis models; see the receipt for their build hashes.';
  } catch (error) { status.textContent = error.message + '. Use Render listening comparisons.'; }
}
