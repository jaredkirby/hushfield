# Architecture

Hushfield is a static browser instrument. It has no application server, remote synthesis service or runtime package CDN.

## Entry points and build

`dist/index.html` loads the styles and embeds three early scripts: `phone-shell.js`, `page-navigation.js` and `boot.js`. Viewport sizing and navigation are available before the main instrument has downloaded. Startup reports LOADING, READY or LOAD ERROR and keeps unavailable editors inert.

`ops/build.mjs` bundles `app.js` and the ambient, grain and tape worklet entry points into `dist/build/`. Relative import version queries are normalized while bundling so stateful modules remain singletons. `ops/build-shell.mjs` refreshes the embedded scripts. `dist/build/manifest.json` records source hashes for the startup/build regression check.

Sources intentionally live alongside the shipped page in `dist/`. Do not replace the bundled main entry with the unbundled module graph; the bundle avoids a previously observed mobile startup failure.

## Audio

`app.js` owns the AudioContext, master routing, transport, sample state and worklet lifecycle. `audio-startup.mjs` primes/resumes output synchronously from a tap, verifies the clock and provides recovery.

- `grain-worklet.js` renders granular samples and captures post-effects PCM for WAV export.
- `ambient-dsp.mjs` and `ambient-worklet.js` render evolving chord voices, melodies and air on the audio thread. `ambient-settings.mjs` defines scenes and harmony.
- `orbit-physics.mjs` advances the fixed-step rotating-boundary simulation. `orbit-pads.mjs` computes trigger crossings, and `orbit-audio.mjs` renders independently editable ball/trigger banks.
- `tape-dsp.mjs` and `tape-worklet.js` implement the shared stereo tape echo. The master limiter/volume follow it.

Sample and Orbit layers feed the shared output; each bank retains its own sound/effects settings. Test sound can use the master without waiting for worklets. Restart retires the old context and reconstructs the output within a fresh gesture while preserving session settings.

## Interaction and rendering

`phone-ui.mjs` implements parameter selection, common increments and editor panels on every device. `phone-shell.js` distinguishes device identity from layout width: iPad desktop-mode identity is supported, while narrow Split View uses the compact surface. `adaptive.css` adds the wide display/editor arrangement after the OLED styles.

`ambient-interaction.mjs` turns voice-dot gestures into bounded pitch/pan edits. `ambient-points.mjs` aligns motion with audio output timestamps. Ambient, scope, spectrum and vector draw on browser animation frames; trails and peak decay use elapsed time. `oled-visuals.mjs` applies screen-stable Bayer dithering.

`visual-analysis.mjs` captures independent stereo channels from a passive post-master branch. It mixes spectrum energy rather than summing opposite-phase waveforms. `audio-visuals.mjs` owns the three display modes and display-only controls.

## Persistence

`project-file.mjs` validates version 1–3 project files and migrates earlier physics namespaces. Saves embed the audio sample as WAV data, ambient voices, parameters, patch banks and visual settings. Sessions remain in memory until downloaded; no automatic remote persistence exists.

## Checks

Node tests render PCM and exercise state, math, physics and interaction contracts. `qa-*.html` pages run browser-specific audio/render checks. Layout receipts in `tests/*-results.json` record past emulated viewport checks; they are evidence snapshots, not hardware acceptance or tests that run during `npm test`.
