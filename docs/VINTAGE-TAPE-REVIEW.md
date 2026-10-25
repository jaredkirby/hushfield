# Warm vintage Tape review

Scope: [warm vintage Tape and responsive cassette](specs/vintage-tape.md), [issue #13](https://github.com/jaredkirby/hushfield/issues/13). Baseline: 9b5442c. Implementation: 13d3ee3 and 44253d6. Local commits only; no push or deployment.

## Result

New-piece Tape defaults use Drive 16%, Wow 10%, Flutter 6%, Hiss 4%, Tone 42%, echo Mix 16% and Feedback 28%, retaining the 0.36-second delay. Tape still starts bypassed. The full control range and saved project values remain unchanged. Worn memory explicitly retains its original stronger Tape settings.

The cassette path sways slowly with Wow and develops finer, faster ripples with Flutter. Sound and illustration share the modulation curves; visual displacement is enlarged for legibility. Drive and signal level shape the head's brightness, while Mix and Feedback determine fading echo trails. The illustration represents controls and signal level rather than measured processor telemetry. Reel/path movement freezes while stopped, bypassed or under reduced motion, retaining the existing draw cap.

## Standards

The independent review found no material findings. It confirmed bounded audio/render work, OLED styling, shared routing, saved settings, true bypass and stopped/reduced-motion behavior. Seven focused results passed independently. The preset correction was also covered by the subsequent Spec recheck.

## Spec

The first independent review found one preservation gap: Worn memory inherited the new Feedback and Tone. Explicit overrides now preserve Feedback 38% and Tone 35%; a public preset regression failed before the fix and passed afterward. Final Spec disposition: no remaining material findings. Eight focused results passed independently.

## Verification

- Build and full Node suite: 43 passed, 0 failed. New rendered-PCM coverage requires mild 0.5-2.5% third harmonic on a quiet test sine and pitch variation below 40% of the previous pronounced default, while existing tests retain the stronger range, bypass and feedback checks.
- Actual browser Worklet: 10 checks passed across 44.1 and 48 kHz for startup, true bypass, default PCM change, repeats and delivered toggle messages. The tested Tape Worklet is unchanged by the subsequent preset-only correction; its hash is in the receipt.
- Actual cassette: screenshot regions changed during enabled playback at default and raised Wow/Flutter settings. Reel and path regions stayed identical after settling in bypass, pause and emulated reduced motion. Reduced-motion emulation was cleared afterward.
- Six Tape viewport cases passed from 320 x 568 through 1440 x 900, with no document overflow or clipped buttons/selects. Playback controls and settings remained available through resizing.
- Final app preview: warm defaults restored, Tape enabled, playback paused. No console warnings or errors recorded. The existing preview origin and its recovery draft were left alone; generated checks used isolated port 4882.
- `git diff --check` passed.

Receipt: tests/vintage-tape-browser-results.json. Default screenshot: docs/images/vintage-tape.jpg. Raised Wow/Flutter example: docs/images/tape-wobble.jpg. Physical-device and subjective listening acceptance of the gentler default remain with the player.
