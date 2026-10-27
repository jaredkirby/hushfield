# Focus and calm implementation

## Objective and status

Implement the [agreed product direction](../docs/PRODUCT-DIRECTION.md) in a reviewable candidate. The first candidate includes per-editor Reset to defaults, playable Tape artwork, silent Tape movement and playback-intent reliability. It remains subject to human visual/listening approval and physical-device acceptance.

Branch `codex/focus-and-calm` starts from `f9311ef`, the remote main verified at implementation start. The separate `hushfield-focus` worktree preserves the original dirty checkout. Foundation Waves and stars work was carried across deliberately; newer merged Space and Tape implementations remain in the candidate.

## Work tracking

- Product specification: https://github.com/jaredkirby/hushfield/issues/39
- Editor resets: https://github.com/jaredkirby/hushfield/issues/40
- Tape visual interaction candidate: https://github.com/jaredkirby/hushfield/issues/41
- Playback intent and physical-device reliability: https://github.com/jaredkirby/hushfield/issues/42

Subagents owned separate goals: shared reset/default/transition code and tests; Tape pointer/keyboard interaction and tests; playback intent, bounded diagnostics and tests. The parent integrated app/UI changes. Subsequent independent reviews found reset/history and stale-audition races; the fixes have production-function regression coverage.

## Evidence

The build and all 252 Node tests passed. Browser checks covered all five editors at 320×568, 390×844, 844×390 and 1024×768, with no outer horizontal overflow and live playback continuing through navigation. Reset/Undo, stopped Tape gestures, live reset, silent visual movement, reduced motion and explicit Stop were checked. Browser audio diagnostics passed five Piece, ten Tape and 36 Foundation checks.

[Browser receipt](../tests/focus-browser-results.json) records the build/source hashes, cases and limitations. [Tape screenshot](../docs/images/focus-tape-candidate.jpg) shows the candidate. Live UI checks used master volume zero and do not establish listening preference.

## Next actions and open acceptance

Review the playable Tape candidate for visual enjoyment, gesture mapping and audible changes. Extend editor-specific interactions after that feedback. A broader calm-range/default listening pass is still pending. Follow the [device checklist](../docs/PLAYBACK-DEVICE-CHECK.md) for a 60-minute session, screen lock, calls and competing media on real phones and tablets. Call-versus-media interruption policy remains unverified where the browser supplies indistinguishable events.
