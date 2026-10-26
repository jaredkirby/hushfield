# Native Surge Texture sources and listening comparisons

Hushfield includes three original, native Surge XT recordings: an evolving wavetable pad, a damped physical string, and a soft FM bell. These are actual output from Surge's C++ synthesis engine. Hushfield's browser synthesis implements its own musical ideas; it does not embed Surge or load Surge patches at runtime.

## Play the sources

Open **Your sound / trim** and choose a source under **Surge textures · original C4**: **Evolving pad**, **Damped pluck**, or **Soft FM bell**. Selection loads that recording on demand. It becomes imported Texture material and can be trimmed, scanned, reversed, transposed, saved in a project, and recovered like another local recording. No source recording is downloaded at startup.

All three recordings contain one known pitch: **C4, MIDI 60, 261.625565 Hz**, in 12-TET with A4 = 440 Hz. The pad holds C4; the pluck and bell repeat C4 with space between strikes. Imported material retains that pitch while Foundation changes harmony. Texture's Pitch control transposes the whole recording; it does not automatically reharmonize imported sound. For an initial audition, hold a compatible Foundation chord, keep Texture pitch at zero, and use restrained Tape and room settings.

The pad suits longer grains. The pluck and bell offer attacks and decaying material for shorter grains. These are listening candidates, with human preference still open.

## Delivered source files

The library lives in [`dist/audio/surge/`](../dist/audio/surge/). Its [`manifest.json`](../dist/audio/surge/manifest.json) records URLs, pitch, duration, processing and WAV hashes. Each sound has a WAV, a native `.fxp` patch, and a concise JSON recipe/provenance receipt.

| Source | Format | Duration | Native raw peak | Native raw stereo RMS |
| --- | --- | --- | --- | --- |
| Evolving pad | 48 kHz, stereo PCM16 | 24 s | 0.12288 | 0.04835 |
| Damped pluck | 48 kHz, stereo PCM16 | 24 s | 0.09146 | 0.00305 |
| Soft FM bell | 48 kHz, stereo PCM16 | 24 s | 0.08868 | 0.02035 |

These three dry files total about 13.2 MiB. They preserve the native dynamics and contain no enabled synth effects. The authoring experiment also rendered separate restrained-reverb versions; those remain development candidates under `.scratch/surge-native/candidates/`, rather than adding three more downloads to the application.

Each patch starts from a simple upstream template, then applies documented original parameter choices. The pad uses the Wavetable oscillator with a slow external morph schedule; opening the `.fxp` alone restores its initial sound, while running the recipe reproduces the evolving gesture. The pluck uses Surge's String oscillator and shorter damping. The bell uses FM2 with restrained modulation and a soft onset. Source-template hashes and every edit are recorded beside each sound.

## Verify delivered audio

```sh
npm run surge:verify
```

This reads the shipped WAV bytes, verifies RIFF/PCM format, frame count, manifest hashes, audible headroom, sustained versus decaying envelopes, known-pitch metadata, and accompanying native patches. It does not require Surge, a browser, network access or speakers.

During authoring, an independent WAV analyzer also checked spectral movement in the pad and damping between pluck/bell strikes. Native float PCM was checked for non-finite samples and clipping before PCM16 encoding. Measurements establish technical behavior; they do not establish musical preference or physical-device sound quality.

## Rebuild the native authoring environment

The verified source is the official **`release_xt_1.3.4`** tag, peeled to commit **`f7b97c682ade0b87da85ca5968b63d5c7c98e68d`**. The isolated headless build identifies itself as `1.3.HEAD.f7b97c6` because upstream's local version generator includes the detached checkout name. The tag, commit, all submodule revisions, dependency versions, flags, Python ABI, local build patch and extension hash are recorded in [`toolchain-provenance.json`](../dist/audio/surge/toolchain-provenance.json).

The validated recipe targets macOS with Apple Command Line Tools and Python 3.9–3.11; Python 3.9.6 was used for the delivered recordings. It downloads the public source and pinned dependencies, then builds `surgepy` in `.scratch/surge-native`. It does not install an application, plug-in or system package.

```sh
python3 ops/listening-native-bootstrap.py
.scratch/surge-native/venv/bin/python ops/listening-native-render.py
.scratch/surge-native/venv/bin/python ops/listening-native-analyze.py
```

