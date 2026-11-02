import test from 'node:test';
import assert from 'node:assert/strict';
import { createOutputRouting } from '../dist/output-routing.mjs';

const speaker = (deviceId, label = deviceId) => ({ kind: 'audiooutput', deviceId, label });
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const turn = () => new Promise(resolve => setImmediate(resolve));
const failure = name => Object.assign(new Error(name), { name });
function media(outputs = [speaker('a', 'Living room'), speaker('b', 'Headphones')]) {
  const target = new EventTarget();
  target.outputs = outputs;
  target.enumerateDevices = async () => target.outputs;
  target.getUserMedia = () => { throw new Error('Speaker routing must not request microphone access'); };
  return target;
}
function context() {
  return {
    state: 'suspended', sinkId: '', calls: [],
    async setSinkId(id) { this.calls.push(id); this.sinkId = id; },
    resume() { throw new Error('Speaker routing must not resume audio'); }
  };
}
const controller = devices => createOutputRouting({ mediaDevices: devices, supportsOutputSelection: true });

test('unsupported browsers retain a truthful default and never request microphone access', async () => {
  const devices = media();
  devices.enumerateDevices = () => { throw Error('No need to enumerate unsupported output selection'); };
  const routing = createOutputRouting({ mediaDevices: devices, supportsOutputSelection: false });
  await routing.refresh();
  assert.equal(routing.snapshot().supported, false);
  assert.equal(routing.snapshot().canChoose, false);
  assert.deepEqual(routing.snapshot().devices, [{ deviceId: '', label: 'Device output' }]);
  await assert.rejects(routing.select('a'), { name: 'NotFoundError' });
  await routing.select('');
  assert.equal(routing.snapshot().selectedId, '');
  routing.dispose();
});

test('permitted device list is deduplicated, labelled and isolated from snapshot mutations', async () => {
  const devices = media([
    speaker('default', 'System default'), speaker('a', 'Living room'), speaker('a', 'Duplicate'),
    speaker('b', ''), { kind: 'audioinput', deviceId: 'mic', label: 'Microphone' }
  ]);
  const routing = controller(devices);
  await routing.refresh();
  const snapshot = routing.snapshot();
  assert.deepEqual(snapshot.devices, [
    { deviceId: '', label: 'Device output' }, { deviceId: 'a', label: 'Living room' }, { deviceId: 'b', label: 'Speaker 2' }
  ]);
  snapshot.devices[1].label = 'Wrong';
  assert.equal(routing.snapshot().devices[1].label, 'Living room');
  routing.dispose();
});

test('selection before audio exists remains a session preference until a context is bound', async () => {
  const routing = controller(media());
  const selected = await routing.select('a');
  assert.equal(selected.busy, false);
  assert.equal(routing.snapshot().selectedId, 'a');
  assert.equal(routing.snapshot().selectedLabel, 'Living room');
  const audio = context();
  await routing.bindContext(audio);
  assert.equal(audio.sinkId, 'a');
  assert.equal(audio.state, 'suspended');
  await routing.bindContext(audio);
  assert.deepEqual(audio.calls, ['a'], 'Repeated activation waits but never reapplies a route');
  routing.dispose();
});

test('switch confirmation waits for success; denied switching preserves the confirmed route', async () => {
  const routing = controller(media()), audio = context();
  await routing.bindContext(audio);
  await routing.select('a');
  const gate = deferred();
  audio.setSinkId = id => { audio.calls.push(id); return gate.promise.then(() => { audio.sinkId = id; }); };
  const switching = routing.select('b');
  await turn();
  assert.equal(routing.snapshot().busy, true);
  assert.equal(routing.snapshot().selectedId, 'a');
  gate.reject(failure('NotAllowedError'));
  await assert.rejects(switching, { name: 'NotAllowedError' });
  assert.equal(routing.snapshot().selectedId, 'a');
  assert.equal(audio.sinkId, 'a');
  assert.match(routing.snapshot().message, /denied/);
  await routing.bindContext(audio);
  assert.equal(routing.snapshot().busy, false);
  routing.dispose();
});

test('missing or unpermitted output cannot replace a confirmed speaker', async () => {
  const routing = controller(media()), audio = context();
  await routing.bindContext(audio);
  await routing.select('a');
  await assert.rejects(routing.select('unknown'), { name: 'NotFoundError' });
  assert.equal(routing.snapshot().selectedId, 'a');
  assert.deepEqual(audio.calls, ['a']);
  routing.dispose();
});

