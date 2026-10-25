# Contributing to Hushfield

Thanks for helping build an instrument that feels good to play.

## Development workflow

1. Fork the repository and create a branch from `main`.
2. Install Node.js 22 or newer, then run `npm ci`.
3. Make the change in the source files under `dist/`.
4. Run `npm run build` and `npm test`.
5. Serve `dist/` on localhost or HTTPS and check the affected interaction.
6. Include source changes and the matching generated files in your pull request.

The checked-in build makes the app usable from a fresh clone. Do not edit `dist/build/` or embedded scripts in `index.html` by hand: build them from their sources. The tests verify their hashes and contents.

## What to preserve

- Keep the black-and-white dithered visual system and consistent display/editor/transport bounds across views.
- Use the shared selected-value minus/plus controls instead of introducing separate sliders.
- Keep audio activation in the direct tap handler. Loading a worklet must not consume the gesture before the output is primed.
- Run audio scheduling and synthesis on the audio thread. View changes and resizing must not restart the music.
- Retain project-file migration and independent sound editing for balls and triggers.
- Keep imported audio local. Do not add telemetry or an external runtime dependency without discussing the change first.

## Verification

Use meaningful tests for changed behavior. `npm test` includes rendered PCM, tape DSP, long-run physics, project migration, stereo analysis, viewport identity, navigation, startup and audio recovery checks. `npm run test:interaction` is a faster subset.

For layout work, check portrait phones, landscape iPad, narrow Split View and desktop, including short windows. Check every affected editor bank for clipped controls and verify that playback/settings survive rotation. For DSP changes, listen as well as measuring PCM. Browser emulation does not establish physical-device audio, touch or frame-rate acceptance; say which checks you performed.

## Issues and pull requests

Describe the concrete problem, resulting behavior and how you checked it. A short screenshot or recording is useful for visual changes. Use synthesized or shareable audio when attaching a reproduction, and include the device/browser details for audio problems. Keep unrelated changes in separate pull requests.

Contributions are made under the project's MIT license. Please communicate respectfully and make reviews easy to follow.
