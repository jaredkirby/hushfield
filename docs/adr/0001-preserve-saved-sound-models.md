# Preserve the sound model of saved Pieces

Status: accepted; implemented in [PR #22](https://github.com/jaredkirby/hushfield/pull/22).

Expressive synthesis and independent room sends change how existing configurations sound. Version-5 projects therefore store explicit Foundation and room modes. Versions 1–4 retain classic synthesis and shared room routing, including after re-export. Saved Foundation settings lacking a model version select classic synthesis; the room mode is stored independently. Fresh defaults and complete presets explicitly opt into the new modes. This compatibility cost avoids silently replacing a player's existing Piece.

The modes opt in independently: editing Foundation **Sound** switches its synthesis model to expressive; editing any **Depth** control switches the Piece's room graph to per-part sends and filtered returns. A Depth edit changes the shared room mode for all parts, while Foundation remains classic until Sound is edited. Loading an older project alone promotes neither mode.

[Project validation](../../dist/project-file.mjs), [Foundation settings](../../dist/ambient-settings.mjs) and [room settings](../../dist/space-settings.mjs) implement the saved modes. The [classic Foundation fixture](../../tests/fixtures/foundation-classic-v1/README.md) preserves the original source for exact, same-runtime PCM regression checks. See [architecture](../ARCHITECTURE.md) for routing and [testing](../TESTING.md) for validation.
