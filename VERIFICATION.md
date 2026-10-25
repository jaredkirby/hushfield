# Verification

## Current code and fresh checks

Documentation was checked against **main at `758f0e0`**, the merged [integration PR #14](https://github.com/jaredkirby/hushfield/pull/14), on 2026-10-25. A fresh local `npm run build` and `npm test` passed **43 Node test results across 27 files**, with no shipped-asset changes after rebuilding. The [main-branch CI run](https://github.com/jaredkirby/hushfield/actions/runs/40230745513) passed on Node 22 and 24 at that revision.

These automated checks cover rendered granular/Foundation PCM, live Foundation-to-Texture capture, Piece levels/Solo/presets, Motion harmony and sample-clock timing, independent banks, warm/strong Tape and true bypass, recording ownership, source selection, project migration/roundtrip, recovery races/errors, viewport profiles, navigation, startup and build consistency. The count includes individual Node tests and older file-level assertion suites; it is not a count of every assertion.

This refresh changes documentation only. Browser receipts below are existing recorded results, not new browser runs performed during this documentation pass.

## Recorded browser evidence

| Scope | Recorded result | Evidence |
| --- | --- | --- |
| Integrated audio graph | 37 unique checks: 10 Tape, 22 Orbit and 5 Piece checks. The readiness-gated Piece diagnostic passed five consecutive runs. | [Integration review](docs/INTEGRATION-REVIEW.md), [receipt](tests/integration-browser-results.json) |
| Current Piece navigation/layout | 104 cases: 42 main/tool views, 30 secondary sections and 32 Motion bank/section cases across compact/regular phones, landscape, Split View, tablet and desktop. | [Piece review](docs/PIECE-REVIEW.md), [receipt](tests/piece-browser-results.json) |
| Warm vintage Tape | 10 browser audio checks, 6 Tape viewport cases, plus enabled/default/raised-control, bypassed, paused and reduced-motion cassette checks. | [Vintage Tape review](docs/VINTAGE-TAPE-REVIEW.md), [receipt](tests/vintage-tape-browser-results.json) |
| Earlier reliability UI/audio | 22 Orbit audio checks and 74 main/editor layout cases, including explicit paused recovery and layer controls. | [Reliability review](docs/RELIABILITY-REVIEW.md), [receipt](tests/reliability-browser-results.json) |
| Earlier adaptive layout | 112 main views and 96 editor groups before the five-editor Piece redesign. This verifies that earlier viewport implementation, not the current navigation. | [Receipt](tests/adaptive-layout-results.json) |

Historical review counts belong to their recorded baselines. The stronger initial Tape defaults in the [Tape review](docs/TAPE-REVIEW.md) were superseded by warm vintage new-session settings; the stronger control range and Worn memory remain available. The [documentation index](docs/README.md) separates current guides from these scope/review records.

## Browser diagnostics and reproduction

Run `npm ci`, `npm run build` and `npm test` with Node.js 22 or newer. Serve `dist/` from localhost/HTTPS for browser checks. [Testing](docs/TESTING.md) lists each `qa-*.html` route, whether it starts automatically and which diagnostics use offline rendering or a live signal.

Offline processor output, renderer timing and browser-emulated layouts are different evidence types. CI runs Node/build checks; it does not run these browser pages or verify listening quality. Recorded JSON receipts are not automatically rerun by `npm test`.

## Physical-device acceptance

Physical iPhone audio playback/recovery was confirmed earlier. That confirmation does not establish acceptance of later Orbit rendering, Piece routing, warm vintage Tape, or the latest UI on every device.

Current iPad/phone touch feel, latency, sustained frame rate, CPU/battery use, microphone hardware and subjective listening still need physical-device checks. Uninterrupted locked-screen/background playback is not guaranteed. Screenshots illustrate layout and settings; they do not prove device performance.
