# Hushfield

[![CI](https://github.com/jaredkirby/hushfield/actions/workflows/ci.yml/badge.svg)](https://github.com/jaredkirby/hushfield/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-white.svg)](LICENSE)

**Small gestures. Evolving sound.**

Hushfield is one evolving ambient piece that you shape in your browser. Start with Foundation, reshape its sound into Texture, add harmony-linked Motion through Orbit, and finish the blend with Space and Tape. The interface uses a black-and-white OLED look with ordered dithering.

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

1. Tap **Start** in the bottom bar. A fresh session begins with Foundation audible and Texture/Motion at zero; a recovered project starts paused with its saved blend.
2. Move the four voice dots: up/down changes pitch within the scale; left/right changes stereo position.
3. Open **Texture** and choose **Add texture**. It reshapes recent Foundation audio into grains; long grains make a smooth cloud and short grains make fragments.
4. Open **Motion** and choose **Add motion**. Rotating shapes and bouncing balls add notes linked to Foundation's current harmony.
5. Open **Space** to shape the whole blend, then switch **Tape** on for gentle vintage coloration and darker repeats.

Drag a parameter slider, tap its underlined readout to enter an exact value, or choose a category directly from its menu. The shared **− / +** buttons still adjust the selected control; hold either button to repeat. **Undo / Redo** restores settings edits, with one drag treated as one change. The persistent **Foundation / Texture / Motion** blend controls what is audible. **Solo** temporarily isolates one part; **Full mix** restores the saved blend. Changing editors does not change the mix or restart the piece.

The five main editors are:

| Editor | What it shapes |
| --- | --- |
| Foundation | Compose selects scene, key, scale and evolution; Sound shapes Color/Drift/Bloom; Voices balances chords, melody and air. Labeled dots set pitch and pan; Foundation supplies live Texture material and Motion harmony. |
| Texture | Drag the grain position/length handles, then shape density, pitch, scatter and scanning. Controls remain editable at zero blend. Freeze a phrase or use your own material. |
| Motion | Turn the orientation handle or move signed spin speed through zero. Select triggers to edit; shape individual or bank-wide sounds with the amplitude envelope handles and independent brightness controls. |
| Space | Drag horizontally for filter cutoff and vertically for resonance. Separate width, per-part room sends and filtered ambience finish the whole blend. |
| Tape | Echo and Character sections separate repeats from coloration. Drag the echo grid for time/feedback; Off bypasses the complete effect. |

**Your sound / trim** is a secondary tool within Texture, with draggable In/Out boundaries and seconds readouts. **Visual**, available from every editor, opens the scope, spectrum or vectorscope; **Back to sound** returns to the previous editor. Visual settings affect the picture only.

Choose **Stillwater**, **Slow cloud**, **Glass shards** or **Worn memory** for a complete preset. Presets replace the blend, Foundation scene, sound patches and finishing settings; **New piece** instead changes the seed while keeping the current sounds and mix. See the [playing guide](docs/PLAYING.md) for Texture sources, harmony, Tape controls and recording.

## Phone, iPad and desktop

Portrait windows place controls below the square visual; landscape windows place them beside it. The layout follows the available viewport, including iPad Split View. Narrow or short control areas use fewer columns and internal scrolling. Rotation and resizing preserve playback and musical edits.

The five editors and two secondary tools share a fixed square visual viewport, with a separate **Start / Stop** button and value adjustment in the bottom rail. Tapping the visual edits or interacts with that view; it does not start or stop playback. Texture's adjustments open by default, with Display, Texture, Scan and Variation tabs; its display-only Wave smoothing control starts at 65%. Hide adjust hides the fields while preserving the visual square. Longer inspectors scroll inside their own bay; the surrounding page stays within the visible viewport and accounts for browser toolbars, safe areas and pinch zoom. Historical screenshots and validation records are linked from [verification](VERIFICATION.md); they are labeled by the behavior and baseline they recorded.

## Save and recover

**Save project** downloads a `.hushfield.json` file with Texture material, blend/source/harmony relationships, sound patches, Foundation settings and visual settings. Current files use project schema **version 5**; versions 1–4 migrate automatically while retaining their classic Foundation and shared-room sound modes, including after re-export. Choosing a complete preset opts into the current sound. Editing Foundation Sound switches Foundation synthesis to the evolving voice; editing any Space Depth control switches the whole Piece to independent room sends. Those two sound modes change independently. See the [saved-sound decision](docs/adr/0001-preserve-saved-sound-models.md). Solo is temporary and is not saved.

Settings Undo/Redo keeps up to 40 edits in the current session. Loading a project, choosing a complete preset, changing the material or starting a New piece clears that history. It does not restore audio buffers, recordings or playback position.

A single bounded recovery draft is stored locally in IndexedDB when available. Open the session status button to recover or discard it; **recovery is explicit and starts paused**. `LOCAL DRAFT` means device-local recovery. `EXPORTED` means a download was initiated, not that the browser confirmed the file was saved. Export a file for a separate, portable copy.

Imported audio is processed locally and is not uploaded. Microphone access is requested only on Record. There is no analytics or runtime CDN dependency. See [saving and recording](docs/PLAYING.md#save-recover-and-record) for limits and recovery status details.

## Audio troubleshooting

Audio needs a direct tap or click. If the piece is silent, try **Test sound**, then **Restart audio**. Check the blend and any active Solo as well as device volume and Bluetooth/AirPlay output. Restart rebuilds the audio context while keeping the session; finish recording/capture first.

Background and locked-screen continuity are not guaranteed. Earlier physical iPhone recovery checks are recorded, but the merged UI/music update still needs physical-device touch/performance checks and human listening acceptance. [Verification](VERIFICATION.md) distinguishes fresh automated checks from recorded browser and device evidence.

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

Hushfield uses the [MIT License](LICENSE). The original demo sources are synthesized by the app. Three optional Surge XT textures are bundled as pre-rendered WAVs with their patches and provenance. Select them in **Your sound / trim** to fetch the recording from the same host; their C4 pitch remains fixed as harmony changes. Playing Hushfield requires no Surge installation. [Source provenance and authoring workflow](docs/SURGE-TEXTURE.md) describe the separate native development toolchain. The build dependency esbuild has its own MIT license and is installed through npm.
