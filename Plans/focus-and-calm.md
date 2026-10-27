# Focus and calm implementation

## Objective and status

Implement the [agreed product direction](../docs/PRODUCT-DIRECTION.md) in a reviewable candidate. The candidate includes per-editor Reset to defaults, playable Tape artwork and playback-intent reliability. The revised animation rule requires active playback for visual motion and Tape On for tape motion. It remains subject to human visual/listening approval and physical-device acceptance.

Branch `codex/focus-and-calm` starts from `f9311ef`, the remote main verified at implementation start. The separate `hushfield-focus` worktree preserves the original dirty checkout. Foundation Waves and stars work was carried across deliberately; newer merged Space and Tape implementations remain in the candidate.

## Work tracking

- Product specification: https://github.com/jaredkirby/hushfield/issues/39
- Editor resets: https://github.com/jaredkirby/hushfield/issues/40
- Tape visual interaction candidate: https://github.com/jaredkirby/hushfield/issues/41
- Playback intent and physical-device reliability: https://github.com/jaredkirby/hushfield/issues/42

Subagents owned separate goals: shared reset/default/transition code and tests; Tape pointer/keyboard interaction and tests; playback intent, bounded diagnostics and tests. The parent integrated app/UI changes. Subsequent independent reviews found reset/history and stale-audition races; the fixes have production-function regression coverage.

## Evidence

The initial build and all 252 Node tests passed. Browser checks covered all five editors at 320×568, 390×844, 844×390 and 1024×768, with no outer horizontal overflow and live playback continuing through navigation. Reset/Undo, stopped Tape gestures, live reset, reduced motion and explicit Stop were checked. The same historical run checked silent visual movement, which the user has since rejected. Browser audio diagnostics passed five Piece, ten Tape and 36 Foundation checks.

[Browser receipt](../tests/focus-browser-results.json) records the original build/source hashes, cases and limitations; it does not verify the revised animation rule. [Tape screenshot](../docs/images/focus-tape-candidate.jpg) shows that candidate. Live UI checks used master volume zero and do not establish listening preference.

On 2026-10-27, the user reported an apparent Sony headphone noise-cancellation/transparency switch in Helium on a MacBook Pro. They reported the switch gone in a comparison build that removed the new Media Session integration and early Audio Session access while preserving the sound engine and existing audio activation. The exact headphone model and OS/browser versions were not recorded; the combined comparison does not identify the individual cause.

The candidate therefore omits app-provided headset/lock-screen transport registration, Media Session metadata/playback-state updates and early Audio Session listeners or diagnostic reads. The local playback log records context and intent fields only. The earlier automated and browser results above belong to their recorded build and do not establish listening or device acceptance of this correction.

## Next actions and open acceptance

The revised animation gate builds and passes all 260 Node tests. [Fresh browser checks](../tests/visual-playback-browser-results.json) confirm still stopped canvases in all five editors, moving Tape during playback and frozen Tape while Off or after Stop. Stopped setting edits remain available without starting audio. Review the playable Tape candidate for visual enjoyment, gesture mapping and audible changes, then extend editor-specific interactions after feedback. A broader calm-range/default listening pass is still pending. Follow the [device checklist](../docs/PLAYBACK-DEVICE-CHECK.md) for a 60-minute session, screen lock, calls and competing media on real phones and tablets. The MacBook Pro/Sony/Helium comparison is a narrow human result; long-session reliability and call-versus-media behavior remain unverified. Reintroducing platform transport controls requires a separate headphone/device check.
