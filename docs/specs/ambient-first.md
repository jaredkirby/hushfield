# One evolving piece

Historical approved scope. Original baseline and local-only completion instructions are retained as a record; the work was subsequently integrated into main. See [current guides and review history](../README.md) for later behavior and superseding decisions.

## Problem Statement

Independent generators and editor tabs obscure which controls affect the audible sound. Sample and Grain can edit a silent layer while Play starts an unrelated ambient generator.

## Solution

Ambient is the musical Foundation. Texture reshapes recent Foundation audio or optional imported material. Motion adds Orbit notes related to the Foundation harmony. Shared Space and Tape shape their blend. Play always controls the piece; navigation never changes the mix.

## User Stories

1. As a player, I want a complete Foundation on Start, so I can begin with a coherent piece.
2. As a player, I want Texture to use the Foundation's recent sound, so its relationship is immediately audible.
3. As a player, I want to freeze a phrase and resume live material, so I can choose evolving or fixed texture.
4. As a player, I want to import, record, trim and preview optional texture material.
5. As a player, I want visible Foundation, Texture and Motion levels throughout the app.
6. As a player, I want an explicit Add texture or Add motion action when that part is silent.
7. As a player, I want temporary solo that leaves my saved blend unchanged.
8. As a player, I want Orbit to follow Foundation harmony by default, with an explicit independent mode.
9. As a player, I want tone, stereo width and space to shape the complete piece.
10. As a player, I want five main editors: Foundation, Texture, Motion, Space and Tape, with source editing and visualization as secondary views.
11. As a player, I want full-piece presets, clear explanations, and controls that affect an enabled part.
12. As a player, I want projects and local recovery to retain the new musical relationships and frozen/imported material, while older projects remain loadable and start safely paused on recovery.

## Implementation Decisions

- Keep stable internal page identifiers and old deep links; expose five main editors plus texture-source and visualization tools.
- Add a versioned piece model for blend levels, Texture source and harmony following. Solo is transient and never persisted.
- Use a bounded four-second stereo ring in the grain Worklet fed directly by Foundation before its audible fader. Freezing captures available material into the existing portable sample representation; keep it distinct from live material.
- Exchange harmony through a dedicated processor MessageChannel. Motion follows current chord pitch classes; independent sound patches remain available when explicitly unlinked.
- Sum all normal layers before the shared filter, stereo-width, reverb and tape path. Audition remains explicitly labelled.
- Preserve local-only processing, recording ownership, latest-selection rules, paused recovery, mobile bounds, OLED appearance and the existing shared value adjuster.

## Testing Decisions

Reuse the previously approved boundaries: session/project actions, Worklet message and PCM behavior, and browser-visible UI. Develop behavior in vertical red/green slices. Verify live material, stable playback across navigation, solo restoration, harmony changes, persistence/migration, shared effects and responsive bounds. Independent Standards and Spec reviews follow integration.

## Out of Scope

No deployment, push, backend, automatic pitch detection/reharmonization of imported audio, or guarantee of physical-device listening acceptance. Frozen textures retain their captured harmony and are labelled accordingly.

## Further Notes

The user approved the Ambient-first direction and requested implementation. Baseline fc8c6abca9e32fe25329a9414d557f68ed60bdee; finish with a reviewed local commit on the current branch.