test('overlapping selections serialize physical switches and same-context binding waits for the latest route', async () => {
  const routing = controller(media()), audio = context();
  await routing.bindContext(audio);
  const gate = deferred();
  audio.setSinkId = async id => {
    audio.calls.push(id);
    if (id === 'a') await gate.promise;
    audio.sinkId = id;
  };
  const first = routing.select('a'), second = routing.select('b');
  const ready = routing.bindContext(audio);
  let settled = false;
  ready.then(() => { settled = true; });
  await turn();
  assert.deepEqual(audio.calls, ['a']);
  assert.equal(settled, false);
  gate.resolve();
  await Promise.all([first, second, ready]);
  assert.deepEqual(audio.calls, ['a', 'b']);
  assert.equal(audio.sinkId, 'b');
  assert.equal(routing.snapshot().selectedId, 'b');
  assert.equal(routing.snapshot().busy, false);
  routing.dispose();
});

test('a later failed switch leaves the earlier successful physical route confirmed', async () => {
  const routing = controller(media()), audio = context();
  await routing.bindContext(audio);
  audio.setSinkId = async id => { if (id === 'b') throw failure('InvalidAccessError'); audio.sinkId = id; };
  const first = routing.select('a'), second = routing.select('b');
  await first;
  await assert.rejects(second, { name: 'InvalidAccessError' });
  assert.equal(audio.sinkId, 'a');
  assert.equal(routing.snapshot().selectedId, 'a');
  routing.dispose();
});

test('retiring a context invalidates late switches without delaying a replacement context', async () => {
  const routing = controller(media()), old = context();
  await routing.bindContext(old);
  await routing.select('a');
  const gate = deferred();
  old.setSinkId = async id => { await gate.promise; old.sinkId = id; };
  const stale = routing.select('b');
  await turn();
  await routing.bindContext(null);
  const replacement = context();
  await routing.bindContext(replacement);
  assert.equal(replacement.sinkId, 'a');
  assert.equal(routing.snapshot().selectedId, 'a');
  gate.resolve();
  await assert.rejects(stale, { name: 'AbortError' });
  assert.equal(routing.snapshot().selectedId, 'a');
  assert.equal(routing.snapshot().message, '');
  routing.dispose();
});

test('first audio binding honors a pending no-context selection before readiness resolves', async () => {
  const devices = media(), routing = controller(devices), gate = deferred();
  devices.enumerateDevices = () => gate.promise;
  const selection = routing.select('a');
  await turn();
  devices.enumerateDevices = async () => devices.outputs;
  const audio = context(), switching = deferred();
  audio.setSinkId = async id => { await switching.promise; audio.sinkId = id; };
  const readiness = routing.bindContext(audio);
  gate.resolve(devices.outputs);
  let ready = false;
  readiness.then(() => { ready = true; });
  await turn();
  assert.equal(ready, false);
  assert.equal(routing.snapshot().selectedId, '', 'No success label before the physical switch');
  switching.resolve();
  await Promise.all([selection, readiness]);
  assert.equal(routing.snapshot().selectedId, 'a');
  assert.equal(audio.sinkId, 'a');
  routing.dispose();
});

for (const prior of ['', 'a']) {
  test(`first binding retains denied selection feedback while restoring ${prior || 'Device output'}`, async () => {
    const devices = media(), routing = controller(devices), gate = deferred();
    if (prior) await routing.select(prior);
    devices.enumerateDevices = () => gate.promise;
    const selection = routing.select('b');
    await turn();
    devices.enumerateDevices = async () => devices.outputs;
    const audio = context();
    audio.setSinkId = async id => {
      if (id === 'b') throw failure('NotAllowedError');
      audio.sinkId = id;
    };
    const readiness = routing.bindContext(audio);
    gate.resolve(devices.outputs);
    await assert.rejects(selection, { name: 'NotAllowedError' });
    const ready = await readiness;
    assert.equal(audio.sinkId, prior);
    assert.equal(ready.selectedId, prior);
    assert.match(ready.message, /access was denied/);
    assert.match(ready.message, prior ? /Using Living room/ : /Using Device output/);
    assert.equal(routing.snapshot().message, ready.message);
    routing.dispose();
  });
}

test('device enumeration requests stay ordered rather than exposing late stale lists', async () => {
  const devices = media(), routing = controller(devices), gate = deferred();
  let reads = 0;
  devices.enumerateDevices = () => ++reads === 1 ? gate.promise : Promise.resolve([speaker('b', 'Only headphones')]);
  const first = routing.refresh(), second = routing.refresh();
  await turn();
  assert.equal(reads, 1);
  gate.resolve([speaker('a', 'Old speaker')]);
  await Promise.all([first, second]);
  assert.equal(reads, 2);
  assert.deepEqual(routing.snapshot().devices, [{ deviceId: '', label: 'Device output' }, { deviceId: 'b', label: 'Only headphones' }]);
  routing.dispose();
});

