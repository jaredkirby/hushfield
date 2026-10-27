# Hushfield

[![CI](https://github.com/jaredkirby/hushfield/actions/workflows/ci.yml/badge.svg)](https://github.com/jaredkirby/hushfield/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-white.svg)](LICENSE)

Hushfield is a browser instrument for ambient music. Move four voice dots to change a chord, turn that sound into grains, and add notes with rotating shapes and bouncing balls. Space and Tape process the mix. The display is black and white, with ordered dithering.

## Play locally

The repository includes a playable build in `dist/`. You need Python 3 for this server command, but no account, API key or backend.

```sh
git clone https://github.com/jaredkirby/hushfield.git
cd hushfield
python3 -m http.server 4878 --bind 127.0.0.1 --directory dist
```

Open http://127.0.0.1:4878 and tap Start. `npm start` runs the same Python server if you have Node.js installed. You can also serve `dist/` with another static server.

AudioWorklet and microphone access need localhost or HTTPS. Opening `index.html` as a file does not work. See [hosting](ops/README.md) to play from another device.

## Make your first piece

1. Tap Start in the bottom bar. A fresh session plays Foundation with Texture and Motion at zero. Recovered projects start paused with their saved blend.
2. Move the four voice dots. Up and down changes pitch within the scale; left and right changes stereo position.
3. Open Texture and choose Add texture. Long grains make a smooth cloud; short grains make fragments of the recent Foundation audio.
4. Open Motion and choose Add motion. Orbit's rotating shapes and bouncing balls add notes that follow Foundation's chord.
5. Open Space to change the filter and room. Switch Tape on for coloration and darker repeats.

Drag sliders, tap underlined values for exact entry, or choose categories from their menus. The shared minus and plus buttons adjust the selected control. Hold either button to repeat. Undo and Redo restore settings, with each drag counted as one edit.

The Foundation, Texture and Motion blend controls set what you hear. Solo isolates one part; Full mix restores the saved blend. You can change editors without changing the mix or restarting the music.

| Editor | Controls |
| --- | --- |
| Foundation | Compose sets the scene, key, scale and evolution. Sound selects an Instrument with Color, Drift and Bloom; Voices balances chords, melody and air. The dots set pitch and pan. Foundation also supplies live Texture audio and Motion harmony. |
| Texture | Drag the grain position and length handles. Adjust density, pitch, scatter and scanning, even at zero blend. Freeze a phrase or use your own material. |
| Motion | Turn the orientation handle and set spin speed in either direction. Select individual triggers or a whole bank, then edit their amplitude envelopes and independent brightness controls. |
| Space | Drag horizontally for filter cutoff and vertically for resonance. Set stereo width, each part's room send, and the room's filters. |
| Tape | Choose Classic or the RE-201-inspired Space Echo. Echo sets head mode, timing, feedback and spring level; Character sets coloration. Drag the echo grid for time and feedback. Off bypasses the whole effect. |

Your sound / trim opens Texture's source editor, with draggable In and Out boundaries and readouts in seconds. Visual opens a scope, spectrum or vectorscope from any editor. Its settings change only the picture. Back to sound returns to the previous editor.

Stillwater, Slow cloud, Glass shards and Worn memory are complete presets. They replace the blend, Foundation scene, sound patches and finishing settings. New piece changes the seed while keeping your sounds and mix.

The [playing guide](docs/PLAYING.md) covers Texture sources, harmony, Tape controls and recording.

Tape preset offers Gentle echo, Slapback, Three-head drift, Dub trails and Spring chamber. A selection changes only the Tape sound, keeps its On/Off state and can be undone. Editing a value shows Custom settings.

Fresh sessions start paused with Chorus synth, Stillwater and Space Echo with Tape On. Stillwater in Whole piece restores this combination. Foundation's Sound panel also offers 18 starting presets, three per instrument, with one-step Undo and names that follow the actual sound settings. These change Foundation tone and voice levels while retaining your Scene, harmony and shared effects.

Space Echo starts with Gentle echo settings. Try Head mode 11 for three rhythmic echoes and a parallel spring, or mode 12 for spring alone. Head 3 time sets the longest delay; the other heads play at one third and two thirds of that time. Moving it bends the recorded echoes' pitch before they settle. This is a researched approximation with a synthetic spring, not a measured hardware clone. [Research and design limits](docs/research/re201-space-echo.md) describe the sources.

## Phone, iPad and desktop

The visual stays square. Controls sit below it in portrait and beside it in landscape, including iPad Split View. Narrow or short control areas use fewer columns and scroll internally. Rotation and resizing preserve playback and musical edits.

Start and Stop stay in a separate bottom bar with the value controls. Tapping the visual interacts with that editor; it does not toggle playback. Texture opens with its adjustments visible. Hide adjust hides the fields without resizing the square. Its Display, Texture, Scan and Variation tabs include Wave smoothing, a picture-only setting that starts at 65%.

The layout accounts for browser toolbars, safe areas and pinch zoom. [Verification](VERIFICATION.md) separates current checks from older screenshots and UI experiments.

## Save and recover

Save project downloads a `.hushfield.json` file containing Texture material, blend settings, source and harmony links, sound patches, Foundation settings and visual settings. Solo is temporary and is not saved.

New files use schema version 6 and store the selected Foundation instrument. Versions 1 through 5 retain the original Hushfield instrument; version 5 also retains its saved expressive/classic mode. Versions 1 through 4 load with their classic Foundation synthesis and shared-room routing, and keep those modes after re-export. A complete preset selects the current sound modes. Editing Foundation Sound switches its synthesis to the evolving voice. Editing any Space Depth control switches the whole Piece to independent room sends. These two changes are independent. The [saved-sound decision](docs/adr/0001-preserve-saved-sound-models.md) explains why.

Saved Pieces without an explicit Tape model retain Classic, including older schema-5 files. Worn memory also keeps Classic. Selecting Space Echo is a separate choice, saved with its head mode and spring level.

Undo and Redo keep up to 40 settings edits in a session. Loading a project, choosing a preset, replacing material or starting a New piece clears that history. Undo cannot restore discarded audio, recordings or playback position.

Hushfield stores one recovery draft of up to 30 MB in IndexedDB when the browser permits it. Open the session status button to recover or discard it. Recovery asks for your choice and starts paused. LOCAL DRAFT means browser-local recovery. EXPORTED means the browser started a download; it does not confirm that the file reached disk. Export a project for a separate, portable copy.

Imported audio stays in the browser. Record requests microphone access. The instrument has no analytics or runtime CDN dependency. See [saving and recording](docs/PLAYING.md#save-recover-and-record) for recovery status and recording limits.

## Audio troubleshooting

Tap or click to activate audio. If you hear nothing, try Test sound, then Restart audio. Check the blend, Solo, device volume and Bluetooth or AirPlay output. Restart audio rebuilds the audio context and keeps the session. Finish recording or capture first.

Background and locked-screen playback are not guaranteed. Earlier iPhone playback and recovery checks do not establish acceptance of the merged UI and music. Phone and tablet touch, performance and listening checks remain open. [Verification](VERIFICATION.md) records the evidence and its limits.

## Develop

Use Node.js 22 or newer and npm. The preview command also needs Python 3.

```sh
npm ci
npm run build
npm test
npm start
```

Edit sources in `dist/`, then rebuild. The build bundles the app and four AudioWorklet entry points, embeds the early viewport, navigation and startup scripts, and records source hashes. Generated files are committed so a clone can run without a build. CI runs the full suite on Node 22 and 24 and checks that rebuilding leaves shipped assets unchanged.

`npm run test:interaction` checks project validation, visual math, voice dots, startup, navigation, viewport behavior, shared controls and audio activation. Run the full suite for routing, recovery, recording, Orbit or Tape changes. See [testing](docs/TESTING.md), [architecture](docs/ARCHITECTURE.md) and [contributing](CONTRIBUTING.md).

## Contribute and license

Report bugs in [issues](https://github.com/jaredkirby/hushfield/issues), with your browser, device, orientation and steps to reproduce them. The [documentation index](docs/README.md) links the guides, glossary and historical reviews.

Hushfield uses the [MIT License](LICENSE). The app synthesizes its demo sources. Three optional Surge XT textures ship as WAV recordings with their patches and provenance. Select one in Your sound / trim to fetch it from the same host. Its original C4 pitch stays fixed as harmony changes. You do not need Surge installed to play it.

[Source provenance and authoring](docs/SURGE-TEXTURE.md) describes the separate native toolchain. The build dependency esbuild has its own MIT license and installs through npm.
