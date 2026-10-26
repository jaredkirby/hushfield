# Documentation

The guides describe the implementation merged by
[PR #22](https://github.com/jaredkirby/hushfield/pull/22) at `1779418`.
Specifications record approved intent; reviews and JSON receipts record evidence
at their named revisions. [Verification](../VERIFICATION.md) separates the merged
baseline from historical results and open device/listening acceptance.

## Play Hushfield

- [README and quick start](../README.md)
- [Playing: controls, parts, sources, harmony, effects, saving and recording](PLAYING.md)
- [Glossary](../GLOSSARY.md)
- [Native Surge sources and listening comparisons](SURGE-TEXTURE.md)
- [Private Tailscale preview](PRIVATE-PREVIEW.md)

## Develop and host

- [Contributing](../CONTRIBUTING.md)
- [Architecture and module ownership](ARCHITECTURE.md)
- [Testing commands and browser diagnostics](TESTING.md)
- [Static hosting and local preview](../ops/README.md)
- [Security reports and runtime boundaries](../SECURITY.md)
- [Decision: preserve the sound of saved Pieces](adr/0001-preserve-saved-sound-models.md)
- [Agent workflow entry point](../AGENTS.md): [domain context](agents/domain.md) and
  [issue tracking](agents/issue-tracker.md)
- [Pull request template](../.github/PULL_REQUEST_TEMPLATE.md)

## Specifications and evidence

| Scope | Specification / research | Review / evidence |
| --- | --- | --- |
| Merged UI and expressive music | [Musicality specification](specs/surge-musicality.md), [Surge research](SURGE-XT-RESEARCH.md) | [UI/music integration](UI-MUSIC-INTEGRATION.md), [music review](SURGE-MUSICALITY-REVIEW.md) |
| UI development and reversions | — | [Historical UI checks and screenshots](UI-HISTORY.md) |
| Recording, timing and recovery | [Reliability](specs/reliability.md) | [Reliability review](RELIABILITY-REVIEW.md) |
| Foundation / Texture / Motion Piece | [One evolving piece](specs/ambient-first.md) | [Piece review](PIECE-REVIEW.md) |
| Audible Tape and true bypass | [Tape impact](specs/tape-impact.md) | [Tape review](TAPE-REVIEW.md) |
| Warm Tape defaults and cassette motion | [Vintage Tape](specs/vintage-tape.md) | [Vintage Tape review](VINTAGE-TAPE-REVIEW.md) |
| Earlier main integration | — | [PR #14 integration review](INTEGRATION-REVIEW.md) |

Versions 1–4 retain their classic sound when loaded; schema 5 stores explicit
Foundation and room compatibility modes. Current controls and migration behavior
are explained in Playing and Architecture. The original specifications remain
intact as historical intent. Earlier screenshots in the review/history records
show their original UI revisions and may differ from the current instrument.