test('devicechange moves a disconnected route to confirmed Device output', async () => {
  const devices = media(), routing = controller(devices), audio = context();
  await routing.bindContext(audio);
  await routing.select('a');
  devices.outputs = [speaker('b')];
  devices.dispatchEvent(new Event('devicechange'));
  await routing.bindContext(audio);
  assert.equal(audio.sinkId, '');
  assert.equal(routing.snapshot().selectedId, '');
  assert.match(routing.snapshot().message, /unavailable.*Device output/);
  assert.deepEqual(routing.snapshot().devices.map(device => device.deviceId), ['', 'b']);
  routing.dispose();
});

test('Restart clears an unavailable retained route and restores a permitted route', async () => {
  const devices = media(), routing = controller(devices);
  await routing.select('a');
  const first = context();
  await routing.bindContext(first);
  await routing.bindContext(null);
  devices.outputs = [speaker('b')];
  const next = context();
  await routing.bindContext(next);
  assert.equal(routing.snapshot().selectedId, '');
  assert.match(routing.snapshot().message, /unavailable/);
  assert.equal(next.sinkId, '');
  routing.dispose();
});

test('enumeration errors preserve a confirmed selection but default playback can still bind', async () => {
  const devices = media(), routing = controller(devices);
  await routing.select('a');
  devices.enumerateDevices = async () => { throw failure('NotAllowedError'); };
  await assert.rejects(routing.refresh(), { name: 'NotAllowedError' });
  assert.equal(routing.snapshot().selectedId, 'a');
  const audio = context();
  await routing.bindContext(audio);
  assert.equal(routing.snapshot().selectedId, '');
  assert.match(routing.snapshot().message, /could not be restored/);
  assert.equal(audio.sinkId, '');
  routing.dispose();
});

test('a failed default route rejects readiness until the user repairs it', async () => {
  const routing = controller(media()), audio = context();
  audio.sinkId = 'unexpected';
  audio.setSinkId = async () => { throw failure('InvalidAccessError'); };
  await assert.rejects(routing.bindContext(audio), { name: 'InvalidAccessError' });
  await assert.rejects(routing.bindContext(audio), { name: 'InvalidAccessError' });
  audio.setSinkId = async id => { audio.sinkId = id; };
  await routing.select('');
  await routing.bindContext(audio);
  assert.equal(audio.sinkId, '');
  routing.dispose();
});

test('picker runs in the direct call, cancellation preserves output, and successful grants select', async () => {
  const devices = media(), routing = controller(devices), calls = [], gate = deferred();
  devices.selectAudioOutput = () => { calls.push('picker'); return gate.promise; };
  const choosing = routing.choose();
  calls.push('after choose');
  assert.deepEqual(calls, ['picker', 'after choose']);
  gate.reject(failure('AbortError'));
  await assert.rejects(choosing, { name: 'AbortError' });
  assert.equal(routing.snapshot().selectedId, '');
  assert.match(routing.snapshot().message, /cancelled/);
  devices.selectAudioOutput = async () => speaker('new', 'Newly granted speaker');
  await routing.choose();
  assert.equal(routing.snapshot().selectedId, 'new');
  assert.equal(routing.snapshot().selectedLabel, 'Newly granted speaker');
  routing.dispose();
});

test('first binding honors a pending picker, while retired pickers cannot commit selection', async () => {
  const devices = media(), routing = controller(devices), gate = deferred();
  devices.selectAudioOutput = () => gate.promise;
  const choosing = routing.choose(), audio = context();
  const binding = routing.bindContext(audio);
  gate.resolve(speaker('a'));
  await Promise.all([choosing, binding]);
  assert.equal(routing.snapshot().selectedId, 'a');
  assert.equal(audio.sinkId, 'a');
  const staleChoice = deferred();
  devices.selectAudioOutput = () => staleChoice.promise;
  const stale = routing.choose();
  await turn();
  await routing.bindContext(null);
  await routing.bindContext(context());
  staleChoice.resolve(speaker('b'));
  await assert.rejects(stale, { name: 'AbortError' });
  assert.equal(routing.snapshot().selectedId, 'a');
  const closed = context(); closed.state = 'closed';
  await assert.rejects(routing.bindContext(closed), { name: 'AbortError' });
  routing.dispose();
});

test('dispose removes device listeners and prevents late completion or further work', async () => {
  const devices = media(), routing = controller(devices), gate = deferred();
  let enumerations = 0;
  devices.enumerateDevices = () => { enumerations++; return gate.promise; };
  const pending = routing.select('a');
  await turn();
  routing.dispose();
  devices.dispatchEvent(new Event('devicechange'));
  gate.resolve(devices.outputs);
  await assert.rejects(pending, { name: 'AbortError' });
  await assert.rejects(routing.select('b'), { name: 'AbortError' });
  await assert.rejects(routing.bindContext(context()), { name: 'AbortError' });
  assert.equal(enumerations, 1);
  assert.equal(routing.snapshot().selectedId, '');
  assert.equal(routing.snapshot().busy, false);
});
