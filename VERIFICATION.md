# Verification

## Focus and calm candidate

The isolated `codex/focus-and-calm` candidate starts from `f9311ef` and preserves concurrent Foundation Waves/stars work alongside the newer merged Space and Tape implementations. It adds Reset to defaults in all five sound editors, one-step Undo, a short reset fade and direct Tape-artwork gestures. Tape can evolve silently while stopped or bypassed, with labelled preview and reduced-motion handling. Playback intent now survives browser interruptions while explicit Stop, system pause and paused project loading take precedence over stale activation or source-audition results.

The build and all 252 Node tests passed on 2026-10-27. Regression coverage includes actual app functions for reset isolation/history locks and asynchronous playback/source-loading races. Independent reviews found those races before final validation; the fixes passed the added regressions.

[Browser evidence](tests/focus-browser-results.json) records all five editors at four viewport sizes, Reset/Undo, Tape keyboard and drag edits while stopped, silent animation, reduced motion, live reset and explicit Stop. Browser audio diagnostics passed five Piece, ten Tape and 36 Foundation checks. No warnings or errors were observed during the main UI checks. The [screenshot](docs/images/focus-tape-candidate.jpg) shows Tape's interactive artwork and reset control.

Viewport checks are emulation and live UI playback used master volume zero. Human visual/listening approval, real touch and 60-minute physical-device playback remain open. Browser APIs cannot reliably identify interruption cause, so locked-screen continuation, call resumption and competing-media behavior require the [device checklist](docs/PLAYBACK-DEVICE-CHECK.md). A broader calm-default/range pass remains pending. This candidate is not evidence that the full product direction is complete.

## Space release verification

The final Space revision passed the build and all 194 Node test results on 2026-10-27. Fresh sessions and Whole piece presets select Plate; saved models, malformed-file fallback and versions 1–6 retain their compatibility behavior. Fresh browser startup showed Plate selected with its controls enabled and no console warnings or errors.

The approved Plate display uses a movable absorber above one vibrating sheet. Separation changes Decay only. Chamber keeps the rippling rebound tube, expands it to the square viewing bounds and carries waves into the center with a slower final drift. Earlier receipts below describe their recorded revisions and are historical evidence. Physical-device performance and hardware authenticity remain separate from automated verification.

## Interactive Space visual candidate

The 2026-10-27 visual revision adds two draggable Plate surfaces. Separation adjusts Decay and Pre-delay together, with a single Undo/Redo entry. Measured wet activity launches travelling reflections and surface ripples; Spring and Chamber also gain trails and depth. Existing DSP and saved parameter formats are unchanged. The individual controls remain available.

The full existing suite passed 193 results, followed by the final build and consistency checks. [Browser observations](tests/space-plates-browser-results.json) cover native dragging, grouped Undo/Redo, keyboard bounds, five viewport sizes and static reduced-motion frames. GPT-6.1 Sol review found keyboard-direction and cancellation-refresh issues, both fixed. Interrupted physical touch and visual preference still require user testing. This remains a separate candidate.

## Vintage Space candidate

The isolated `codex/vintage-space` candidate centers Space on Original room, Plate, Spring and Chamber. Reverb exposes Amount, Decay, Pre-delay, Tone and Reverb width; Depth retains per-part sends and Filter retains whole-piece tone/width. The model illustrations respond to measured wet energy and respect reduced motion. Fresh startup keeps Chorus synth, Stillwater, Space Echo On and Original room.

The build and full Node suite passed all 193 results. Schema 7 round trips all models and settings, accepts versions 1–7 and forces versions 1–6 to Original room while retaining their Foundation and Tape modes. The frozen original graph is compared against current output in the same browser runtime. The [research](docs/research/vintage-space.md) explains the plate diffusion tank, spring dispersion and chamber reflection design and separates these approximations from hardware evidence.

[Audio evidence](tests/vintage-space-audio-results.json) records 45 passing native WebAudio checks, including exact Original room PCM in legacy and Depth routing at 12, 44.1 and 48 kHz; independent model controls; zero-Amount dry preservation; long tails; repeated selection continuity; latest selection after suspended recovery; and the complete Foundation → Space → Space Echo path. A regression caught a paused-slot reuse issue and a fade whose previous endpoint caused a switch-time jump. The fixes retain pending selection until audio time advances and explicitly anchor each new fade. Boundary comparisons at all three rates pass; a diagnostic calibration rejects the previously observed jump. Absolute musical headroom is checked separately from the full-scale sine continuity stimulus.

