// Output setup never activates audio. Only the explicit Test sound callback
// belongs to the application's user-gesture audio path.
export function createOutputUI({ routing, onTestSound, document: doc = globalThis.document, navigator: nav = globalThis.navigator } = {}) {
  const appleMobile = /iPhone|iPad|iPod/.test(nav?.userAgent || '') || nav?.platform === 'MacIntel' && nav?.maxTouchPoints > 1;
  let disposed = false, returnFocus, testing = false, localMessage = '', actionGeneration = 0, routingSignature;
  const listeners = [];
  const make = (tag, text, attributes = {}) => {
    const node = doc.createElement(tag);
    if (text !== undefined) node.textContent = text;
    for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
    return node;
  };
  const listen = (node, name, handler) => {
    node.addEventListener(name, handler);
    listeners.push(() => node.removeEventListener(name, handler));
  };
  const link = (text, href) => make('a', text, { href, target: '_blank', rel: 'noopener noreferrer' });
  const button = make('button', 'Output', { id: 'outputControl', type: 'button', 'aria-haspopup': 'dialog', 'aria-controls': 'outputDialog' });
  const dialog = make('dialog', undefined, { id: 'outputDialog', class: 'output-dialog', 'data-output-ui': '', 'aria-labelledby': 'outputHeading', 'aria-describedby': 'outputIntroduction' });
  const header = make('div', undefined, { class: 'output-heading' });
  const heading = make('h2', 'Audio output', { id: 'outputHeading' });
  const close = make('button', 'Close', { type: 'button', id: 'closeOutput', autofocus: '', 'aria-label': 'Close audio output' });
  header.append(heading, close);
  const introduction = make('p', 'Choose where you listen. Bluetooth and AirPlay connections are managed in your device settings.', { id: 'outputIntroduction' });
  const current = make('p', undefined, { class: 'output-current' });
  current.append(make('span', 'Selected output'), make('strong', 'Device output', { id: 'outputCurrent' }));
  const currentName = current.children[1];
  const selection = make('div', undefined, { class: 'output-selection' });
  const selectLabel = make('label', 'Play through', { for: 'outputDevice' });
  const select = make('select', undefined, { id: 'outputDevice', 'aria-describedby': 'outputAvailability' });
  selection.append(selectLabel, select);
  const availability = make('p', '', { id: 'outputAvailability', class: 'output-note' });
  const actions = make('div', undefined, { class: 'output-actions' });
  const refreshButton = make('button', 'Refresh outputs', { type: 'button', id: 'refreshOutputs' });
  const chooseButton = make('button', 'Choose another output', { type: 'button', id: 'chooseOutput' });
  const testButton = make('button', 'Test sound', { type: 'button', id: 'testOutput' });
  actions.append(refreshButton, chooseButton, testButton);
  const status = make('p', '', { id: 'outputMessage', class: 'output-note', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' });
  const testHelp = make('p', 'Test sound plays two short notes. It does not start a stopped Piece.', { class: 'output-note' });

  const bluetooth = make('details', undefined, { class: 'output-help' });
  bluetooth.append(make('summary', 'Bluetooth speakers'));
  const bluetoothSteps = make('ul');
  for (const text of [
    'Put the speaker in pairing mode, then pair it in your device\'s Bluetooth settings.',
    'iPhone or iPad: open Control Center, open the audio card\'s output menu, then select the paired speaker.',
    'Mac: open System Settings > Sound > Output and select the speaker.',
    'Windows: open Settings > System > Sound and choose the output device.',
    'Android: use the media output control or Connected devices in Settings to select the speaker.'
  ]) bluetoothSteps.append(make('li', text));
  bluetooth.append(bluetoothSteps, make('p', 'Return here and use Test sound. If your speaker is absent from the list, use the device output setting instead.'));

  const sonos = make('details', undefined, { id: 'outputSonosHelp', class: 'output-help' });
  sonos.open = appleMobile;
  sonos.append(make('summary', 'Sonos through AirPlay'));
  const sonosSteps = make('ul');
  for (const text of [
    'Connect your Apple device and Sonos system to the same Wi-Fi network.',
    'iPhone or iPad: start sound, open Control Center, open the audio card\'s AirPlay menu, then choose your Sonos room. Leave Hushfield set to Device output.',
    'Mac: open System Settings > Sound > Output and choose the Sonos speaker.',
    'For more rooms, group the receiving speaker with other rooms in the Sonos app.'
  ]) sonosSteps.append(make('li', text));
  const sonosLinks = make('p');
  sonosLinks.append(link('AirPlay compatibility and setup', 'https://support.sonos.com/en/article/stream-airplay-audio-to-sonos'));
  sonos.append(sonosSteps, make('p', 'AirPlay requires a compatible Sonos model. Some Sonos models also receive Bluetooth and can share it with grouped rooms. Use the Sonos app to set up those connections.'), sonosLinks);
  const sharingLink = make('p');
  sharingLink.append(link('Sonos Bluetooth sharing and grouping', 'https://support.sonos.com/en/article/share-bluetooth-audio-with-your-sonos-system'));
  sonos.append(sharingLink);
  const latency = make('p', 'Wireless speakers can delay changes you make to the sound. Background and locked-screen playback depend on your browser and device.', { class: 'output-note' });
  dialog.append(header, introduction, current, selection, availability, actions, status, testHelp, bluetooth, sonos, latency);
  doc.body.append(dialog);

  function refresh(state = routing.snapshot()) {
    if (disposed) return;
    const signature = JSON.stringify([
      state.supported, state.canChoose, state.selectedId, state.selectedLabel,
      !!state.busy, state.message,
      (state.devices || []).map(device => [device.deviceId, device.label])
    ]);
    // Command feedback belongs to the route state that produced it. New device
    // activity must expose the controller's current explanation, while an
    // unchanged render leaves the last explicit Test sound result readable.
    if (routingSignature !== undefined && routingSignature !== signature) localMessage = '';
    routingSignature = signature;
    const label = state.selectedLabel || 'Device output';
    button.title = `Audio output: ${label}`;
    button.setAttribute('aria-label', `Audio output: ${label}`);
    currentName.textContent = label;
    selection.hidden = !state.supported;
    chooseButton.hidden = !state.canChoose;
    refreshButton.hidden = !state.supported;
    const devices = state.devices || [{ deviceId: '', label: 'Device output' }];
    const focused = doc.activeElement === select;
    const oldDevices = [...select.options].map(option => [option.value, option.textContent]);
    if (JSON.stringify(oldDevices) !== JSON.stringify(devices.map(device => [device.deviceId, device.label]))) {
      const options = devices.map(device => {
        const option = make('option', device.label);
        option.value = device.deviceId;
        return option;
      });
      select.replaceChildren(...options);
    }
    select.value = state.selectedId || '';
    select.disabled = !!state.busy || !state.supported || devices.length < 2;
    chooseButton.disabled = refreshButton.disabled = !!state.busy;
    testButton.disabled = !!state.busy || testing;
    testButton.textContent = testing ? 'Sending test sound…' : 'Test sound';
    dialog.setAttribute('aria-busy', String(!!state.busy));
    availability.textContent = !state.supported
      ? appleMobile
        ? 'For Sonos, choose your room in Control Center > AirPlay. Device output follows that selection. Sonos One supports AirPlay.'
        : 'Choose your speaker in the device sound settings. Device output follows that selection.'
      : devices.length < 2
        ? 'Only Device output is available to this page. Pair and select your speaker in the device sound settings. No microphone permission is needed.'
        : 'This list shows outputs your browser has made available. Device output follows your device sound settings.';
    status.textContent = localMessage || state.message || '';
    // Replacing native options should not move keyboard focus out of the list.
    if (focused && !select.disabled) select.focus();
  }

  function run(action, fallback, routingAction = true) {
    if (disposed) return;
    const generation = ++actionGeneration;
    localMessage = '';
    let pending;
    try {
      // Call before any await so a dedicated picker retains the click gesture.
      pending = action();
    } catch (error) {
      localMessage = routingAction && routing.snapshot().message || error?.message || fallback;
      refresh();
      return;
    }
    refresh();
    return Promise.resolve(pending).then(result => {
      if (disposed || generation !== actionGeneration) return;
      if (typeof result === 'string') localMessage = result;
      refresh();
    }, error => {
      if (disposed || generation !== actionGeneration) return;
      localMessage = routingAction && routing.snapshot().message || (error?.name === 'AbortError' ? 'Output selection cancelled.' : error?.message || fallback);
      refresh();
    });
  }

  function open() {
    if (disposed || dialog.open) return;
    returnFocus = doc.activeElement;
    refresh();
    dialog.showModal();
    close.focus();
    run(() => routing.refresh(), 'Could not refresh outputs. Use your device sound settings.');
  }
  listen(button, 'click', open);
  listen(close, 'click', () => dialog.close());
  listen(dialog, 'close', () => {
    if (!disposed) (returnFocus?.isConnected ? returnFocus : button).focus();
  });
  listen(select, 'change', () => run(() => routing.select(select.value), 'Could not change output.'));
  listen(refreshButton, 'click', () => run(() => routing.refresh(), 'Could not refresh outputs.'));
  listen(chooseButton, 'click', () => run(() => routing.choose(), 'Could not choose an output.'));
  listen(testButton, 'click', () => {
    if (testing || routing.snapshot().busy) return;
    testing = true;
    const task = run(() => onTestSound?.(), 'Test sound could not start.', false);
    Promise.resolve(task).finally(() => {
      testing = false;
      refresh();
    });
  });
  refresh();
  return {
    button, open, refresh,
    dispose() {
      if (disposed) return;
      disposed = true;
      if (dialog.open) dialog.close();
      for (const remove of listeners) remove();
      dialog.remove();
      button.remove();
    }
  };
}
