# Documentation

The guides describe the current implementation, including the optional
RE-201-inspired Space Echo model. Specifications record approved intent; reviews
and JSON receipts record evidence at their named revisions.
[Verification](../VERIFICATION.md) separates current checks from historical
results and open device/listening acceptance.

## Play Hushfield

- [Product direction: focus, calm and interactive visuals](PRODUCT-DIRECTION.md)
- [README and quick start](../README.md)
- [Playing: controls, parts, sources, harmony, effects, saving and recording](PLAYING.md)
- [Glossary](../GLOSSARY.md)
- [Native Surge sources and listening comparisons](SURGE-TEXTURE.md)
- [RE-201 research, head modes and emulation limits](research/re201-space-echo.md)
- [Private Tailscale preview](PRIVATE-PREVIEW.md)

## Develop and host

- [Contributing](../CONTRIBUTING.md)
- [Architecture and module ownership](ARCHITECTURE.md)
- [Testing commands and browser diagnostics](TESTING.md)
- [Background playback device checks and local evidence export](PLAYBACK-DEVICE-CHECK.md)
- [Static hosting and local preview](../ops/README.md)
- [Security reports and runtime boundaries](../SECURITY.md)
- [Decision: preserve the sound of saved Pieces](adr/0001-preserve-saved-sound-models.md)
- [Decision: preserve playback intent through interruptions](adr/0002-preserve-playback-intent-through-interruptions.md)
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
| Optional Space Echo model | [RE-201 research](research/re201-space-echo.md) | [DSP and listening workflow](TESTING.md#space-echo-checks-and-listening), [current verification](../VERIFICATION.md) |
| Earlier main integration | — | [PR #14 integration review](INTEGRATION-REVIEW.md) |

Versions 1–4 retain their classic sound when loaded; schema 5 stores explicit
Foundation and room compatibility modes. Current controls and migration behavior
are explained in Playing and Architecture. Saved Pieces without an explicit Tape
model retain Classic, including schema-5 files; Worn memory also stays Classic.
The original specifications remain
intact as historical intent. Earlier screenshots in the review/history records
show their original UI revisions and may differ from the current instrument.
