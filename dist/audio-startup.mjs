// iPhone browsers may use an ambient audio session that follows Silent Mode.
// Request music playback when supported, and resume synchronously inside the tap.
export function requestPlaybackSession(nav = globalThis.navigator) {
  try {
    if (!nav?.audioSession) return false;
    if (nav.audioSession.type !== 'playback') nav.audioSession.type = 'playback';
    return nav.audioSession.type === 'playback';
  } catch {
    return false; // Experimental API: unavailable/rejected must not block audio.
  }
}

// Starting an actual source in the gesture also primes the device output.
// This happens before module downloads or asynchronous graph construction.
export function primeAudioOutput(context) {
  try {
    if (!context?.createBufferSource || !context.createBuffer || !context.destination) return false;
    const source = context.createBufferSource();
    source.buffer = context.createBuffer(1, 32, context.sampleRate || 44100);
    source.connect(context.destination);
    source.onended = () => source.disconnect();
    source.start(0);
    return true;
  } catch {
    return false;
  }
}

export async function verifyAudioClock(context, delayMs = 250) {
  const start = context?.currentTime;
  await new Promise(resolve => setTimeout(resolve, delayMs));
  if (!context || context.state !== 'running') throw new Error('Audio is paused. Tap Restart audio.');
  if (!Number.isFinite(start) || !(context.currentTime > start + .001)) {
    throw new Error('Audio clock stopped. Tap Restart audio.');
  }
}

export function retireAudioContext(context) {
  if (!context) return;
  context.onstatechange = null;
  try { Promise.resolve(context.close()).catch(() => {}); } catch {}
}

export function playTestNotes(context, destination) {
  const osc = context.createOscillator(), gain = context.createGain(), now = context.currentTime;
  osc.type = 'sine';osc.frequency.setValueAtTime(440, now);osc.frequency.setValueAtTime(660, now + .3);
  gain.gain.setValueAtTime(0, now);gain.gain.linearRampToValueAtTime(.22, now + .02);
  gain.gain.setValueAtTime(.22, now + .15);gain.gain.linearRampToValueAtTime(0, now + .2);
  gain.gain.setValueAtTime(0, now + .3);gain.gain.linearRampToValueAtTime(.22, now + .32);
  gain.gain.setValueAtTime(.22, now + .45);gain.gain.linearRampToValueAtTime(0, now + .5);
  osc.connect(gain);gain.connect(destination);osc.start(now);osc.stop(now + .55);
  osc.onended = () => { osc.disconnect();gain.disconnect(); };
}

export function resumeFromTap(context, nav = globalThis.navigator, timeoutMs = 5000) {
  requestPlaybackSession(nav);
  if (!context || context.state === 'closed') return Promise.reject(new Error('Audio is closed. Reload the page, then tap Start sound.'));
  let resume;
  try {
    // Do not await a network request, worklet module or any other task first.
    resume = context.resume();
    primeAudioOutput(context);
  } catch (error) {
    return Promise.reject(error);
  }
  let timeout;
  const deadline = new Promise((_, reject) => {
    timeout = setTimeout(() => reject(new Error('The browser has not enabled audio. Tap Start sound again.')), timeoutMs);
  });
  return Promise.race([Promise.resolve(resume), deadline]).then(() => {
    if (context.state !== 'running') throw new Error(`Audio is ${context.state}. Tap Start sound again.`);
  }).finally(() => clearTimeout(timeout));
}
