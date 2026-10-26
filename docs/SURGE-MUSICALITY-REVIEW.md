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

Summary: Standards 0 hard violations and 1 nonblocking heuristic (duplicated width-matrix construction); Spec 0 actionable production findings. Final listening-fixture and receipt review is recorded below after the render audit.
