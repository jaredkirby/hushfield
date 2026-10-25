# Hushfield reliability and session continuity

Historical approved scope. Original baseline and local-only completion instructions are retained as a record; the work was subsequently integrated into main. See [current guides and review history](../README.md) for later behavior and superseding decisions.

## Problem Statement

Recording can leave a microphone active or discard captured audio during overlapping actions. Sample loading can replace a newer selection, Forward can scan backward, and Orbit timing depends on animation frames. Unsaved sessions are vulnerable to tab loss, silent layers are hard to diagnose, and compressed source plus continuous pixel processing make maintenance and performance harder.

## Solution

Make recording and sample changes explicit, serialized operations. Run Orbit's musical timing and synthesis on the audio thread while keeping its visual display independent. Offer an explicit local recovery draft, honest save status, and accessible layer levels. Preserve the instrument's sound controls, monochrome dithered visual system, layout bounds, local-only audio processing, project compatibility, and direct-gesture activation.

## User Stories

1. As a player, I want repeated microphone taps to produce at most one active take, so recording remains predictable.
2. As a player, I want to cancel a pending microphone request, so late permission cannot silently start recording.
3. As a player, I want Stop and errors to release every microphone track, so the device stops capturing.
4. As a player, I want requesting and finishing states to be visible, so I understand delays.
5. As a player, I want output capture to finish exporting before another capture starts, so my performance is preserved.
6. As a player, I want capture messages associated with their take, so stale messages cannot corrupt a newer recording.
7. As a player, I want a bounded five-minute stereo WAV export, so captures are portable and memory use stays bounded.
8. As a player, I want my latest sample or project selection to win, so an earlier decode cannot overwrite my choice.
9. As a player, I want demos, trims, microphone takes, and project loads to obey the same selection ownership rules.
10. As a player, I want Forward, Reverse, and Ping-pong to follow their labels after any transition.
11. As a player, I want saved projects to restore their sample, patches, ambient voices, visual settings, controls, and volume.
12. As a player, I want earlier project formats to continue loading.
13. As a player, I want Orbit rhythms to retain their timing during interface stalls.
14. As a player, I want Orbit bank/item sound controls, effects, mute/reset, and auditions to remain available.
15. As a player, I want Orbit animation to follow the audio clock without controlling it.
16. As a player, I want local recovery after refresh or tab eviction, so accidental closure need not lose my session.
17. As a player, I want to choose whether to recover or discard a previous draft.
18. As a player, I want unsaved, saving, recovered, and storage-error status to be honest.
19. As a player, I want storage failures to leave the instrument playable.
20. As a player, I want Sample and Orbit editors to explain a silent layer and expose its level without changing my mix merely by navigating.
21. As a player, I want the shared value adjuster and existing OLED layout to remain consistent.
22. As a player, I want paused displays to stop expensive redraws while edits and resizing still update them.
23. As a player, I want engine failures to offer audio recovery rather than silently showing healthy playback.
24. As a contributor, I want readable source and clear lifecycle ownership, so fixes can be reviewed and maintained.

## Implementation Decisions

- Separate microphone takes, output capture, sample-selection ownership, project serialization, recovery storage, and rendering cadence behind small public interfaces.
- Represent recording as idle/requesting/recording/finishing states. Each take owns its acquired resources and messages.
- Match output messages to session identifiers, finalize before accepting a new take, and encode chunks without building redundant full-size PCM buffers.
- Use monotonically increasing sample-operation ownership. Only a current operation may apply its decoded result; synchronous selections invalidate earlier operations.
- Preserve project schema version 3 and migration of versions 1–3. Validate and stage a complete project before applying it.
- Drive Orbit simulation, trigger crossings, envelopes, and oscillator rendering from worklet processing. Retain native per-bank delay/reverb routing where useful, including audition bypass of the layer fader.
- Use bounded device-local recovery storage; offer recovery explicitly, never auto-play a recovered session, and surface storage failures.
- Expose layer level selection through the existing shared adjuster. Navigation preserves musical state.
- Limit expensive draw cadence and invalidate paused displays on edits, resizing, and new audio/status data. Preserve screen-stable ordered dithering.
- Centralize graph cleanup and handle processor errors. Preserve synchronous gesture activation before asynchronous worklet loading.

## Testing Decisions

Approved seams are instrument/session actions, AudioWorklet message/PCM output, and browser-visible UI. Assert externally observable outcomes, not private fields or internal call counts. Mock only browser/device/storage/time boundaries. Existing processor PCM and physics tests are prior art; add application-level recording, selection ownership, serialization, and recovery tests. Develop one failing test and one implementation slice at a time. Run targeted tests while iterating, the full build/suite at integration, and independent Standards/Spec reviews against the pinned initial-release baseline.

## Out of Scope

No backend, analytics, runtime CDN, deployment, remote push, new sound packs, visual redesign, or guaranteed locked-screen/background playback. Automated tests do not establish physical microphone, touch, battery, or listening acceptance.

## Further Notes

Approved in this conversation on 2026-10-25 together with GitHub Issues, AGENTS.md, the eight-ticket plan, and all three testing seams. Baseline: 952fa053eb54cd7431a65106406eb2c1b06540f9. Finish with a reviewed local commit on the current main branch.
