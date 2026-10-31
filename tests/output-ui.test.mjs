import test from 'node:test';
import assert from 'node:assert/strict';
import { createOutputUI } from '../dist/output-ui.mjs';

// DOM boundary fixture. Native dialog focus trapping, Escape and layout are
// checked in the browser; these tests cover commands and visible route state.
function fixture(onTestSound, navigator) {
  const doc = { activeElement: null };
  class Element extends EventTarget {
    constructor(tag) { super(); this.tagName = tag.toUpperCase(); this.children = []; this.attributes = {}; this.textContent = ''; this.disabled = false; this.hidden = false; this.value = ''; }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    getAttribute(name) { return this.attributes[name] ?? null; }
    append(...nodes) { for (const node of nodes) { this.children.push(node); node.parentNode = this; } }
    replaceChildren(...nodes) { this.children.forEach(node => node.parentNode = null); this.children = []; this.append(...nodes); }
    get options() { return this.children; }
    get isConnected() { return this === doc.body || !!this.parentNode?.isConnected; }
    focus() { doc.activeElement = this; }
    showModal() { this.open = true; }
    close() { this.open = false; this.dispatchEvent(new Event('close')); }
    remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(node => node !== this); this.parentNode = null; }
  }
  doc.createElement = tag => new Element(tag);
  doc.body = new Element('body');
  let state = { supported: true, canChoose: true, devices: [{ deviceId: '', label: 'Device output' }, { deviceId: 'speaker', label: 'Living room' }], selectedId: '', selectedLabel: 'Device output', busy: false, message: '' };
  const commands = [];
  const routing = {
    snapshot: () => state,
    refresh() { commands.push('refresh'); return Promise.resolve(); },
    select(id) { commands.push(['select', id]); return Promise.resolve(); },
    choose() { commands.push('choose'); return Promise.resolve(); }
  };
  let tests = 0;
  const ui = createOutputUI({ routing, document: doc, navigator, onTestSound() { tests++; return onTestSound?.(); } });
  doc.body.append(ui.button);
  function byId(id, node = doc.body) { return node.getAttribute('id') === id ? node : node.children.map(child => byId(id, child)).find(Boolean); }
  return { doc, ui, routing, commands, byId, tests: () => tests, setState(next) { state = { ...state, ...next }; ui.refresh(state); } };
}
const click = node => node.dispatchEvent(new Event('click'));
const settle = async () => { await Promise.resolve(); await Promise.resolve(); };

test('opening and selecting output issue routing commands without sending test audio', async () => {
  const f = fixture();
  f.ui.button.focus();
  click(f.ui.button);
  assert.equal(f.byId('outputDialog').open, true);
  assert.equal(f.doc.activeElement, f.byId('closeOutput'));
  assert.deepEqual(f.commands, ['refresh']);
  const select = f.byId('outputDevice');
  select.value = 'speaker';
  select.dispatchEvent(new Event('change'));
  await settle();
  assert.deepEqual(f.commands, ['refresh', ['select', 'speaker']]);
  assert.equal(f.tests(), 0);
  assert.equal(f.byId('outputCurrent').textContent, 'Device output', 'A pending routing request must not claim a new output');
  f.setState({ selectedId: 'speaker', selectedLabel: 'Living room' });
  assert.equal(f.ui.button.textContent, 'Output', 'Long device names stay out of the toolbar');
  assert.equal(f.ui.button.getAttribute('aria-label'), 'Audio output: Living room');
  click(f.byId('closeOutput'));
  assert.equal(f.doc.activeElement, f.ui.button);
  f.ui.dispose();
});

test('unsupported browsers retain setup help and Test sound while hiding unavailable commands', () => {
  const f = fixture();
  f.setState({ supported: false, canChoose: false, devices: [{ deviceId: '', label: 'Device output' }] });
  assert.equal(f.byId('outputDevice').parentNode.hidden, true);
  assert.equal(f.byId('chooseOutput').hidden, true);
  assert.equal(f.byId('refreshOutputs').hidden, true);
  assert.match(f.byId('outputAvailability').textContent, /device sound settings/);
  assert.equal(f.byId('testOutput').disabled, false);
  assert.equal(f.tests(), 0);
  f.ui.dispose();
});

test('route errors keep the confirmed name, and cancelled picker remains retryable', async () => {
  const f = fixture();
  f.routing.select = () => Promise.reject(new Error('Speaker is unavailable.'));
  const select = f.byId('outputDevice');
  select.value = 'speaker';
  select.dispatchEvent(new Event('change'));
  await settle();
  assert.equal(f.byId('outputCurrent').textContent, 'Device output');
  assert.equal(select.value, '');
  assert.equal(f.byId('outputMessage').textContent, 'Speaker is unavailable.');
  f.routing.choose = () => Promise.reject(Object.assign(new Error('cancel'), { name: 'AbortError' }));
  click(f.byId('chooseOutput'));
  await settle();
  assert.equal(f.byId('outputMessage').textContent, 'Output selection cancelled.');
  assert.equal(f.byId('chooseOutput').disabled, false);
  assert.equal(f.tests(), 0);
  f.ui.dispose();
});

