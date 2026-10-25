# Testing

## Build and Node checks

From the repository root, use Node.js 22 or newer:

```sh
npm ci
npm run build
npm test
```

`npm test` runs every `tests/*.test.mjs` file. The current suite reports 43 passing test results across 27 files: some files use individual Node tests, while earlier files run assertions as one file-level result. This is not a count of all individual assertions.

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
| `/qa-piece.html` | Run offline checks | Foundation-fed live Texture, shared tone/width, direct processor harmony and finite stereo output. |
| `/qa-synth.html` | Automatic | Orbit Worklet PCM, separate bank/item patches, effects, auditions, voice limits and stop behavior. |
| `/qa-tape.html` | Run offline Tape checks | 44.1/48 kHz Worklet startup, bypass, coloration, repeats and delivered toggles. |
| `/qa-ambient.html` | Automatic | Component-level Foundation/scene/voice rendering, stereo gesture changes and layer/audition routing. |
| `/qa-visuals.html` | Run analysis checks | Real stereo analyser input and the three dithered renderers; plays a short, quiet test signal. |
| `/qa-ambient-visual.html` | Automatic | Renderer-only timing samples at several canvas sizes. |

For example, with `npm start`, open `http://127.0.0.1:4878/qa-piece.html`. Piece, synth, Tape and ambient audio diagnostics render offline; a passing result does not establish that the device speakers work. Use the actual instrument, Test sound and listening checks for that.

Offline rendering can outrun MessagePort delivery. Diagnostic code must connect graphs before rendering and wait for processor readiness before sending initial commands. The piece diagnostic also yields while its offline context is suspended so harmony commands can settle; see the [integration review](INTEGRATION-REVIEW.md).

## UI and device checks

For layout/interaction changes, verify the five editors plus Your sound / trim and Visual, including their secondary control sections and both Motion sound banks. Check portrait/landscape phones, iPad, narrow Split View and short desktop windows for scroll range, clipped controls, stable display bounds and overlap with Orbit triggers.

Play while navigating and rotating. Confirm that blend, selected settings, frozen material and voice-dot positions survive, with temporary Solo restored by Full mix. For persistence changes, test explicit recovery into a paused session, failed storage, newer edits during asynchronous work, and export/load with retained stereo material.

Use an isolated browser origin/unused port for generated recovery tests so you do not replace an existing draft. Recovery uses one database per origin, including the port; it is shared across paths on that origin.

For audio changes, listen on the affected devices as well as checking PCM. Browser emulation and offline samples do not establish touch feel, latency, frame delivery, battery use, actual microphone operation or background continuity.

## Evidence

`tests/*-results.json` files are recorded receipts, not live tests automatically executed by `npm test`. Preserve their implementation/hash/date context when citing them. Do not present a historical receipt as a new run.

[VERIFICATION.md](../VERIFICATION.md) identifies current automated results, the most recent integration audio receipt, later-product layout evidence and earlier adaptive-layout checks. The historical reviews retain their original baseline-specific counts.
