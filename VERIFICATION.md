# Verification

## Current musical-expression candidate

The Surge-inspired candidate is implemented on `codex/surge-inspired-music`, from baseline `6e5c607a76f53021ed4bb016fdd5a42a43edd817`, in an isolated worktree. On 2026-10-25 (Pacific), the final `npm run build` left generated bundles unchanged and `npm test` passed **69 results across 32 files, zero failures**. `git diff --check` passed. The count includes individual Node tests and older file-level assertion suites, rather than every assertion.

New checks cover distinct preset/bank PCM, independent brightness contours, expressive Foundation timbre and bounded output, deterministic seed/block behavior, exact captured classic PCM, phrase development/pause/hold, returning motifs/rests, closer chord movement, linked worklet density changes without main-thread callbacks, schema-5 persistence and versions 1–4 compatibility, and genuine native Surge artifacts. Existing four-minute autonomous Foundation, recording, source-selection, recovery, Piece, Orbit and Tape suites also pass.

Fresh browser evidence is in [the candidate receipt](tests/surge-browser-results.json): **7** real offline depth checks, **5** production Piece audio checks, **20** viewport-only cases across phone/landscape/tablet/Split View/desktop, all three on-demand native sources, 44 seconds of muted live playback across navigation, and explicit paused recovery of new controls and imported material. Viewport emulation establishes layout; muted playback establishes clock/graph behavior, not speaker listening quality.

The [listening workflow](docs/SURGE-TEXTURE.md) pins the original Git sources and current module/harness hashes, renders real browser graphs, and discloses deterministic fixture transport/control delivery separately from production asynchronous-port checks. It records raw levels and WAV hashes, uses RMS attenuation without gain boosts, and checks repeated controls exactly plus Float32 output within 1e-6 (0.033 PCM16 steps). Browser convolution may vary in its last floating-point bits; byte identity is not claimed for the full graph.

The completed [listening receipt](tests/surge-listening-results.json) records four 75-second examples and a 180-second arc, plus independent WAV header/hash/level verification. Matched stereo RMS is approximately 0.015465 across all five, with peaks below 0.077. Baseline/full repeat maximum Float32 differences are 2.61e-8 / 2.24e-8; control snapshots match exactly. PCM16 repeat files can differ by one least-significant sample step at quantization boundaries; their differing hashes are recorded explicitly. The player was exercised through actual playback, reached 5.16 seconds, reported duration 75 seconds without media errors, and was left paused. The delivery server gained length/range headers afterward; the receipt records that separate delivery hash and preserves the actual render provenance.

The [independent review](docs/SURGE-MUSICALITY-REVIEW.md) records Standards and Spec separately, including a nonblocking duplication suggestion. Human musical preference and physical-device acceptance remain open.

The earlier main-branch check below remains historical evidence: documentation at `758f0e0` passed 43 Node results, and its [CI run](https://github.com/jaredkirby/hushfield/actions/runs/40230745513) passed Node 22 and 24. That CI run does not validate this candidate branch.

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
