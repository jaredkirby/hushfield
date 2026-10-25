# Hushfield

[![CI](https://github.com/jaredkirby/hushfield/actions/workflows/ci.yml/badge.svg)](https://github.com/jaredkirby/hushfield/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-white.svg)](LICENSE)

**Small gestures. Evolving sound.**

Hushfield is one evolving ambient piece that you shape in your browser. Start with Foundation, reshape its sound into Texture, add harmony-linked Orbit movement, and finish the blend with Space and Tape. The interface uses a black-and-white OLED look with ordered dithering.

![Hushfield with Foundation, Texture, Motion, Space and Tape editors](docs/images/ambient-first.jpg)

## Play locally

No account, API key or backend is required. The checked-in `dist/` directory includes a ready-to-play build.

```sh
git clone https://github.com/jaredkirby/hushfield.git
cd hushfield
python3 -m http.server 4878 --bind 127.0.0.1 --directory dist
```

Open **http://127.0.0.1:4878** and tap **Start**. Python 3 is needed for this preview command. With Node.js installed, `npm start` runs the same Python server; it does not replace the Python requirement. Any suitable static server can serve `dist/`.

Use localhost or HTTPS for AudioWorklet and microphone support. Opening `index.html` directly as a file does not work. For access from another device, see [hosting](ops/README.md).

## Make your first piece

1. Tap **Start** on Foundation. A new session begins with Foundation audible and Texture/Motion at zero.
2. Move the four voice dots: up/down changes pitch within the scale; left/right changes stereo position.
3. Open **Texture** and choose **Add texture**. It reshapes recent Foundation audio into grains; long grains make a smooth cloud and short grains make fragments.
4. Open **Motion** and choose **Add motion**. Rotating shapes and bouncing balls add notes linked to Foundation's current harmony.
5. Open **Space** to shape the whole blend, then switch **Tape** on for gentle vintage coloration and darker repeats.

Select a parameter card, then use the shared **− / +** buttons; hold either button to repeat. The persistent **Foundation / Texture / Motion** blend controls what is audible. **Solo** temporarily isolates one part; **Full mix** restores the saved blend. Changing editors does not change the mix or restart the piece.

The five main editors are:

| Editor | What it shapes |
| --- | --- |
| Foundation | Ambient scene, key, scale, chord changes, voices and interactive dots. It also supplies live Texture material and Motion harmony. |
| Texture | Grain size, density, position, pitch, scatter, scanning and motion. Freeze a Foundation phrase or use optional imported material. |
| Motion | Orbit shape, spin rate, balls and 1–24 trigger marks. Triggers and balls have separate banks and individual sound editing. |
| Space | Shared filter, stereo width and room for the complete normal blend. |
| Tape | Shared saturation, Wow, Flutter, Hiss, Tone and echo. Off bypasses the complete effect. |

**Your sound / trim** is a secondary tool within Texture. **Visual**, available from every editor, opens the scope, spectrum or vectorscope; **Back to sound** returns to the previous editor. Visual settings affect the picture only.

Choose **Stillwater**, **Slow cloud**, **Glass shards** or **Worn memory** for a complete preset. Presets replace the blend, Foundation scene, sound patches and finishing settings; **New piece** instead changes the seed while keeping the current sounds and mix. See the [playing guide](docs/PLAYING.md) for Texture sources, harmony, Tape controls and recording.

## Phone, iPad and desktop

Portrait phones use stacked display/editor bays. iPad and desktop place the display beside the controls; narrow Split View uses the compact arrangement. Landscape phones and short windows use denser controls. Rotation and resizing preserve playback and musical edits.

The five editors and two secondary tools share fixed display/editor bounds, with playback and value adjustment in the bottom rail. The interface fits the visible viewport without page scrolling and accounts for browser toolbars, safe areas and pinch zoom. Current screenshots show the five-editor interface; older layout screenshots remain in `docs/images/` as historical assets.

## Save and recover

**Save project** downloads a `.hushfield.json` file with Texture material, blend/source/harmony relationships, sound patches, Foundation settings and visual settings. Current files use project schema **version 4**; versions 1–3 migrate automatically. Solo is temporary and is not saved.

A single bounded recovery draft is stored locally in IndexedDB when available. Open the session status button to recover or discard it; **recovery is explicit and starts paused**. `LOCAL DRAFT` means device-local recovery. `EXPORTED` means a download was initiated, not that the browser confirmed the file was saved. Export a file for a separate, portable copy.

Imported audio is processed locally and is not uploaded. Microphone access is requested only on Record. There is no analytics or runtime CDN dependency. See [saving and recording](docs/PLAYING.md#save-recover-and-record) for limits and recovery status details.

## Audio troubleshooting

Audio needs a direct tap or click. If the piece is silent, try **Test sound**, then **Restart audio**. Check the blend and any active Solo as well as device volume and Bluetooth/AirPlay output. Restart rebuilds the audio context while keeping the session; finish recording/capture first.

Background and locked-screen continuity are not guaranteed. Physical iPhone audio recovery has been confirmed, while current iPad touch/performance and the newer Orbit/Tape sound still need physical-device acceptance. [Verification](VERIFICATION.md) distinguishes fresh automated checks from recorded browser and device evidence.

## Develop

Use **Node.js 22 or newer** and npm. Python 3 is needed only for the bundled preview command.

```sh
npm ci
npm run build
npm test
npm start
```

Edit sources in `dist/`, then rebuild. The build bundles the app and four AudioWorklet entry points, embeds the early viewport/navigation/startup scripts, and records source hashes. Generated files are committed so a clone can be served without building. CI runs the full suite on Node 22 and 24 and checks that rebuilding leaves shipped assets unchanged.

`npm run test:interaction` is a fast subset for project validation, visual math, voice dots, startup, navigation, viewport behavior, shared controls and audio activation. It does not replace the full suite for piece routing, recovery, recording, Orbit or Tape changes. See [testing](docs/TESTING.md), [architecture](docs/ARCHITECTURE.md) and [contributing](CONTRIBUTING.md).

## Contribute and license

Bug reports, device testing, sound design improvements and pull requests are welcome. Include the browser, device, orientation and reproduction steps in [issues](https://github.com/jaredkirby/hushfield/issues). The [documentation index](docs/README.md) links player/developer guides, the glossary and historical reviews.

Hushfield uses the [MIT License](LICENSE). Demo sources are synthesized by the app; no recorded sample library is bundled. The build dependency esbuild has its own MIT license and is installed through npm.
