# Surge-inspired musical expression for Hushfield

Status: approved by the user on 2026-10-25; implemented and merged with the direct-control UI through [PR #22](https://github.com/jaredkirby/hushfield/pull/22), as `17794182f53d3175f88230200d83a734a58051e6`. Implementation tickets #16–21 are closed; [parent #15](https://github.com/jaredkirby/hushfield/issues/15) remains open. See [current verification](../../VERIFICATION.md) for technical evidence and outstanding musical-preference/device acceptance.

The approved scope below is retained as a historical record. Publication and UI integration were authorized separately; the original out-of-scope statement describes this specification's implementation stage.

Baseline: 6e5c607a76f53021ed4bb016fdd5a42a43edd817.
Implementation branch: `codex/surge-inspired-music`, originally isolated from concurrent interface work. See the [integration record](../UI-MUSIC-INTEGRATION.md) for the later combination.

## Problem Statement

The Piece has related sound parts but a narrow Foundation palette, interchangeable Motion patches across complete presets, and limited phrase memory. More sonic activity alone does not ensure expressive ambient music. Players need distinctive timbres, intentional phrasing, controllable development, and a concrete way to hear the result against the current sound.

## Solution

Make the existing four complete presets distinct through playable sound design, an evolving Foundation voice, seeded individual movement, a gradual shared phrase, motif repetition with silence, smoother voicing, and clearer depth. Provide musical controls, preserve older saved Pieces, and deliver reproducible listening comparisons plus genuine native Surge-generated Texture material when the workspace toolchain permits.

## User Stories

1. As a player, I want each complete preset to have recognizable Motion instruments, so selecting a Piece changes its musical character.
2. As a player, I want trigger and ball sounds to complement each other, so recurring notes and occasional answers remain distinct.
3. As a player, I want brightness to evolve independently of amplitude, so bells and plucks have a clear onset and gentle tail.
4. As a player, I want Foundation color to change gradually, so sustained harmony stays engaging.
5. As a player, I want modest independent voice drift, so the bed feels alive while remaining in tune.
6. As a player, I want Color, Drift, and Bloom to have bounded useful ranges, so I can shape the Piece without managing a modulation matrix.
7. As a player, I want a slow shared phrase with quiet intervals, so development has a direction.
8. As a player, I want Texture and Motion to make room for each other, so the mix avoids constant competition.
9. As a player, I want melodic motifs to return with small variations and rests, so the melody becomes recognizable.
10. As a player, I want nearby chord voicings, so harmonic changes are smooth.
11. As a player, I want my voice-dot gestures, held harmony, blend, and temporary Solo to retain their meaning, so expressive changes stay playable.
12. As a player, I want a clear harmonic foreground and a more distant Texture, so depth does not depend on increasing overall reverb.
13. As a returning player, I want old projects to preserve their sound model and relationships, so loading them is predictable.
14. As a player, I want new expression and depth settings to survive save/load and recovery, so I can continue a Piece later.
15. As a listener, I want current, individual-change, and combined examples at matched playback level, so I can judge actual musical value.
16. As a sound designer, I want documented pitch and provenance for native Surge samples, so imported Texture material can be used intentionally.
17. As a mobile player, I want finite bounded output and stable playback, so richer synthesis remains practical.
18. As a contributor, I want tests and review evidence to distinguish technical behavior from listening preference and device acceptance.

## Implementation Decisions

- Retain the five-editor Piece model and current visual language. Extend existing musical controls and dynamically generated patch groups.
- New Pieces use a versioned expressive Foundation model; older projects select a classic compatibility model. Keep the meaning of Evolution.
- Add normalized Color, Drift, and Bloom values, with band-limited harmonic shaping and seeded per-voice differences.
- Run a two-minute phrase on the audio clock. Its bounded part factors multiply normal Blend; Solo stays independent and transport pause stops development.
- Publish phrase/motif information through the existing audio status interface. Existing direct harmony propagation remains authoritative.
- Use motif repetition, intentional rests, and bounded nearby chord inversions; never rely on animation timers to schedule music.
- Add a neutral-by-default independent Motion brightness envelope. Classic patches with zero envelope amount retain their static-filter behavior.
- Give each complete preset fresh independent trigger/ball patches while retaining the established stronger Tape character of Worn memory.
- Keep the common normal finishing path while adding controllable part room sends and filtered room returns. Existing source auditions and true Tape bypass remain meaningful.
- Version project persistence where needed, validate untrusted values, and keep versions one through four loadable.
- Build original synthesis code and native-rendered sound assets with provenance; a complete Surge engine/browser editor port is a separate project.
- Keep a captured baseline and deterministic event/source conditions for comparisons, and disclose where a render is component-only or excludes the full browser graph.

## Testing Decisions

User-approved seams: use existing public audio-engine set/process/status and preset-selection interfaces, project serialization/decode, and an actual rendered-audio/browser integration seam. Prefer observable PCM, event timing, persistence, and playable browser behavior over private implementation assertions.

- Each preset: distinct audible patch identity; separate banks; repeated selection returns independent state; existing Tape settings preserved.
- Foundation: finite bounded stereo at 44.1/48 kHz, deterministic seed and block-size behavior, timbre change, smooth retuning, muted silence, pause/hold behavior, bounded voices, and autonomous four-minute development.
- Composition: motif recurrence with explicit rests and variations; lower chord movement than literal voicing; no out-of-scale notes; phrase factors change without editing saved Blend or Solo.
- Compatibility: version one through four projects remain loadable with classic expression and neutral new routing; new settings roundtrip and recovery validation bounds malformed values.
- Space: actual offline graph demonstrates per-part depth differences, filtered wet return, dry clarity, finite output, and shared finishing behavior.
- Listening: reproducible baseline/Motion-only/Foundation-only/full WAVs, measured levels and peaks, metadata, and a browser comparison page. Musical preference remains a human decision.
- Final validation: fresh build, full suite, browser checks on affected control groups at phone/tablet/desktop viewports, and independent Standards and Spec reviews against the captured baseline. Physical-device CPU, latency, battery, and sound preference are reported separately.

## Out of Scope

Full Surge patch compatibility, a general modulation matrix, cloning the Surge UI, paid providers, external publication/deployment, and replacing active interface work.

## Further Notes

This specification implements the five research recommendations and the practical source/listening workflow. A native Surge build is investigated in the workspace rather than silently substituting browser synthesis. Keep any external toolchain limitation explicit, and deliver the usable render/import tooling with precise evidence.