Each command accepts `--workspace /absolute/path` for a separate development directory. The render command writes six 24-second candidates, patches, recipes and a manifest beneath that workspace's `candidates/` directory. The analyzer reads the saved WAVs independently and writes `artifact-qa.json`. Neither command replaces the delivered application assets automatically.

The local compatibility patch in [`ops/listening-native-workspace.patch`](../ops/listening-native-workspace.patch) makes three build/storage adjustments without changing DSP equations:

- Route Surge user data through `HUSHFIELD_SURGE_USER_DATA` inside the workspace before defaults or user directories are created. `SURGE_DATA_HOME` separately selects the pinned factory data directory.
- Compile retained JUCE audio-basics code as Objective-C++ in the official headless build mode.
- Link the Cocoa, IOKit and Security frameworks required by retained JUCE core code.

The build targets macOS 14 rather than upstream's obsolete 10.9 target, disables application/FX plug-in/test-runner targets and system copying, and uses upstream's `SURGE_SKIP_WERROR` option for legacy dependency warnings under the newer compiler. The first standard GUI build could not compile an obsolete screen-capture API against the host SDK; the validated headless route avoids that GUI component.

The patches, note schedule, automation, tuning and source revisions are reproducible. **Native oscillator random state is not fully exposed**, so a new render is not promised to have identical PCM bytes. The seed in the recipe controls C-library randomness where supported; it does not claim to control every native random generator. Keep the delivered hashes as provenance for these recordings, rather than treating them as expected hashes for every future native render.

## Compare the browser instrument

```sh
npm run listening:prepare
npm run listening:serve
```

Open **http://127.0.0.1:4886/qa-musicality.html**. The page reports readiness, rendering progress and errors. **Run short audio check** exercises the graph quickly; **Render comparison** creates the full listening set:

- A: captured original baseline at commit `6e5c607a76f53021ed4bb016fdd5a42a43edd817`.
- B: new Motion patches and brightness behavior, with original Foundation and finishing.
- C: new Foundation expression, with original Motion patches and finishing.
- D: the combined expressive Piece and new depth routing.
- E: the combined Piece over three minutes, to expose its longer arc.

A–D run for 75 seconds. The audit uses one chosen preset, seed 26025, live Foundation Texture material, and a common Blend of Foundation 80 / Texture 30 / Motion 25 so every part is audible. This is a comparison setup, not a change to preset defaults. Each version records its exact settings and patch state.

The fixture uses real browser AudioWorklets, Motion bank effects, the shared Space path, Tape, limiter and master gain. It captures baseline sources from Git into ignored local development files; it does not add an old engine to the shipped instrument. Grain randomness is pinned only in generated comparison worklets. The fixture also delivers the same harmony/phrase payloads at deterministic audio blocks and starts all transports at audio frame 6144. At each quarter-second suspension, an explicit processor snapshot acknowledges the actual Foundation engine state before part gains are updated; a barrier also settles initial Motion settings. These fixture controls prevent offline MessagePort scheduling from silently changing musical events or normal gains. The production application's asynchronous channels have separate integration checks.

Playback levels are attenuated to the quietest example's stereo RMS. No version is boosted into clipping. This matches measured signal energy, not perceived loudness or LUFS. Listen at a comfortable level and compare note clarity, evolving color, recognizable phrases, transitions, silence and long-term fatigue.

WAVs and JSON receipts are saved under `.scratch/listening/artifacts/` and remain playable from the comparison page. Receipts contain source/fixture hashes, seeds, exact settings, raw metrics, playback gain and resulting WAV hashes. Repeated baseline/full renders are checked before claiming reproducible PCM. The native Surge recordings are separate optional material; they are not automatically inserted into these live-Foundation comparisons.

## Provenance and acceptance

[Surge's official FAQ](https://surge-synthesizer.github.io/faq/) permits use and distribution of sounds made with the synthesizer. Its GPL software license is a separate matter from generated output. The original application code does not incorporate Surge DSP source; the isolated native development build and its exact patch are documented separately. See the [official source](https://github.com/surge-synthesizer/surge) and [native binding documentation](https://github.com/surge-synthesizer/surge/tree/release_xt_1.3.4/src/surge-python).

Native source generation and artifact QA succeeded. Automated browser renders and PCM checks do not establish user preference, iPhone/iPad CPU behavior, speaker quality, touch latency, battery cost or background continuity. Record those separately before claiming the candidate is musically better on the intended devices.
