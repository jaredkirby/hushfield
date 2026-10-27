# Foundation instrument models

These instruments use selected analog-synthesizer behaviors as design references. No physical reference units were measured, and no percentage of authenticity is claimed. Existing classic and expressive Hushfield synthesis remain available and are checked against frozen same-runtime reference engines.

| Model | Implemented character | Limits |
| --- | --- | --- |
| String ensemble | Bounded string harmonics and three fractional-delay ensemble taps with shared slow/fast modulation. | No original divide-down electronics, register filters or bucket-brigade circuit model. Bloom controls ensemble presence. |
| Chorus synth | Bandlimited saw/pulse/sub sources, pulse-width movement, resonant digital low-pass filtering and a shared stereo modulated-delay chorus. | No Roland oscillator, filter or bucket-brigade circuit simulation; modulation and gains are tuned choices. |
| Complex synth | Bandlimited harmonic redistribution and repeated gates that couple brightness with amplitude. | No direct nonlinear wavefolder, audio-rate FM or vactrol component model. The limited spectrum deliberately avoids uncontrolled foldover. |
| Morph synth | Two bandlimited oscillator sources and a stable two-pole state-variable filter with low-pass/notch/high-pass response mixing. | No SEM circuit nonlinearities. Band-pass is not on the continuous morph path. |
| Bass synth | Three bandlimited oscillators, restrained saturation and four cascaded low-pass poles. One chord voice glides; melody is separate. | No transistor-ladder feedback/resonance model. The low register and single-voice chord behavior are Hushfield choices. |

Color, Drift and Bloom retain their 0–100 ranges but control each model's own behavior. The existing composer retains chord/motif timing, seed, voice-dot pitches and harmony messages. Selecting Bass synth changes the audible chord voicing to one note; it does not reduce the chord sent to Motion. Live Texture receives the chosen Foundation output before its audible Blend gain.

New files store an instrument identifier in project schema 7. Versions 1–5 restore the original instrument, with their existing composition and room compatibility rules. Versions 1–6 retain Original room, and fresh sessions also keep that reverb. Scene and New piece retain the instrument. Fresh sessions and the Stillwater Whole piece preset select Chorus synth with Space Echo on. The other Whole piece presets retain the original Hushfield voice. New instrument selection opts into expressive composition; merely loading an old Piece does not.

Foundation starting presets replace only the instrument, expressive model, Color, Drift, Bloom and Chords/Melody/Air levels. Names are derived from matching those values rather than stored in the project. Harmony, Scene, voice dots and shared finishing remain independent of the starting sound.

## Sources

- [Roland JUNO-60 specifications](https://support.roland.com/hc/en-us/articles/201955179-JUNO-60-Technical-Specifications) document saw, pulse, PWM, sub and resonant filter controls. [Roland's software manual](https://static.roland.com/assets/media/pdf/PG-JU60_Manual_eng01_W.pdf) documents its chorus implementation; it is an emulator reference.
- [Arturia Solina V manual](https://dl.arturia.net/products/solina-v/manual/solina-v_Manual_2_10_1_EN.pdf) documents the string-ensemble architecture. This is an emulation manufacturer's account, not a measurement of an original Solina.
- [Buchla Music Easel](https://buchla.com/product/music-easel-modern/) describes the complex oscillator and dual low-pass gates. Hushfield captures coupled brightness/amplitude shaping with a bounded harmonic model.
- [Oberheim's TEO-5 introduction](https://oberheim.com/news/introducing-the-new-oberheim-teo-5-polyphonic-synthesizer/) describes the SEM-derived low-pass/notch/high-pass morph and separately selected band-pass response.
- [Moog Model D manual](https://back.moogmusic.com/sites/default/files/2022-11/Minimoog_Model_D_Manual.pdf) documents the oscillator bank and ladder-filter behavior. Hushfield's four-pole digital filter approximates a broad tonal role rather than that circuit.

## Listening

Serve the app and open `/qa-foundation.html`. Compare dry examples first, then the same settings through Space Echo. All clips use a common gain; none is individually normalized. Judge identity, balance, movement and transition quality separately from signal-safety checks. The generated receipts include source hashes, parameters and sample rates. Human audition and physical-device performance remain acceptance steps. The separate [Vintage Space comparison](../dist/qa-space-reverb.html) provides five 12-second, 48 kHz Stillwater clips with six seconds of excitation and six seconds of tail, plus optional Space Echo. It compares dry, Original room, Plate, Spring and Chamber. See its [research note](research/vintage-space.md).
