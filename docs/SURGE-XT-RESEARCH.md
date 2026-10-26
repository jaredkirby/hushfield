# Surge XT ideas for Hushfield

This is the research snapshot before implementation. See the [approved specification](specs/surge-musicality.md), [playing guide](PLAYING.md), and [native/listening workflow](SURGE-TEXTURE.md) for the implemented behavior.

Researched 2026-10-25 (America/Los_Angeles). Research and proposals only; no installation, audio rendering, application changes, or listening evaluation was performed. Local terminology follows [GLOSSARY.md](../GLOSSARY.md).

## Recommendation

Use Surge XT first as a sound-design reference and an optional source of rendered Texture material. Borrow its separation of individual-note expression, slow shared movement, and coordinated controls. Evaluate improvements by listening before considering a larger synthesis engine or browser port.

## Verified project status

The official production download is **Surge XT 1.3.4**. The macOS package is universal Intel/ARM and provides standalone, AU, CLAP, and VST3 versions. Windows and Linux builds are also available. No browser package appears on the production downloads page. [Downloads](https://surge-synthesizer.github.io/downloads/)

The 1.3.4 release corrected issues including patch tempo handling and LFO/step-sequencer presets. It is distinct from ongoing nightly development. For a repeatable sound comparison, pin the production version and patch files. [Release 1.3.4](https://github.com/surge-synthesizer/releases-xt/releases/tag/1.3.4)

## Useful synthesis patterns

The factual column summarizes Surge; the Hushfield column is a proposed musical application, not a tested improvement.

| Pattern | Verified Surge capability | Proposed application |
|---|---|---|
| Complementary layers | Two scenes can layer or split; each has three oscillators. [Overview](https://surge-synthesizer.github.io/) | Keep a stable harmonic bed beneath a quieter, changing upper layer. Judge whether the two have distinct musical roles. |
| Timbre families | Wavetable, FM2/FM3, and String algorithms; String uses two filtered waveguides for plucked/bowed sounds. [Overview](https://surge-synthesizer.github.io/) | Audition three restrained identities: soft evolving pad, delicate glass, and damped string. Choose the identity before adding effects. |
| Voice versus shared movement | Voice modulation is independent per note; scene modulation shares one path. Only scene sources can drive shared FX parameters. [Manual](https://surge-synthesizer.github.io/manual-xt/#voice-vs-scene-modulators) | Give notes small differences while one slower phrase arc shapes the Piece. Avoid making every part swell together continuously. |
| Shaped phrases | MSEGs support curved segments, envelope/LFO modes, and gated loops. [Manual](https://surge-synthesizer.github.io/manual-xt/#multi-segment-envelope-generator) | Try rise–hold–recede phrasing with some quiet intervals. Compare against continuous periodic movement at matched loudness. |
| Filter character | Two filters support eight configurations, including feedback; lowpass, bandpass, comb and other models are available. [Overview](https://surge-synthesizer.github.io/) | Shape each part into its own frequency region before increasing its level. Test gentle tonal opening rather than large resonant sweeps. |
| Effects hierarchy | Sixteen slots: four inserts per scene, four sends, four masters. [Overview](https://surge-synthesizer.github.io/) | Give a part its own color, then place the parts in one shared space. Audition dry first so reverb cannot hide weak source material. |
| Coordinated performance | Eight macros are shared across scenes and can be renamed and mapped. [Manual](https://surge-synthesizer.github.io/manual-xt/#macros) | A few bounded musical gestures could coordinate existing parameters. Names such as Warmth or Distance are candidates for listening tests, not settled UI choices. |

These patterns suggest richer relationships between sounds rather than an obligation to reproduce Surge's complete interface. Hushfield's Foundation, Texture and Motion remain the organizing concepts; a Surge scene is not a proposed new Hushfield domain object.

## A practical reference-sound workflow

**Proposed experiment:** create three short reference families in a native host, using the same harmony and similar register: an airy pad, a soft glass strike, and a damped string. Render both dry and lightly processed versions. Keep dynamics and release tails, then loudness-match playback for comparison. The names describe sound targets; they are not claims that particular factory presets already meet them.

For optional imported Texture material, start with a single sustained pitch or a deliberately chosen chord and record its root, tuning, duration and processing. A rendered chord retains its original harmony; it should not be assumed to follow future Foundation changes. Check seams, transposition range, memory use and the actual browser import path before treating an export as a usable asset.

Preserve the synth version, patch, MIDI or note schedule, sample rate, and asset provenance alongside each candidate. A small curated set would make it easier to decide what actually improves Hushfield than importing a whole preset library.

Native automation is plausible if manual auditions prove useful: the official developer README documents Python bindings that must be built, and the separate examples repository demonstrates that route. This is a development option, not a verified toolchain on this Mac. [Developer README](https://github.com/surge-synthesizer/surge#building-and-using-the-python-bindings), [surge-python examples](https://github.com/surge-synthesizer/surge-python)

The release changelog also documents a headless CLI and OSC control; 1.3.4 added input/output bus handling and Python audio-stream support. A future repeatable render pipeline could investigate these interfaces, but CLI availability alone does not establish a finished offline file-export workflow. [Changelog](https://surge-synthesizer.github.io/changelog/)

## Browser integration: feasible research, not a drop-in download

The native formats on the download page are not Hushfield browser components. However, claiming that the synthesis engine cannot run in a browser would also be wrong. In an open experimental browser-port discussion, a project collaborator states that `surge-common` already runs in Cardinal's WASM host and suggests WCLAP. Another collaborator says the team is unlikely to pursue the full browser UI itself. The issue author's broad effort estimate is disputed and should not be used for planning. [Official repository discussion #8581](https://github.com/surge-synthesizer/surge/issues/8581)

The cited Rack change includes an Emscripten-specific adaptation from threads to timer intervals. It is evidence of existing web-related engineering, not proof of full Surge XT editor compatibility in Hushfield. [Surge Rack change #702](https://github.com/surge-synthesizer/surge-rack/pull/702)

**Engineering judgment:** adapting a handful of synthesis/control ideas to the present engine is a smaller initial commitment than embedding the full synth. If complete Surge patch compatibility becomes a requirement, first test a pinned WASM build, representative patches, loading behavior, audio deadlines, startup size and target mobile browsers. No browser feasibility or performance test was performed here.

## Licensing and provenance

Surge's official FAQ says generated songs, samples, sounds and patches may be distributed or commercially used, including sounds made from factory presets. It distinguishes this output from modification or distribution of the GPL3 software. This supports using self-rendered sound material as a practical experiment. [Official FAQ](https://surge-synthesizer.github.io/faq/)

The source repository identifies its software license as GPL-3.0. Copying DSP or distributing an engine build is a separate decision from learning a synthesis technique or recording audio. Keep the precise source revision and applicable notices if code reuse is later proposed. Imported third-party source audio/wavetables should retain their own provenance; this research did not audit every bundled or external asset license. [Source repository and license](https://github.com/surge-synthesizer/surge)

## What this means for our music

### Local evidence and limits

Reviewed `hushfield-web` main at `6e5c607a76f53021ed4bb016fdd5a42a43edd817`. SHA-256 comparisons found identical versions of the eight inspected audio/settings modules in `hushfield-web`, `hushfield-rack`, and `hushfield-controls`: ambient DSP/settings, Orbit DSP, sound patches, Piece presets/Space, grain worklet, and Tape DSP. The latter two checkouts contain ongoing interface changes. This research does not change those files.

These are source-backed observations, not listening judgments. No Surge installation, new render, listening comparison, or device benchmark was performed. The recommendations below are hypotheses for improving musical character, coherence, and control.

| Area | What is already implemented | Opportunity |
| --- | --- | --- |
| Foundation | Two slightly detuned sine components plus a small second harmonic per sustained voice; phase-offset breathing and pitch motion at fixed rates; eight-second chord crossfades. | Give the bed a small palette of identifiable timbres and slower changes in harmonic content. |
| Motion | Five waveform choices, FM with an automatic decay, amplitude envelopes, per-note lowpass coefficients, drive, and bank delay/reverb sends. | Design distinct patches first; then consider a separate brightness envelope. |
| Complete-piece presets | Different scenes, blends, Texture and finishing parameters, but every preset calls the same `createSoundState()`. | Make the Motion instruments part of each preset's identity. |
| Texture | Live four-second Foundation buffer, freeze/import, scan, scatter, reverse, pitch and grain variation. | Richer Foundation tones automatically provide richer source material; imported Surge audio can test this direction quickly. |
| Space | Shared lowpass/type-selectable filter, stereo width, and a generated four-second convolution impulse; Motion also has bank effects. | Separate foreground clarity from background depth before adding more effects. |

Sources: [`AmbientEngine.process`, `nextChord`, `spawn`](../dist/ambient-dsp.mjs), [Foundation scene definitions](../dist/ambient-settings.mjs), [`OrbitEngine.note/process`](../dist/orbit-dsp.mjs), [patch definitions](../dist/sound-patches.mjs), [complete-piece presets](../dist/piece-presets.mjs), [grain processor](../dist/grain-worklet.js), [Space graph](../dist/piece-space.mjs), and [current routing architecture](ARCHITECTURE.md).

### Recommended order

**1. Give each Piece a deliberately designed Motion sound.** This is the cheapest first experiment and can initially use existing controls. Proposed starting directions, not finished patches:

- **Stillwater:** sparse, rounded sine notes, little FM, gentle onset, restrained level.
- **Slow cloud:** soft triangle tones with a slower attack and lower cutoff; less foreground activity.
- **Glass shards:** sine-based FM bells, short onset, clear attack followed by a darker tail. Existing FM decay provides a starting point; an independently shaped filter envelope would be a later addition.
- **Worn memory:** muted plucks with short dry bodies, leaving the existing Tape repeats audible between notes.

Keep different roles for trigger and ball banks: a recurring motif versus occasional answers. The current patch model already supports bank defaults and per-item overrides. Change only the sound patches in the first comparison so their effect can be heard separately from mix changes. Source: [patch state and editing](../dist/sound-patches.mjs).

**2. Add one evolving Foundation timbre.** Prototype a small, original, band-limited wavetable bank or harmonic-series morph alongside the current sine bed. Let harmonic content open gradually while the fundamental stays steady. Start with one useful sound and modest detuning; a large oscillator catalogue is unnecessary for the first evaluation. Foundation feeds live Texture before its audible fader, so this change potentially improves both parts. Source: [Foundation rendering](../dist/ambient-dsp.mjs) and [signal path](ARCHITECTURE.md#normal-signal-path). The benefit is an inference, to be tested by listening.

**3. Introduce two scales of movement.** Give each Foundation voice small, seeded variations in timbre and envelope, while one much slower phrase contour coordinates the Piece. A proposed two-minute contour might open brightness, introduce a few Motion notes, thin the Texture, and return to stillness. These timings are composition choices, not Surge defaults. Avoid having every parameter rise together: as Texture becomes denser, Motion can become sparser. Existing Evolution changes detuning depth and, above a threshold, chord-root selection; it is not currently a full arrangement control. Source: [`nextChord` and `process`](../dist/ambient-dsp.mjs).

Expose this initially through a small number of musical controls, such as **Color**, **Drift**, and **Bloom**, with bounded mappings to several parameters. Do not silently redefine the saved meaning of Evolution in old projects.

**4. Improve musical phrasing as a separate experiment.** Retain a short melodic motif and vary its ending; allow intentional gaps; choose nearby chord inversions to reduce unnecessary voice jumps. Foundation currently chooses each new melody note from a degree pool and uses predefined root sequences with optional random selection. A stronger synth alone does not supply phrase memory or voice-leading. These recommendations come from the local composition code, not a claim that Surge composes better music. Source: [`spawn`, `nextChord`](../dist/ambient-dsp.mjs), [`ambientVoiceMidi`](../dist/ambient-settings.mjs).

**5. Refine depth after the sources work.** Keep bass and principal notes relatively centered and clear; place texture farther back. Consider per-part room sends and a highpass/lowpass on the wet return, preserving the current shared room as a cohesive space. This requires graph work because Foundation and Texture currently share the finishing path. More reverb or Tape should be auditioned as a creative choice, not assumed to improve the result. Source: [Space implementation](../dist/piece-space.mjs) and [routing](ARCHITECTURE.md#normal-signal-path).

### A practical Surge-to-Hushfield experiment

Use Surge in a compatible desktop host to design three original sources: a slowly changing sustained tone, a damped pluck, and a soft FM bell. Record separate, mostly dry WAVs of roughly 15–30 seconds, documenting pitch, patch, and version. These durations are proposed starting points. Import each through **Your sound / trim**, which retains up to 60 seconds of audio, and audition it through Texture. Try long grains for the sustained source and shorter grains for the pluck/bell. Keep Tape and room restrained initially so the source is audible. Source for Hushfield import behavior: [playing guide](PLAYING.md#texture-sources).

Use a single known note, noise-like texture, or a chord matched to a held Foundation harmony. Imported/frozen audio keeps its original pitch: it does not follow later chord changes automatically. A recorded chord cannot become a new chord merely by transposing the entire recording. Keep this limitation visible when judging whether imported sources suit an evolving Piece. Source: [Texture source relationships](PLAYING.md#texture-sources).

### Listening and implementation gates

Start with three 60–90-second versions of the same Piece: **A** current baseline, **B** redesigned Motion patches only, **C** evolving Foundation tone only. After choosing useful changes, compare the combination over several minutes. Match perceived loudness and retain the same musical events where possible. A shared seed alone does not make the full output identical: the grain processor uses `Math.random()`, and saved projects do not preserve exact transport position. For rigorous later comparisons, record the events/source material or add a deterministic render fixture. Sources: [grain randomness](../dist/grain-worklet.js), [project architecture](ARCHITECTURE.md#files-recording-and-recovery).

Judge whether notes remain distinct, texture evolves without fatigue, transitions feel intentional, and the quiet version is still engaging. Listen on headphones and the intended phone/tablet speakers. User preference decides whether the candidate is musically better; spectrum and peak measurements cannot establish that alone.

If implemented later, check sustained playback on the target iPhone/iPad, transition clicks, peaks/non-finite samples, mono compatibility, dense-voice CPU behavior, and old project recovery. New timbre/modulation settings need explicit serialization and migration because the current validators accept a defined field set. Sources: [project validation](../dist/project-file.mjs), [Foundation validation](../dist/ambient-settings.mjs), and [existing acceptance limits](../VERIFICATION.md).

**Recommended first scope:** a distinctive Motion patch for each existing Piece preset, followed by one evolving Foundation voice and a listening comparison. Defer a complete Surge port, a general modulation matrix, and additional effect families until the listening results justify them.
