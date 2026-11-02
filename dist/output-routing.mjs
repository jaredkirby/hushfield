const DEFAULT_OUTPUT = { deviceId: '', label: 'Device output' };

function aborted() {
  const error = new Error('The audio output request is no longer current.');
  error.name = 'AbortError';
  return error;
}

function unavailable() {
  const error = new Error('That speaker is unavailable. Choose Device output or reconnect it.');
  error.name = 'NotFoundError';
  return error;
}

function outputMessage(error) {
  if (error?.name === 'NotAllowedError') return 'Speaker access was denied. Use your device sound settings or try again.';
  if (error?.name === 'NotFoundError') return 'That speaker is unavailable. Choose Device output or reconnect it.';
  if (error?.name === 'AbortError') return 'Speaker selection was cancelled. The previous output is unchanged.';
  return 'Could not change or check the audio output. Use your device sound settings or try again.';
}

/** Session-only output routing. This controller never creates or resumes audio. */
export function createOutputRouting({
  mediaDevices = globalThis.navigator?.mediaDevices,
  supportsOutputSelection = typeof globalThis.AudioContext?.prototype?.setSinkId === 'function',
  onChange = () => {}
} = {}) {
  let disposed = false;
  let supported = !!supportsOutputSelection;
  let selectedId = '';
  let devices = [DEFAULT_OUTPUT];
  let message = '';
  let generation = 0;
  let lane = createLane(null);

  function createLane(context) {
    return { context, generation: ++generation, tail: Promise.resolve(), pending: 0, routeError: null, pendingIntent: null };
  }

  function snapshot() {
    return {
      supported,
      canChoose: supported && typeof mediaDevices?.selectAudioOutput === 'function',
      devices: devices.map(device => ({ ...device })),
      selectedId,
      selectedLabel: devices.find(device => device.deviceId === selectedId)?.label || 'Selected speaker',
      busy: !disposed && lane.pending > 0,
      message
    };
  }

  function emit() {
    if (!disposed) onChange(snapshot());
  }

  function assertCurrent(current) {
    if (disposed || current !== lane || current.generation !== generation) throw aborted();
    if (current.context?.state === 'closed') throw aborted();
  }

  function enqueue(current, operation) {
    if (disposed) return Promise.reject(aborted());
    current.pending++;
    emit();
    const result = current.tail.catch(() => {}).then(async () => {
      assertCurrent(current);
      return operation();
    }).catch(error => {
      if (!disposed && current === lane && current.generation === generation) {
        message = outputMessage(error);
        emit();
      }
      throw error;
    }).finally(() => {
      current.pending--;
      if (current === lane) emit();
    });
    // Keep a rejection handler attached even when callers discard a pending request.
    result.catch(() => {});
    const settled = result.then(() => snapshot());
    settled.catch(() => {});
    current.tail = settled;
    return settled;
  }

  async function enumerate(current) {
    if (!supported || typeof mediaDevices?.enumerateDevices !== 'function') return [DEFAULT_OUTPUT];
    const available = await mediaDevices.enumerateDevices();
    assertCurrent(current);
    const next = [{ ...DEFAULT_OUTPUT }], seen = new Set(['', 'default']);
    for (const device of available) {
      if (device.kind !== 'audiooutput' || !device.deviceId || seen.has(device.deviceId)) continue;
      seen.add(device.deviceId);
      next.push({ deviceId: device.deviceId, label: device.label || `Speaker ${next.length}` });
    }
    return next;
  }

  async function apply(current, deviceId) {
    assertCurrent(current);
    const context = current.context;
    if (context) {
      if (typeof context.setSinkId !== 'function') {
        if (deviceId) throw unavailable();
      } else if (context.sinkId !== deviceId || current.routeError) {
        await context.setSinkId(deviceId);
        assertCurrent(current);
      }
    }
    selectedId = deviceId;
    current.routeError = null;
  }

  async function updateDevices(current) {
    const next = await enumerate(current);
    assertCurrent(current);
    // Keep the last confirmed label until a disconnected route has been replaced.
    const previous = devices.find(device => device.deviceId === selectedId);
    devices = [...next];
    if (selectedId && !next.some(device => device.deviceId === selectedId)) {
      if (previous) devices.push(previous);
      try {
        await apply(current, '');
        devices = next;
        message = 'The selected speaker is unavailable. Using Device output.';
      } catch (error) {
        if (current === lane) current.routeError = error;
        throw error;
      }
    } else {
      message = '';
    }
    return next;
  }

  function refresh() {
    const current = lane;
    return enqueue(current, async () => {
      await updateDevices(current);
      return snapshot();
    });
  }

  function bindContext(context) {
    if (disposed) return Promise.reject(aborted());
    if (lane.context === context) {
      const current = lane;
      return current.tail.catch(() => {
        assertCurrent(current);
        if (current.routeError) throw current.routeError;
      }).then(() => {
        assertCurrent(current);
        if (current.routeError) throw current.routeError;
        return snapshot();
      });
    }
    // A first activation adopts its pending no-context selection queue. Its
    // original promise then confirms the physical switch instead of cancelling.
    // Real-context retirement still creates a lane with only confirmed state.
    const adoptedResult = context && !lane.context && lane.pendingIntent
      ? lane.tail.then(() => null, error => error) : null;
    if (adoptedResult) lane.context = context;
    else lane = createLane(context);
    const current = lane;
    if (!context) {
      emit();
      return Promise.resolve(snapshot());
    }
    supported = typeof context.setSinkId === 'function';
    return enqueue(current, async () => {
      const selectionError = adoptedResult ? await adoptedResult : null;
      try {
        await updateDevices(current);
        await apply(current, selectedId);
      } catch (error) {
        assertCurrent(current);
        if (!selectedId) {
          // Enumeration failure must not block ordinary default-device playback.
          // A real routing failure still rejects readiness.
          try {
            await apply(current, '');
            message = 'Speaker list unavailable. Using Device output.';
          } catch (defaultError) {
            current.routeError = defaultError;
            throw defaultError;
          }
        } else {
          try {
            await apply(current, '');
            message = 'The previous speaker could not be restored. Using Device output.';
          } catch (defaultError) {
            current.routeError = defaultError;
            throw defaultError;
          }
        }
      }
      if (selectionError) message = `${outputMessage(selectionError)} Using ${snapshot().selectedLabel}.`;
      return snapshot();
    });
  }

  function select(deviceId) {
    const current = lane;
    const id = deviceId === 'default' ? '' : deviceId;
    const intent = !current.context && typeof id === 'string' ? { deviceId: id } : null;
    if (intent) current.pendingIntent = intent;
    return enqueue(current, async () => {
      try {
        if (typeof id !== 'string') throw unavailable();
        if (id) {
          if (!supported) throw unavailable();
          const next = await enumerate(current);
          assertCurrent(current);
          if (!next.some(device => device.deviceId === id)) throw unavailable();
          devices = next;
        }
        await apply(current, id);
        message = id ? 'Speaker selected.' : 'Using Device output.';
        return snapshot();
      } finally {
        if (current.pendingIntent === intent) current.pendingIntent = null;
      }
    });
  }

  function choose() {
    if (disposed) return Promise.reject(aborted());
    if (!snapshot().canChoose) return Promise.reject(unavailable());
    const current = lane;
    let choice;
    // Invoke the browser picker synchronously in the caller's click handler.
    try { choice = Promise.resolve(mediaDevices.selectAudioOutput()); }
    catch (error) { choice = Promise.reject(error); }
    choice.catch(() => {});
    const intent = !current.context ? { choice } : null;
    if (intent) current.pendingIntent = intent;
    return enqueue(current, async () => {
      try {
        const device = await choice;
        assertCurrent(current);
        const id = device?.deviceId === 'default' ? '' : device?.deviceId;
        if (typeof id !== 'string') throw unavailable();
        if (id && !devices.some(output => output.deviceId === id)) {
          devices = [...devices, { deviceId: id, label: device.label || 'Selected speaker' }];
        }
        await apply(current, id);
        message = id ? 'Speaker selected.' : 'Using Device output.';
        return snapshot();
      } finally {
        if (current.pendingIntent === intent) current.pendingIntent = null;
      }
    });
  }

  const deviceChanged = () => { refresh().catch(() => {}); };
  mediaDevices?.addEventListener?.('devicechange', deviceChanged);

  function dispose() {
    if (disposed) return;
    disposed = true;
    generation++;
    mediaDevices?.removeEventListener?.('devicechange', deviceChanged);
  }

  return { snapshot, refresh, bindContext, select, choose, dispose };
}