[Browser evidence](tests/vintage-space-browser-results.json) records model selection, exact-entry Apply/Cancel, one-step Undo/Redo, model adjustment rail, Reverb/Depth/Filter navigation and explicit paused recovery of Spring with its settings. The new display reports wet activity and settles at zero Amount. Two live reduced-motion canvas captures were byte-identical. All five emulated viewport sizes retained a square display, reachable Start/Stop and no horizontal page overflow. The [screenshot](docs/images/vintage-space.png) shows the candidate.

[Listening evidence](tests/vintage-space-listening-results.json) records ten 12-second, 48 kHz stereo WAVs: dry, Original room, Plate, Spring and Chamber, each with Tape off and Space Echo on. Every clip uses the same Stillwater Chorus synth seed, six seconds of excitation and six seconds of tail. The shared comparison mix emphasizes the reverb; files have no individual normalization. The largest saved peak is 0.1858. See [testing](docs/TESTING.md#vintage-space-checks-and-listening) for rendering and saved playback. The private preview app bundle and all ten retained clips matched local SHA-256 hashes.

Impulse regeneration is synchronous on selection/Decay edits, coalesced while a fade is active; native convolution handles runtime audio. An Apple M4 Node diagnostic at 48 kHz/8-second decay measured generation at approximately 33–90 ms per model, and each stereo impulse occupies about 3.1 MB. These are development-machine measurements, not browser timing or device acceptance. Human listening, actual touch/battery behavior and hardware authenticity remain separate. Independent GPT-6.1 Sol Standards and Spec reviews of the committed change against `af4c346` each returned zero findings. No automatic merge or change to the favorite default is included.

## Foundation defaults and starting presets

Fresh startup and Stillwater Whole piece now select Chorus synth, the Stillwater Scene and Space Echo with Tape on. Compatibility fallback settings remain unchanged, and recovery stays explicit and paused. Sound offers 18 starting presets that replace only Foundation's instrument, expressive mode, tone macros and Chords/Melody/Air levels. Matching names come from saved values rather than a preset identifier.

The build and all 185 Node test results passed. New coverage exercises all presets through actual project save/load, explicit recovery and 36 stereo renders at 44.1/48 kHz. Three-second renders remained finite, with a largest peak of 0.1458 and RMS levels from 0.0070 to 0.0499; the smallest within-instrument PCM RMS difference was 0.0064. These measurements establish signal differences and headroom, not subjective loudness matching.

[Browser evidence](tests/foundation-presets-browser-results.json) records fresh defaults, all 18 selections during live playback, one-step Undo/Redo, Custom matching, the shared adjustment rail, preservation of harmony and Tape, and explicit paused recovery. Five viewport sizes had no outer-page overflow; shorter editor bays scroll internally to the menu. The [screenshot](docs/images/foundation-starting-presets.png) shows the Sound controls. The existing private preview's app bundle matches the local build hash, and its HTTPS page shows the new defaults. Independent Standards and Spec review found no blocking findings. Physical-device performance and listening acceptance remain separate.

## Chorus synth level correction

Chorus synth's oscillator blend and cascaded filters left it too quiet when switching instruments. A fixed 2.5x voice gain adds 7.96 dB while retaining its oscillator, filter and chorus behavior. Shared Air and the other instruments are unchanged. The stereo output regression compares Chorus with Hushfield over seconds 6–12 at 44.1/48 kHz, seeds 719/731 and Color 0/38/100, requiring the difference to stay within 6 dB.

The build and all 179 Node tests passed. Fresh browser verification passed all 36 Worklet checks. The regenerated 48 kHz dry comparison measures Chorus at -27.40 dBFS RMS versus Hushfield at -27.80 dBFS; the Chorus peak is 0.1851. The ten WAVs for other instruments retain their exact previous hashes. A separate 24-second, 48 kHz evolving-chord stress render with every layer, macro and Activity at 100 remained finite, with peak 0.2851. These signal checks do not replace listening on the user's device.

## Foundation instrument candidate

The isolated `codex/foundation-instruments` candidate adds five inspired instruments while keeping the original Foundation sound. Work started at `4be348a`. Local build and the full suite passed 177 results on 2026-10-26 Pacific. A subsequent shared-adjuster review fix added one test; 28 focused controls/history/instrument tests passed afterward. The final source/build consistency check passed. Frozen classic and expressive reference engines require exact same-runtime PCM at 8, 44.1 and 48 kHz.

[Worklet evidence](tests/foundation-worklet-results.json) records 36 passing assertions at 44.1/48 kHz across all six choices, live Texture-only routing and instrument changes. The existing Piece diagnostic passed its five checks, including direct processor harmony. [Browser evidence](tests/foundation-browser-results.json) records selection, Undo/Redo, the shared adjustment rail, Scene/New piece retention, Whole piece reset, export/import and explicit paused recovery. Layout checks covered desktop, portrait/landscape phone, tablet and Split View dimensions with no outer overflow. The [screenshot](docs/images/foundation-instruments.jpg) shows the current controls.

[Listening evidence](tests/foundation-listening-results.json) records twelve 12-second 48 kHz clips, each instrument dry and through identical Space Echo settings, with common gain and verified saved WAV hashes. Run `node ops/listening-server.mjs 4892`, then open `http://127.0.0.1:4892/qa-foundation.html?saved` for retained clips or render fresh examples. The saved WAVs are local ignored artifacts. The audio receipts were refreshed after the Chorus synth level correction; their recorded DSP source hashes match that build.

[Performance evidence](tests/foundation-performance-results.json) records an Apple M4 Node diagnostic after optimization: all instruments' p99 blocks were below the 2.667 ms quantum, with the largest at 1.196 ms. These timings exclude the browser's full audio graph and do not establish device reliability. Ten seconds of live browser playback and instrument switching produced no observed warnings/errors.

The independent Standards review found the missing shared-rail registration; its fix passed re-review with no outstanding findings. The independent Spec review found no missing requirements or incorrect behavior. Human listening approval, physical-device testing and measured hardware matching remain separate. This candidate has not replaced the live default.

## Tape physics and Space Echo integration

The approved Tape mechanism is integrated with both audio models and the five Tape presets. Local checks on 2026-10-26 passed the build and all 143 Node results. Telemetry tests compare every output sample with the frozen pre-integration models at 44.1/48 kHz through presets, all twelve modes, bypass and rapid model reversals. Additional regressions cover motor glide, normalized head levels, transients between reporting blocks, subscription resets and invalid-telemetry fallback.

Fresh browser checks passed all ten Space Echo Worklet assertions. Live checks covered Classic/Space Echo switches, selected-head indications, spring-only operation, preset Undo/Redo, pause and explicit recovery of Dub trails with Tape On and master volume zero. Recovery remained paused. The physical-loop tests retain separation, bounded return curvature and the saved starting arrangement. The mesh uses a bounded illustrative speed; it is not a calibrated tape-speed display. Hardware sound matching and physical-device performance remain separate from these checks.

## Tape starting presets

The five Tape presets add Gentle echo, Slapback, Three-head drift, Dub trails and Spring chamber. Fresh checks on 2026-10-26 passed all 125 Node results, including pairwise PCM differences, bounded decaying preset tails, isolated Tape changes, one-step Undo and actual project round trips. No DSP algorithm changed in this update.

Browser checks exercised all five selections, preserved both On and Off, verified Custom settings after manual/Classic changes and restored named settings with Undo/Redo. The menu remained reachable in phone portrait, short landscape, iPad, Split View and desktop layouts without outer-page overflow. Explicit recovery restored Dub trails into a paused session with master volume zero. The [preset receipt](tests/tape-presets-browser-results.json) records values and layout bounds; the [desktop screenshot](docs/images/tape-presets-desktop.jpg) shows the menu in the existing Tape editor. These checks do not replace physical-device or subjective listening acceptance.

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

## Plate damper correction, 27 October 2026

Following the original hardware research, the candidate now shows a fixed steel
sheet and a movable absorber. Separation changes Decay alone. Pre-delay remains
independent, and the animation has no travelling packets between the surfaces.
The earlier two-plate browser receipt remains historical evidence of that version.

The browser check first reproduced the old coupled behavior: End changed 3 s / 20 ms
to 8 s / 150 ms. The corrected End retained 20 ms. A native upward drag changed
Decay from 3 s to 6.3 s, and one Undo/Redo restored 3 s / 6.3 s without changing
Pre-delay. Home, End and ArrowUp worked; a separately chosen 150 ms pre-delay
survived a later damping edit. Spring and Filter hid the damper. Five viewport
sizes kept its handle in bounds and transport visible, without horizontal overflow.
Two full screenshots with reduced motion enabled were byte-identical. Cropped
captures initially changed the browser viewport; explicit viewport stabilization
and full captures resolved that measurement issue. Browser warnings/errors were empty.
See [the damper receipt](tests/space-damper-browser-results.json).

`npm test` passed all 193 tests. The production build and `git diff --check` passed.
No DSP, saved-Piece schema or default changes were made. This verifies interaction
and regression behavior, not a measured physical plate or physical touch performance.

### Standards

GPT-6.1 Sol review against `348bef1`: no actionable findings.

### Spec

GPT-6.1 Sol review against `348bef1` and the approved research recommendations:
no actionable findings. The final visual polish removes the background glow from
Plate so it cannot appear as a floating pulse in the gap.

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
