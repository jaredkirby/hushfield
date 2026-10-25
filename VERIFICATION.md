# Verification

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
