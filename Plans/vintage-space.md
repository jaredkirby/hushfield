# Vintage Space implementation

Baseline: af4c34659aaf1858f87c66d4efd52da3bf07d2c9. Worktree: hushfield-space. Branch: codex/vintage-space.

User approved the reverb-centered Space direction and autonomous audio-output, project-lifecycle and real-browser test boundaries. Preserve the Chorus synth / Stillwater / Space Echo On default and Original room sound for audition; no automatic promotion or merge.

## Problem Statement

Space currently leads with a filter visualization and generic room. Players want recognizable vintage reverbs with character and useful controls, matching the distinct Foundation instruments and Space Echo machine.

## Solution

Center Space on Original room, Plate, Spring and Chamber, with Amount, Decay, Pre-delay, Tone and Reverb width. Keep per-part sends in Depth and existing whole-piece filtering/width under Filter. Show a model-specific visualization driven by measured wet audio. Preserve original saved sounds and provide listening comparisons.

## User Stories

1. As a player, I want to select Plate for dense, smooth chord tails.
2. As a player, I want a standalone Spring with dispersive character independent of Tape's spring.
3. As a player, I want a Chamber with recognizable early reflections and diffuse decay.
4. As a player, I want Original room to preserve my existing sound.
5. As a player, I want Amount to control only the reverb return.
6. As a player, I want Decay to change tail duration.
7. As a player, I want Pre-delay to separate the source from its reverb.
8. As a player, I want Tone to darken or brighten the return.
9. As a player, I want Reverb width independent of the whole-piece width control.
10. As a player, I want separate Foundation, Texture and Motion sends.
11. As a player, I want the shared filter and stereo width to remain reachable.
12. As a player, I want smooth live changes without abruptly cutting or amplifying the sound.
13. As a player, I want each model to have a recognizable visual whose motion follows audible wet activity.
14. As a player, I want reduced-motion preferences and silence respected.
15. As a player, I want direct controls, exact entry and the shared adjustment rail.
16. As a player, I want Undo and Redo to restore complete settings for each gesture.
17. As a player, I want saved Pieces and explicit paused recovery to retain the selected model and controls.
18. As a player, I want older Pieces to retain their original room, Foundation and Tape behavior after re-export.
19. As a player, I want controls reachable on phone, tablet, Split View and desktop without outer scrolling.
20. As a player, I want comparable listening clips before changing my favorite default.

## Implementation Decisions

- Use independently designed deterministic stereo impulse responses for the new physical-inspired models and native convolution. Include rapid plate diffusion, spring allpass dispersion, and chamber early reflection structure. Research distinguishes evidence from approximation; no measured hardware-equivalence claims.
- Keep Original room graph behavior and saved routing intact. New model selection explicitly opts into per-part sends. Returning to Original room preserves current routing; Undo restores earlier routing too.
- Crossfade bounded reverb lanes, coalescing rapid parameter changes. New room output follows the existing Space-to-Tape path. Shared dry filter/width retain their meaning.
- Keep current reverb Amount. New Decay spans 0.5–8 s, Pre-delay 0–150 ms, Tone and Reverb width 0–100. Original room ignores and disables new-model controls while preserving their values.
- Export schema 7, accepting 1–7. Versions 1–6 and missing/invalid model selections restore Original room. Model identity is independent of existing sound/routing versions.
- Reverb, Depth and Filter are sections in the existing editor bay. Use native selects, sliders, exact-entry and gesture history. Preserve fixed square OLED/dither display.
- Measure wet signal energy for visuals; geometry is illustrative, not a calibrated physical simulation. No new runtime dependency or network audio.

## Testing Decisions

Test only public behavior at the user-approved seams. Use one failing test followed by minimal implementation per behavior.

- Audio: real generated stereo impulse/output and OfflineAudioContext graph tests for distinct tails, duration/tone/pre-delay/width response, finite bounded output, original graph equivalence, amount-zero behavior and repeated switches at 44.1/48 kHz. Compare with frozen original graph in the same browser runtime.
- Project lifecycle: real serialize/decode and explicit recovery, all models/settings, malformed data and legacy 1–6 retention, preserving Foundation/Tape modes.
- Browser: actual model/section controls, exact entry, Undo/Redo, live changes, visuals, saved recovery and five viewport sizes. Record observations separately from physical-device acceptance.
- Run the build, focused checks during development and the full suite after integration. Review committed changes against the baseline with independent Standards and Spec agents.

## Out of Scope

Exact circuit or measured hardware matching, new instrument algorithms, changes to Tape's spring, new defaults without audition, early digital reverbs, remote dependencies, unrelated Foundation edits, automatic merging.

## Further Notes

Deliver a committed isolated candidate with private preview and playable comparisons. Human listening preference, actual touch behavior, battery use and hardware authenticity remain separate from automated evidence. Do not close the parent spec through implementation.

## Progress

- [x] Approved boundaries and fixed baseline
- [x] Primary-source research
- [x] Persistence implementation and focused regression checks
- [x] Model audio and original-sound verification
- [x] Controls and measured-activity visuals
- [x] Full suite, browser and listening comparisons
- [x] Independent Standards and Spec reviews
- [x] Committed private candidate and handoff
