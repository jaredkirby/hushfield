# Testing

## Build and Node checks

From the repository root, use Node.js 22 or newer; CI exercises Node 22 and 24:

```sh
npm ci
npm run build
npm test
```

`npm test` runs every `tests/*.test.mjs` file. Some files use individual Node tests, while earlier files run assertions as one file-level result; the reported count is not a count of every assertion. See [verification](../VERIFICATION.md) for the latest run.

`npm run test:interaction` is the fixed fast subset for project validation, stereo math, voice dots, startup, navigation, viewport profiles, selected-value controls and audio activation. Run the full suite for recording, recovery, source ownership, Piece routing/presets, Orbit or Tape changes.

For one area, run its existing file, for example:

```sh
node --test tests/piece-session.test.mjs tests/piece-presets.test.mjs
node --test tests/session-recovery.test.mjs tests/project-roundtrip.test.mjs
node --test tests/tape-impact.test.mjs tests/tape-dsp.test.mjs
```

Source files live in `dist/`. The build emits the main bundle and four standalone worklets under `dist/build/`, embeds the three early shell scripts into HTML and updates source hashes. Include those generated changes with a source change. After committing a synchronized source/build, rebuilding should leave `dist/` unchanged:

```sh
npm run build
git diff --exit-code -- dist/
```

CI runs install, build, full Node tests and this generated-file check on Node 22 and 24. It does not launch a browser, request a microphone, validate physical-device behavior or judge sound quality.

## Browser diagnostics

Serve `dist/` from localhost or HTTPS, then open the route below on that server. Do not open it as a `file:` URL or expect a GitHub source-file link to run it.

| Route | Start | What it checks |
| --- | --- | --- |
| `/qa-depth.html` | Run depth checks | Independent part room sends, filtered ambience, shared tone and modern return width using real offline WebAudio. |
| `/qa-musicality.html` | Render comparison / short check | Reproducible full-graph listening examples; requires `npm run listening:prepare` and the dedicated `npm run listening:serve` server. |
| `/qa-piece.html` | Run offline checks | Foundation-fed live Texture, shared tone/width, direct processor harmony and finite stereo output. |
| `/qa-synth.html` | Automatic | Orbit Worklet PCM, separate bank/item patches, effects, auditions, voice limits and stop behavior. |
| `/qa-tape.html` | Run offline Tape checks | 44.1/48 kHz Worklet startup, bypass, coloration, repeats and delivered toggles. |
| `/qa-ambient.html` | Automatic | Component-level Foundation/scene/voice rendering, stereo gesture changes and layer/audition routing. |
| `/qa-visuals.html` | Run analysis checks | Real stereo analyser input and the three dithered renderers; plays a short, quiet test signal. |
| `/qa-ambient-visual.html` | Automatic | Renderer-only timing samples at several canvas sizes. |

For example, with `npm start`, open `http://127.0.0.1:4878/qa-piece.html`. Piece, synth, Tape and ambient audio diagnostics render offline; a passing result does not establish that the device speakers work. Use the actual instrument, Test sound and listening checks for that.

Offline rendering can outrun MessagePort delivery. Diagnostic code must connect graphs before rendering and wait for processor readiness before sending initial commands. The piece diagnostic also yields while its offline context is suspended so harmony commands can settle; see the [integration review](INTEGRATION-REVIEW.md).

## UI and device checks

For layout/interaction changes, verify direct sliders, exact-entry Apply/Cancel, categorical menus, visual handles, keyboard controls and settings Undo/Redo. Check individual and All targets, including mixed values, and selection without audition. Confirm the separate Start/Stop button stays available. Verify the five editors plus Your sound / trim and Visual, including their secondary control sections and both Motion sound banks. Check portrait/landscape phones, iPad, narrow Split View and short desktop windows for scroll range, clipped controls, stable display bounds and overlap with Orbit triggers.

Play while navigating and rotating. Confirm that blend, selected settings, frozen material and voice-dot positions survive, with temporary Solo restored by Full mix. For persistence changes, test explicit recovery into a paused session, failed storage, newer edits during asynchronous work, and export/load with retained stereo material.

Use an isolated browser origin/unused port for generated recovery tests so you do not replace an existing draft. Recovery uses one database per origin, including the port; it is shared across paths on that origin.

For audio changes, listen on the affected devices as well as checking PCM. Browser emulation and offline samples do not establish touch feel, latency, frame delivery, battery use, actual microphone operation or background continuity.

## Evidence

`tests/*-results.json` files are recorded receipts, not live tests automatically executed by `npm test`. Preserve their implementation/hash/date context when citing them. Do not present a historical receipt as a new run.

[VERIFICATION.md](../VERIFICATION.md) identifies current automated results, the most recent integration audio receipt, later-product layout evidence and earlier adaptive-layout checks. The historical reviews retain their original baseline-specific counts.

## Musical expression and listening workflow

Focused behavior checks use the public Foundation/Orbit audio engines, preset selector, project export/decode and linked worklet interfaces:

```sh
node --test tests/foundation-expression.test.mjs tests/motion-expression.test.mjs tests/phrase-worklets.test.mjs tests/project-expression.test.mjs
npm run surge:verify
npm run listening:prepare
npm run listening:serve
```

Preparation needs npm dependencies and a Git checkout containing the original baseline commit; see [server prerequisites](../ops/README.md#listening-development-server). The dedicated server is loopback-only and stores WAVs/receipts under ignored `.scratch/listening/artifacts/`. Each run replaces the selected preset's receipt, including short checks. Use another checkout for fresh experiments when preserving a long listening set. Its fixture pins the original commit, generated module hashes and Grain randomness, and instruments deterministic control delivery. The main production worklets keep asynchronous direct ports and are checked separately. The full comparison includes four 75-second examples and a 180-second full arc; repeat rendering must retain exact control snapshots and stay within 1e-6 Float32 amplitude (0.033 PCM16 steps). Both WAV hashes are recorded; native WebAudio convolution can differ in its last floating-point bits. Playback attenuation equalizes stereo RMS without boosting/clipping, which is not a perceptual LUFS comparison. See [native authoring and listening details](SURGE-TEXTURE.md).

New save files use schema 5. Compatibility tests load versions 1–4 through decode, retain classic sound/depth modes, and preserve those modes after re-export. The [integration browser receipt](../tests/ui-music-integration-results.json) records explicit paused recovery of Color/Drift/Bloom, depth, brightness and native material. Classic Foundation checks render frozen pre-change sources and the current classic engine in the same runtime, requiring byte-identical Float32 PCM at 8, 44.1 and 48 kHz. The [fixture README](../tests/fixtures/foundation-classic-v1/README.md) records source provenance; never update those reference sources alongside the current engine. A single Node-22 PCM hash is not a portable Node-24 oracle because JavaScript math implementations can differ. Neutral Motion energy/PCM checks protect its classic behavior. Physical-device performance and human listening preference remain separate acceptance checks.
