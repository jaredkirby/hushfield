# Documentation

The player/developer guides below describe the current implementation. Specifications and review reports record the scope and evidence of earlier work; they are not a second source of current product instructions.

## Use Hushfield

- [README and quick start](../README.md)
- [Playing: parts, Texture sources, harmony, Tape, saving and recording](PLAYING.md)
- [Native Surge sources and listening comparisons](SURGE-TEXTURE.md)
- [Private Tailscale preview](PRIVATE-PREVIEW.md)
- [Musical-expression implementation and independent review](SURGE-MUSICALITY-REVIEW.md)
- [Surge research and rationale](SURGE-XT-RESEARCH.md)
- [Approved musicality specification](specs/surge-musicality.md)
- [Glossary](../GLOSSARY.md)
- [Verification and acceptance limits](../VERIFICATION.md)

## Develop and host

- [Contributing](../CONTRIBUTING.md)
- [Architecture and module ownership](ARCHITECTURE.md)
- [Testing commands, browser diagnostics and evidence](TESTING.md)
- [Static hosting and local preview](../ops/README.md)
- [Security reports](../SECURITY.md)

## Historical specifications and reviews

| Scope | Specification | Review |
| --- | --- | --- |
| Recording, timing and session recovery | [Reliability](specs/reliability.md) | [Reliability review](RELIABILITY-REVIEW.md) |
| Foundation / Texture / Motion Piece | [One evolving piece](specs/ambient-first.md) | [Piece review](PIECE-REVIEW.md) |
| Audible Tape and true bypass | [Tape impact](specs/tape-impact.md) | [Tape review](TAPE-REVIEW.md) |
| Warm Tape defaults and cassette motion | [Vintage Tape](specs/vintage-tape.md) | [Vintage Tape review](VINTAGE-TAPE-REVIEW.md) |
| Integration on main | — | [Integration review](INTEGRATION-REVIEW.md) |

These scopes were integrated through [PR #14](https://github.com/jaredkirby/hushfield/pull/14). Original baseline hashes, counts and local-only scope notes remain historical. The Piece model supersedes the reliability spec's original version-3 format with version 4; version 5 adds explicit sound/depth compatibility; warm vintage settings supersede the stronger new-session Tape defaults.

Earlier interface screenshots appear in `images/ambient-first.jpg` and `images/vintage-tape.jpg`. `phone.jpg`, `ipad.jpg`, `desktop.jpg` and `tape-impact.jpg` show earlier iterations rather than the current navigation/defaults.
