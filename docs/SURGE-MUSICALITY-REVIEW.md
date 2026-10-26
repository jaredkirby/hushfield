# Surge-inspired musical expression review

The user approved the implementation seams and six dependent tickets under [spec #15](https://github.com/jaredkirby/hushfield/issues/15). Implementation took place in an isolated worktree on `codex/surge-inspired-music`, from `6e5c607a76f53021ed4bb016fdd5a42a43edd817`. Separate workers owned Foundation/composition, Motion/direct phrase integration, and native authoring/listening preparation. Public-behavior red/green evidence is retained under ignored `.scratch/surge-musicality/worker-*.md`.

Independent reviews compared `git diff 6e5c607a76f53021ed4bb016fdd5a42a43edd817...HEAD` at implementation commit `d64500c`. Reviewers read the approved spec and child tickets separately from the documented repository standards.

## Standards

No documented standards violations found in the reviewed changes.

Heuristic, nonblocking:

- **Possible Duplicated Code — `dist/piece-space.mjs:21–24`.** The new room-width graph repeats the existing dry-width construction at lines 7–12: `for (const [from, to] of [[0, 0], [1, 1], [0, 1], [1, 0]])`. A small local constructor could keep later routing changes consistent.

Production changes preserve documented audio-thread ownership, direct gesture activation, shared finishing, transient Solo, source-selection ownership, and saved-sound compatibility. No additional correctness risk emerged.

Resolution: the repeated four-connection matrix remains explicit in this candidate. Both paths share the same width coefficient update and have real offline mono-width coverage. This is an accepted refactoring suggestion, not a documented-rule breach or release blocker.

## Spec

No actionable production Spec findings against #15–21 and the approved specification.

The implementation covers distinct editable Motion banks, independent brightness contours, versioned Foundation synthesis, audio-clock phrase propagation, motifs/rests, nearby voicings, independent Depth controls, legacy compatibility, and native Surge source generation/import with pitch and provenance.

Solo bypasses normal Blend gain modulation while the selected part retains its composed density and rests. Physical-device performance and human musical preference are separate acceptance checks.

Summary: Standards 0 hard violations and 1 nonblocking heuristic (duplicated width-matrix construction); Spec 0 actionable production findings. The final listening-fixture and receipt audit below also passed.

## Supplemental Standards review

No additional hard standards or correctness findings in `d64500c...0a3cfbc`.

The repeat check records exact control equality, measured Float32 differences and both hashes without claiming byte identity. Saved-player loading and bounded byte-range delivery fit the development workflow. Documentation distinguishes actual render provenance, later server changes, browser evidence, and pending human/device acceptance. The original duplication suggestion remains nonblocking; its documented acceptance is reasonable.

## Supplemental Spec review

No actionable Spec findings in the supplemental changes. Issue #21's technical requirements are satisfied.

The reviewer independently verified all five saved WAVs: stereo PCM16 at 48 kHz, four lasting 75 seconds and one lasting 180 seconds, with hashes matching the receipt. Baseline/full repeat files also match their recorded hashes and differ by at most one PCM16 sample step. Exact repeated phrase snapshots and measured Float32 differences satisfy the documented tolerance. Saved-comparison controls and length/range responses introduce no confirmed regression.

Final counts: Standards 0 hard violations, 1 accepted nonblocking heuristic; Spec 0 actionable findings. Musical preference and physical-device acceptance remain open.

## Validation and listening evidence

- [Verification](../VERIFICATION.md): final full suite 69/69, synchronized build and clean diff check.
- [Browser receipt](../tests/surge-browser-results.json): 7 Depth checks, 5 Piece checks, 20 viewport cases, lazy native sources, navigation playback and explicit paused recovery.
- [Listening receipt](../tests/surge-listening-results.json): four 75-second comparisons plus a 180-second development arc; actual source/harness hashes, settings, raw/matched metrics and independent saved-byte audits.
- [Authoring and playback guide](SURGE-TEXTURE.md): native provenance, rebuild recipe, player and evidence limits.

WAV artifacts remain under ignored `.scratch/listening/artifacts/`, with a saved player at `http://127.0.0.1:4886/qa-musicality.html`. Choose **Load saved comparison** to reopen them. The separate native authoring experiment produced six candidates; three dry sources ship lazily in the instrument.

## Tracker completion

Validation comments were added to implementation tickets #16–21 and all six were closed in dependency order. Parent spec #15 was verified open with an unchanged body. The local branch contains the implementation, render evidence and this final review record; no remote publication is required by this task.
