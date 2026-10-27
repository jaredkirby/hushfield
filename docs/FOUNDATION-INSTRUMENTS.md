# Foundation instruments

Implementation spec. Approved direction: Solina, Juno, Buchla, SEM and Moog inspired instruments, in that order. The user approved audio-output, project-lifecycle and browser-interaction test boundaries and autonomous implementation on 27 October 2026.

## Problem Statement

Foundation supplies a Piece's harmony and live Texture material, but offers one family of synthesis sounds. Players need distinct analog-inspired instruments with the same approachable controls and reliable saved-sound behavior.

## Solution

Add an Instrument selector to Foundation's Sound panel. Keep the existing Foundation available and add String ensemble, Chorus synth, Complex synth, Morph synth and Bass synth. Explain their Solina, Juno, Buchla, SEM and Minimoog inspirations without claiming measured hardware equivalence. Color, Drift and Bloom shape each instrument. Instruments feed the existing Foundation output, shared Space/Tape and live Texture.

## User Stories

1. As a player, I want to choose a string ensemble so held chords have a moving ensemble sound.
2. As a player, I want a chorus synth so pulse-width movement, a sub voice and chorus give chords a rounded stereo sound.
3. As a player, I want a complex synth so harmonic shaping and coupled brightness/amplitude decay create different sustained and melodic textures.
4. As a player, I want a morph synth so gradual filter-shape changes produce airy, hollow or brassy chords.
5. As a player, I want a bass synth so a single low voice follows Foundation harmony and gives the Piece weight.
6. As a player, I want the existing Foundation sound to remain available.
7. As a player, I want familiar Color, Drift and Bloom controls with a short explanation of their role in the selected instrument.
8. As a player, I want instrument changes to fade smoothly during playback.
9. As a player, I want instrument selection to preserve key, scale, chord timing, voice-dot settings and my Blend.
10. As a player, I want Scene and New piece to retain my selected instrument.
11. As a player, I want Whole piece presets to select their documented original Foundation sound predictably.
12. As a player, I want Undo and Redo to include an instrument selection as one edit.
13. As a player, I want save/load and explicit session recovery to retain my instrument and controls.
14. As a player, I want older Pieces to retain their original synthesis, composition rules and room routing.
15. As a player, I want live Texture to use the selected instrument even with the audible Foundation Blend at zero.
16. As a player, I want Motion to retain Foundation harmony when a bass instrument voices only one of its chord notes.
17. As a player, I want the selector and help to remain usable in the existing narrow and desktop layouts.
18. As a player, I want downloadable listening examples so I can judge the instruments and their interaction with Space Echo.

## Implementation Decisions

- Store a stable instrument identifier independently of the existing composition version. Missing or invalid identifiers restore the existing Foundation sound.
- Export project schema 6, accept versions 1 through 6, and retain versions 1 through 5 on the existing instrument. Preserve the existing classic-expression and shared-room migration boundaries.
- Selecting a new instrument opts into expressive composition; Undo restores the prior complete Foundation settings. Merely loading a saved Piece never promotes its sound.
- Keep the existing classic and expressive audio paths numerically unchanged when the existing instrument is selected. Frozen same-runtime reference engines establish this contract.
- Use small instrument modules, deterministic state and bounded, sample-rate-aware synthesis. Avoid allocation in the per-sample synthesis path.
- Preserve the existing composer, transport, four-note harmony, voice-dot meaning, layers and worklet output routing. Bass synth voices the low chord voice; help must explain its intentionally monophonic chord layer.
- Implement complete vertical slices: first String ensemble with shared selection/persistence/routing, then Chorus synth, Complex synth, Morph synth and Bass synth. Independent instrument modules may be developed in parallel once the common interface is fixed.
- Reuse the existing control styling and history transactions. Instrument-specific help must explain audible controls rather than internal DSP implementation.
- Keep all new voices and effects explicitly inspired models. Published hardware behavior guides the design; parameter choices and approximations are documented.

## Testing Decisions

The user approved these boundaries before test development:

- Foundation audio output: exercise the public audio engine and built worklet. Verify audible instrument differences, each macro's effect, finite bounded stereo output at 44.1/48 kHz and a reduced test rate, smooth live changes, seeded/block-size repeatability, stop behavior and old-sound PCM equivalence. This verifies behavior, not listening preference or hardware authenticity.
- Project lifecycle: exercise public serialize/decode and recovery interfaces. Verify each instrument survives round trips, malformed choices fall back safely, old formats retain original sound, and undoable settings preserve the full instrument choice.
- Browser interaction: exercise the actual selector, macro controls, Undo/Redo, scene/preset/new-piece actions and paused recovery on an isolated origin. Verify built Foundation output supplies audible live Texture and harmony remains intact. This does not establish physical touch feel, battery use or device-speaker quality.

Use one red test followed by minimal implementation per behavior. Prefer existing public interfaces and reference fixtures over internal mocks or source-text assertions. Run focused tests during each slice, then a full build/test pass and independent Standards and Spec reviews against baseline 4be348a.

## Out of Scope

Exact circuit emulation, claims of hardware matching, new plugin/runtime dependencies, replacing the visual system, changing shared Tape/Space defaults, unrelated refactoring, and promotion to the live default before human listening acceptance.

## Further Notes

Provide a runnable isolated candidate, a listening comparison page, current verification evidence and a committed implementation branch. Automated audio and browser checks are separate from human audition and physical-device acceptance.
