# Verification

Latest vintage Tape verification: **43 Node tests, 10 browser Tape audio checks and six Tape layout cases passed**, plus live/default, strong, bypassed, paused and reduced-motion cassette checks. Independent Standards and Spec rechecks found no remaining material findings. See [the vintage Tape review and acceptance limits](docs/VINTAGE-TAPE-REVIEW.md) and tests/vintage-tape-browser-results.json.

The earlier stronger Tape iteration passed 41 Node tests, 10 browser audio checks and six Tape layout cases. See [the prior Tape review](docs/TAPE-REVIEW.md) and tests/tape-browser-results.json.

Earlier Ambient-first verification passed 38 Node tests, 27 browser audio checks and 104 browser layout cases. See [the prior review](docs/PIECE-REVIEW.md) and tests/piece-browser-results.json. These are automated/emulated checks; physical-device and subjective listening acceptance remain separate.

## Automated checks

Run `npm ci`, `npm run build` and `npm test` with Node.js 22 or newer. The suite covers:

- Finite audible granular/ambient PCM at 44.1/48 kHz, pitch, reverse, freeze, pause and bounded voice counts.
- Four-minute seeded harmonic evolution, chord hold/resume, scene changes and independent layers.
- Tape timing, feedback decay, saturation, treble loss and continuous wow/flutter.
- Rotating boundaries, trigger timing, shape edits, containment and sustained bouncing across 90 two-minute configurations.
- Separate trigger/ball patches, validation, project migration and stereo analysis.
- Phone/iPad/desktop identity, rotation, Split View, safe areas, visible viewport sizing and pinch zoom.
- Direct-touch/click/keyboard navigation, startup states, current build hashes and audio-context recovery.

The browser diagnostic pages in `dist/qa-*.html` exercise Web Audio nodes, worklets and dithered renderers. Some require a button press and play a short signal.

## Browser and device evidence

The latest adaptive layout was checked in browser emulation across 112 main-view cases and 96 editor-bank cases. No document overflow, editor overflow or clipped buttons/selects remained in those checks. The sizes include portrait/landscape phones, landscape/portrait iPad, Split View and desktop windows. Musical edits and playback survived orientation and layout changes. See `tests/adaptive-layout-results.json`.

Earlier receipts cover voice-dot interaction, startup status and the scope/spectrum/vector modes. Physical iPhone audio playback and recovery have been confirmed. The latest iPad layout, touch feel, listening quality and frame rate still need physical-device acceptance. Microphone hardware and uninterrupted locked-screen/background playback are not verified.

The committed screenshots illustrate the interface; they are not proof of physical device performance. CI checks Node behavior and build consistency, not browser rendering or subjective sound quality.

## Reliability iteration (2026-10-25)

The approved scope and test seams are recorded in [the spec](docs/specs/reliability.md) and [GitHub issue #1](https://github.com/jaredkirby/hushfield/issues/1). Added behavior checks cover microphone permission/cancellation/cleanup, session-labelled output finalization and exact frame limits, stale sample selection, real stereo WAV project roundtrips, scan-mode transitions, Orbit PCM/timing at 44.1/48 kHz, storage failure and late-write behavior, processor-error retirement, layer levels, and paused/capped drawing.

Browser offline audio verification checks the worklet-backed Orbit graph and its independent banks, voice parameters, envelopes, stereo routing, delay/reverb tails and voice limits. An agent-created browser session stored a generated-demo draft with Orbit at 5%; a new tab offered recovery, and explicit recovery restored 5% while keeping playback paused. These are automated/emulated checks, not physical microphone or listening acceptance. The final check passed 33 automated tests, 22 browser offline-audio checks and 74 viewport/editor cases. See tests/reliability-browser-results.json for the final viewport receipt and docs/RELIABILITY-REVIEW.md for the review disposition.

Orbit now renders oscillators and envelopes in its worklet. Its controls and per-bank effects are retained, but listening comparison, latency/touch feel and CPU/battery acceptance on physical iPhone/iPad are still required. No claim of locked-screen/background continuity is added.