test('only explicit Test sound calls audio, and routing busy blocks that action', async () => {
  const f = fixture();
  f.setState({ busy: true });
  assert.equal(f.byId('testOutput').disabled, true);
  click(f.byId('testOutput'));
  assert.equal(f.tests(), 0);
  f.setState({ busy: false });
  click(f.byId('testOutput'));
  assert.equal(f.tests(), 1);
  assert.equal(f.byId('testOutput').disabled, true);
  await settle();
  await settle();
  assert.equal(f.byId('testOutput').disabled, false);
  f.ui.dispose();
  click(f.ui.button);
  assert.equal(f.byId('outputDialog'), undefined);
});

test('late failures from an older UI command cannot replace newer output status', async () => {
  const f = fixture();
  let rejectRefresh;
  f.routing.refresh = () => new Promise((_, reject) => { rejectRefresh = reject; });
  click(f.byId('refreshOutputs'));
  click(f.byId('chooseOutput'));
  await settle();
  rejectRefresh(new Error('Old request failed.'));
  await settle();
  assert.equal(f.byId('outputMessage').textContent, '');
  f.ui.dispose();
});

test('Test sound success and failure descriptions remain visible inside the modal', async () => {
  for (const message of [
    'Test notes sent. Check your selected speaker.',
    'Master volume is 0%. Raise the volume, then try Test sound again.',
    'Audio could not start. Tap Test sound to try again.'
  ]) {
    const f = fixture(() => Promise.resolve(message));
    click(f.ui.button);
    await settle();
    click(f.byId('testOutput'));
    assert.equal(f.tests(), 1, 'The explicit click invokes Test sound synchronously');
    await settle();
    await settle();
    assert.equal(f.byId('outputDialog').open, true);
    assert.equal(f.byId('outputMessage').textContent, message);
    assert.equal(f.byId('testOutput').disabled, false);
    f.ui.dispose();
  }
});

test('late Test sound descriptions cannot replace a newer output command result', async () => {
  let finishTest;
  const f = fixture(() => new Promise(resolve => { finishTest = resolve; }));
  click(f.byId('testOutput'));
  click(f.byId('refreshOutputs'));
  await settle();
  finishTest('Earlier test completed.');
  await settle();
  await settle();
  assert.equal(f.byId('outputMessage').textContent, '');
  f.ui.dispose();
});

test('routing failures show the controller explanation instead of a raw browser error', async () => {
  const f = fixture();
  f.routing.select = () => {
    f.setState({ message: 'Output access was denied. Choose your speaker in device sound settings.' });
    return Promise.reject(new Error('Permission denied'));
  };
  f.byId('outputDevice').value = 'speaker';
  f.byId('outputDevice').dispatchEvent(new Event('change'));
  await settle();
  assert.equal(f.byId('outputMessage').textContent, 'Output access was denied. Choose your speaker in device sound settings.');
  f.ui.dispose();
});

test('device changes replace Test sound feedback with the current fallback explanation', async () => {
  const f = fixture(() => Promise.resolve('Test notes sent. Check your selected speaker.'));
  f.setState({ selectedId: 'speaker', selectedLabel: 'Living room' });
  click(f.byId('testOutput'));
  await settle();
  await settle();
  assert.equal(f.byId('outputMessage').textContent, 'Test notes sent. Check your selected speaker.');
  f.ui.refresh();
  assert.equal(f.byId('outputMessage').textContent, 'Test notes sent. Check your selected speaker.', 'An unchanged status render preserves readable command feedback');
  f.setState({
    selectedId: '', selectedLabel: 'Device output',
    devices: [{ deviceId: '', label: 'Device output' }],
    message: 'The selected speaker is unavailable. Using Device output.'
  });
  assert.equal(f.byId('outputCurrent').textContent, 'Device output');
  assert.equal(f.byId('outputMessage').textContent, 'The selected speaker is unavailable. Using Device output.');
  f.ui.dispose();
});

test('Test sound feedback survives unchanged final routing notifications but yields to new activity', async () => {
  let finishTest;
  const f = fixture(() => new Promise(resolve => { finishTest = resolve; }));
  click(f.byId('testOutput'));
  f.setState({ busy: true, message: 'Preparing the selected output.' });
  f.setState({ busy: false, message: '' });
  finishTest('Test notes sent. Check your selected speaker.');
  await settle();
  await settle();
  f.setState({ busy: false, message: '' });
  assert.equal(f.byId('outputMessage').textContent, 'Test notes sent. Check your selected speaker.');
  f.setState({ busy: true, message: 'Refreshing outputs.' });
  assert.equal(f.byId('outputMessage').textContent, 'Refreshing outputs.');
  f.ui.dispose();
});

test('iPhone output shows the Sonos AirPlay route with setup already expanded', () => {
  const f = fixture(undefined, {userAgent: 'iPhone', platform: 'iPhone', maxTouchPoints: 5});
  f.setState({supported: false, canChoose: false});
  assert.match(f.byId('outputAvailability').textContent, /Control Center > AirPlay/);
  assert.match(f.byId('outputAvailability').textContent, /Sonos One supports AirPlay/);
  assert.equal(f.byId('outputSonosHelp').open, true);
  assert.equal(f.tests(), 0);
  f.ui.dispose();
});
