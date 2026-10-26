# Verification

## RE-201-inspired Tape candidate

The Space Echo model adds the original twelve head/spring selections, one shared tape-speed history, filtered saturated feedback and a parallel synthetic spring. The [research](docs/research/re201-space-echo.md) separates original hardware evidence from our designed approximations. Existing projects without an explicit model and Worn memory retain Classic.

Fresh local checks on 2026-10-26 passed build and all 121 Node test results. New tests cover head arrivals, spring timing/decay, feedback, pitch settling and repeat spectra at 44.1 and 48 kHz. A frozen original Tape fixture requires exact Classic stereo PCM at 8, 44.1 and 48 kHz in the same runtime. Model-switch stress includes 8, 44.1, 48 and 96 kHz; rapid reversal has its own continuity regression.

Fresh browser checks passed ten real OfflineAudioContext/Worklet assertions at 44.1 and 48 kHz. Native model/head menus, Undo/Redo, exact Spring level entry, muted live playback, phone portrait and short landscape reachability, and explicit recovery into a paused session were exercised. The recovered draft retained Space Echo, mode 11, Spring level 37%, Tape On and master volume zero. Browser logs showed no warnings or errors during these checks. [Recorded receipt](tests/re201-browser-results.json).

The [private comparison](https://kirbys-mac-mini.tailac5a2a.ts.net:8450/qa-space-echo.html?saved) contains five synthesized 16-second WAVs. Their hashes and the source/harness hashes were verified after rendering through the built Worklet. The [preview guide](docs/PRIVATE-PREVIEW.md#space-echo-candidate) identifies the separate service and checkout. These checks do not establish a measured hardware match, physical-device performance or human listening approval. Earlier evidence below retains its original revision and counts.

## Merged baseline

[PR #22](https://github.com/jaredkirby/hushfield/pull/22) merged the musical-expression
and direct-control UI work into `main` at
`17794182f53d3175f88230200d83a734a58051e6` on 2026-10-25 (Pacific).
Both source histories are retained: UI `0647c22` and music `aee4ff6`.
The documentation refresh describes that committed implementation; later local
experiments are outside this baseline.

The [post-merge CI run](https://github.com/jaredkirby/hushfield/actions/runs/40269509243)
passed build, **99 Node test results across 39 files**, and the generated-file
consistency check on Node 22 and 24. PR security checks also passed. Test results
include individual tests and older file-level suites; this is not a count of every
assertion. CI does not run browser diagnostics or judge musical quality.

Classic Foundation compatibility uses frozen pre-change sources from `6e5c607`
and requires exact Float32 PCM at 8, 44.1 and 48 kHz in the same runtime. A Node 22
hash is not used as a Node 24 oracle: the unchanged original engine also differs
between those V8 runtimes. The [fixture record](tests/fixtures/foundation-classic-v1/README.md)
pins the source bytes. Full browser graphs use the separate repeat tolerance below.

## Combined browser and listening evidence

The final [integration record](docs/UI-MUSIC-INTEGRATION.md) and
[browser/preservation receipt](tests/ui-music-integration-results.json) record:

- 7 Depth and 5 Piece offline audio checks.
- 20 affected-control layout cases and 35 verified editor/tool navigation cases
  across phone portrait, short landscape, tablet, Split View and desktop.
- 92 seconds of muted three-part playback through navigation and viewport changes,
  followed by a normal pause, with no observed browser warnings/errors.
- Exact-entry Undo/Redo, mixed All Brightness values, Depth editing, native imports
  and explicit paused recovery. The separate Start/Stop remains; paused overlays
  and the transport waveform are disabled.

These are recorded integration checks, not fresh physical-device measurements.
The [short integrated render receipt](tests/ui-music-listening-smoke-results.json)
checks the combined graph separately from the original long musical comparisons.

The [long listening receipt](tests/surge-listening-results.json) records four
75-second comparisons and a 180-second arc, stereo PCM16 at 48 kHz. The saved WAVs
retain their original hashes and render provenance. They compare the researched
baseline and music implementation; they were not rerendered after the UI merge.
Matched stereo RMS is approximately 0.015465, with peaks below 0.077. Repeated control
snapshots match exactly. Full-graph Float32 output is checked within 1e-6 (0.033 PCM16
steps); observed baseline/full maxima were 2.61e-8 / 2.24e-8. PCM16 repeats can differ
by one least-significant sample step at quantization boundaries. Browser convolution
is not claimed to be byte-identical.

The saved player was exercised through actual playback and left paused. The
[private preview receipt](tests/tailscale-preview-results.json) records private HTTPS,
range responses, origin checks and saved artifact verification. The merged preview's
HTML, application/worklet assets and long WAV hashes were checked again during
promotion; see the integration record. [Preview operations](docs/PRIVATE-PREVIEW.md)
explains access and its service/artifact dependencies.

Independent [music](docs/SURGE-MUSICALITY-REVIEW.md) and integration reviews found no
blocking issues; the music review retains one accepted nonblocking duplication
heuristic. Technical checks do not close the parent musical-preference acceptance.

## Earlier evidence

Historical counts and screenshots belong to the source baseline named by each
record. They establish their original scope, rather than validating every later UI.

| Scope | Recorded result | Evidence |
| --- | --- | --- |
| UI development and reversions | Source-branch checks, superseded artwork, waveform and playback-overlay experiments | [UI history](docs/UI-HISTORY.md) |
| Music branch before integration | 69 Node results across 32 files; 7 Depth, 5 Piece and 20 viewport checks | [Music review](docs/SURGE-MUSICALITY-REVIEW.md), [browser receipt](tests/surge-browser-results.json) |
| Earlier merged main `758f0e0` / PR #14 | 43 Node results across 27 files; Node 22/24 CI passed | [CI run](https://github.com/jaredkirby/hushfield/actions/runs/40230745513), [integration review](docs/INTEGRATION-REVIEW.md) |
| Earlier integrated audio graph | 37 unique browser checks: 10 Tape, 22 Orbit and 5 Piece; readiness-gated Piece diagnostic passed five consecutive runs | [Receipt](tests/integration-browser-results.json) |
| Earlier Piece navigation/layout | 104 cases: 42 main/tool views, 30 secondary sections and 32 Motion bank/section cases | [Piece review](docs/PIECE-REVIEW.md), [receipt](tests/piece-browser-results.json) |
| Warm vintage Tape | 10 browser audio checks, 6 Tape viewport cases and cassette motion/bypass/paused/reduced-motion checks | [Review](docs/VINTAGE-TAPE-REVIEW.md), [receipt](tests/vintage-tape-browser-results.json) |
| Earlier reliability UI/audio | 22 Orbit audio checks and 74 main/editor layout cases, including paused recovery | [Review](docs/RELIABILITY-REVIEW.md), [receipt](tests/reliability-browser-results.json) |
| Earlier adaptive layout | 112 main views and 96 editor groups before the five-editor Piece redesign | [Receipt](tests/adaptive-layout-results.json) |

## Documentation review

The documentation refresh from `1779418` audited all 32 Markdown documents,
including the agent routes and regression-fixture README. Relative file links and
Markdown heading anchors were checked, with 166 valid references and no broken
links. A fresh install, build and full Node 22 suite passed 99 results; rebuilding
left production assets unchanged. The documented listening preparation command
succeeded in the isolated checkout, and a temporary server on unused port 4892
served the comparison page, baseline/current fixture configs and build manifest
with HTTP 200 before being stopped. The shared preview and retained listening
artifacts were not changed. This checks documentation commands, not new browser,
listening or device acceptance.

## Reproduction and acceptance limits

Run `npm ci`, `npm run build` and `npm test` with Node.js 22 or newer. CI covers
Node 22 and 24. Serve `dist/` over localhost or HTTPS for AudioWorklet and microphone
support. [Testing](docs/TESTING.md) documents diagnostic routes and their execution;
[Surge and listening comparisons](docs/SURGE-TEXTURE.md) documents preparation,
source reproduction and retained comparison artifacts. Recorded JSON receipts are
historical data and are not automatically regenerated by `npm test`.

Browser emulation establishes layout. Muted playback establishes graph/clock behavior.
Offline PCM establishes numerical behavior. None establishes speaker listening quality,
physical touch feel, latency, sustained frame rate, CPU/battery use or microphone
hardware. Earlier reported iPhone playback/recovery does not establish acceptance of
the merged UI and music. Those checks remain open on the intended phone/tablet.
Uninterrupted locked-screen/background playback is not guaranteed.
