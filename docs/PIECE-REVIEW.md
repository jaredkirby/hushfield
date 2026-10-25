# Ambient-first implementation review

Approved scope: [one evolving piece](specs/ambient-first.md), [parent #10](https://github.com/jaredkirby/hushfield/issues/10), [implementation #11](https://github.com/jaredkirby/hushfield/issues/11). Baseline: fc8c6abca9e32fe25329a9414d557f68ed60bdee. Local commits only; no push or deployment.

## Standards

The independent first pass found three material issues: Stillwater did not cancel pending source operations; application navigation overwrote the shared navigator's Texture-parent selection; and stopped grain telemetry invalidated paused rendering. All were repaired. The focused reviewer found no remaining material Standards findings and independently passed six related checks. Complete presets also restore fresh finishing controls and Motion patches; an orphan filter allocation was removed.

## Spec

The independent first pass found two material issues: the same Stillwater ownership gap and incomplete presets that retained incompatible high-pass filters or muted Motion banks. The preset session action now cancels pending selection before constructing a complete fresh piece. Regression tests exercise a deferred load and preset restoration. The focused reviewer found no remaining material Spec findings and independently passed eight related tests. No material scope creep was found.

## Verification

- Full Node suite: 38 passed, 0 failed.
- Real browser offline audio: five piece checks pass for Foundation-fed Texture with inaudible dry Foundation, shared tone, shared stereo width, the direct processor harmony channel, and finite stereo PCM. The existing 22 Orbit audio checks pass too.
- Browser layout: 42 primary/tool views, 30 secondary sections and 32 Motion bank/section cases pass, with no document overflow or clipped controls. Six viewport sizes include compact and regular portrait phones, short landscape, Split View, tablet and desktop. Sound banks were tested unlinked to expose the larger independent-tuning form.
- Real UI actions: full-piece transport persists across all main editors; freeze captures a four-second phrase; solo preserves the blend; recovery restores the phrase and Texture level while paused; the source tool retains Texture selection; a preset restores low-pass, linked harmony and audible patches after prior high-pass/mute edits.
- A cold-start processor message race discovered by the real Worklet checks was fixed with readiness handling and initial processor state.

The machine-readable browser receipt is tests/piece-browser-results.json; the current desktop screenshot is docs/images/ambient-first.jpg. A separate loopback origin was used for generated recovery testing so the existing preview-origin draft remained protected.

Physical microphone operation, actual phone/tablet touch and battery performance, and subjective listening acceptance remain unverified. Frozen and imported material retains its original harmony/pitch rather than being automatically reharmonized.
