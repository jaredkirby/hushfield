# Architecture

Hushfield is a static browser instrument. It has no application server, remote synthesis service or runtime package CDN.

## Entry points and build

`dist/index.html` loads the styles and embeds three early scripts: `phone-shell.js`, `page-navigation.js` and `boot.js`. Viewport sizing and navigation are available before the main instrument has downloaded. Startup reports LOADING, READY or LOAD ERROR and keeps unavailable editors inert.

`ops/build.mjs` bundles `app.js` and the ambient, grain, tape and Orbit worklet entry points into `dist/build/`. Relative import version queries are normalized while bundling so stateful modules remain singletons. `ops/build-shell.mjs` refreshes the embedded scripts. `dist/build/manifest.json` records source hashes for the startup/build regression check.

Sources intentionally live alongside the shipped page in `dist/`. Do not replace the bundled main entry with the unbundled module graph; the bundle avoids a previously observed mobile startup failure.

## Audio

`app.js` owns the AudioContext, master routing, transport, sample state and worklet lifecycle. `audio-startup.mjs` primes/resumes output synchronously from a tap, verifies the clock and provides recovery.

- `grain-worklet.js` renders granular samples and captures post-effects PCM for WAV export.
- `ambient-dsp.mjs` and `ambient-worklet.js` render evolving chord voices, melodies and air on the audio thread. `ambient-settings.mjs` defines scenes and harmony.
- `orbit-worklet.js` and `orbit-dsp.mjs` advance the rotating-boundary simulation and render ball/trigger voices from the sample clock. `orbit-physics.mjs` and `orbit-pads.mjs` retain the fixed-step physics and trigger geometry. `orbit-audio.mjs` routes twelve stereo dry/delay/room sends through independent normal/audition bank effects. Main-thread snapshots update the display; animation frames never schedule notes.
- `tape-dsp.mjs` and `tape-worklet.js` implement shared stereo Tape before the master limiter/volume. Off bypasses the complete effect at the existing 0.75 dry reference gain. On crossfades over 35 ms into a short, continuously modulated record-head path (nominal 8 ms), quiet-input saturation, tone and darker echo repeats. Separate bounded direct/echo rings avoid feeding direct modulation back into the repeat loop. Feedback remains contractive and hiss is input-envelope gated. `tape-settings.mjs` shares warm vintage new-session defaults with the app while retaining the stronger control range; saved settings are preserved. `tape-motion.mjs` supplies the Wow/Flutter curves shared with the cassette illustration. Constructor settings and a ready acknowledgement prevent lost cold-start parameters.

The piece model owns Foundation/Texture/Motion blend levels, Texture source and harmony following. Play controls the complete piece; transient solo leaves saved levels unchanged and no playback rule depends on the active editor. Foundation feeds a four-second stereo ring in the grain Worklet before its audible fader. Freezing copies that bounded recent phrase into the existing sample representation. Live capture pauses with transport and imports/microphone/frozen phrases obey latest-selection ownership.

Foundation and Motion processors exchange chord pitch classes through a dedicated MessageChannel after both acknowledge readiness. Motion quantizes new notes to current chord tones unless explicitly unlinked; existing sustained voices finish normally. Processor readiness also replays initial grain state and queues Motion commands so cold-start messages are not lost.

Normal Foundation, Texture and Motion levels enter one shared tone/stereo-width/reverb bus before Tape and the master limiter. Individual Motion banks retain their own sound/effects settings. Explicit individual auditions bypass the part fader but enter shared finishing. Source preview is separate, labelled original audio, and stops the piece. Test sound can use the master without waiting for worklets. Restart retires the old context and reconstructs the output within a fresh gesture while preserving session settings. `audio-lifecycle.mjs` guards processor failures and shares complete graph disposal between startup failure and Restart. Each graph publishes readiness after activation succeeds.

## Interaction and rendering

`phone-ui.mjs` implements parameter selection, common increments and editor panels on every device. `phone-shell.js` distinguishes device identity from layout width: iPad desktop-mode identity is supported, while narrow Split View uses the compact surface. `adaptive.css` adds the wide display/editor arrangement after the OLED styles.

`ambient-interaction.mjs` turns voice-dot gestures into bounded pitch/pan edits. `ambient-points.mjs` aligns motion with audio output timestamps. Ambient, scope, spectrum and vector draw on browser animation frames; trails and peak decay use elapsed time. `oled-visuals.mjs` applies screen-stable Bayer dithering.

`render-clock.mjs` caps expensive drawing at 30 fps and skips unchanged paused frames. User edits, layout changes, and audio snapshots invalidate the view. Layer levels occupy a reserved display bay so controls do not cover Orbit triggers.

`visual-analysis.mjs` captures independent stereo channels from a passive post-master branch. It mixes spectrum energy rather than summing opposite-phase waveforms. `audio-visuals.mjs` owns the three display modes and display-only controls.

## Persistence

`project-file.mjs` serializes complete sessions, validates version 1–4 project files, migrates earlier physics namespaces and restores a version 4 piece model. Files embed WAV Texture material, Foundation voices, blend/source/harmony relationships, parameters, patch banks and visual settings. Legacy projects retain their material and blend levels with independent Motion tuning; solo is never saved. `sample-selection.mjs` gives each import, project or microphone take ownership of its result; newer selections invalidate older decodes. Audio decoding can use an OfflineAudioContext without starting playback.

`session-recovery.mjs` stores a single bounded 30 MiB recovery draft in IndexedDB. Existing drafts are offered explicitly and are not overwritten until the player chooses. The UI distinguishes unsaved changes, saving, a local draft, an initiated export, and storage failure. Browser quota, tab eviction, storage clearing, and multiple tabs can still affect recovery; downloaded project files remain the portable copy.

## Checks

Node tests render PCM and exercise state, math, physics and interaction contracts. `qa-*.html` pages run browser-specific audio/render checks. Layout receipts in `tests/*-results.json` record past emulated viewport checks; they are evidence snapshots, not hardware acceptance or tests that run during `npm test`.

## Recording

`microphone-take.mjs` owns each take, including late permission results, recorder events, timers and track cleanup. Pending requests can be cancelled. `output-capture.mjs` waits for a session-labelled worklet completion before accepting a replacement take. The capture worklet enforces its own five-minute frame limit, transfers PCM chunks, and the controller encodes them incrementally with `wave-file.mjs`, avoiding multiple full-length floating-point copies.

## Product model

See [the glossary](../GLOSSARY.md) and [approved Ambient-first scope](specs/ambient-first.md). Stable internal page IDs retain older deep links; five main editors expose Foundation, Texture, Motion, Space and Tape. Source editing and Visual are secondary tools.
