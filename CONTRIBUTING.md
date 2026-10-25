# Contributing to Hushfield

Thanks for helping build an instrument that feels good to play. Start with the [README](README.md), [glossary](GLOSSARY.md) and [architecture](docs/ARCHITECTURE.md).

## Development workflow

1. Fork the repository and create a branch from `main`.
2. Install Node.js 22 or newer, then run `npm ci`.
3. Edit source files in `dist/`.
4. Run `npm run build` and `npm test`.
5. Serve `dist/` on localhost or HTTPS and check the affected behavior. `npm start` uses Python 3's loopback server.
6. Include source changes and the matching generated files in your pull request.

Do not edit `dist/build/` or the embedded scripts in `index.html` by hand. Build them from the source modules and `phone-shell.js`, `page-navigation.js` and `boot.js`. Tests check hashes/embedded contents; CI also requires rebuilding to leave shipped files unchanged.

## What to preserve

- Treat Hushfield as one Piece. Foundation supplies live Texture material and Motion harmony; editor navigation must not change playback, blend or source relationships.
- Keep Solo transient. Complete presets restore their full configuration, while legacy files retain their material and blend through migration.
- Keep the OLED/dithered visual system and stable display/editor/transport bounds across the five editors and secondary tools.
- Use the shared selected-value minus/plus controls. Keep phone, iPad, Split View and desktop layouts usable without page scrolling.
- Keep audio activation in the direct tap handler, ahead of worklet-loading awaits. Synthesis and musical timing belong on the audio thread; drawing remains separately capped.
- Preserve the shared normal Space/Tape path, independent Motion banks, explicit auditions and true Tape bypass. New vintage defaults must not overwrite saved settings or the deliberately stronger Worn memory preset.
- Retain recording ownership, track cleanup, latest-selection behavior, explicit paused recovery and truthful save/export status.
- Keep imported audio local. Discuss any telemetry, backend or runtime external dependency before adding it.

## Verification

Use meaningful tests for changed behavior and run the existing full suite before handoff. The fast interaction subset does not cover all recording, recovery, Piece, Orbit or Tape behavior. See [testing](docs/TESTING.md) for focused commands and browser diagnostics.

For layout work, check affected editor sections/banks at portrait phone, short landscape, iPad, Split View and desktop sizes. Verify playback/settings survive navigation and rotation. For DSP changes, combine PCM checks with listening; report browser emulation and physical-device checks separately. Recorded receipts are historical evidence, not a substitute for a fresh run of changed behavior.

## Issues and pull requests

Describe the concrete problem, resulting behavior and checks performed. Include a screenshot for visual changes and browser/device details for audio problems. Use synthesized or shareable audio in reproductions and keep unrelated changes separate.

Engineering specifications and implementation tickets are tracked in [GitHub Issues](https://github.com/jaredkirby/hushfield/issues); repository agent routing is documented in [AGENTS.md](AGENTS.md). A pull request should explain the change for a reviewer, with links to the relevant issue when one exists.

Contributions use the project's MIT license. Please communicate respectfully and make reviews easy to follow.
