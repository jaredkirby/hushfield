# Vintage Space models

Research date: 2026-10-26. These are analog-inspired algorithmic candidates for audition, not measured replicas of named hardware. Proposed engineering choices below are our interpretation of the sources.

## Decisions for Hushfield

Keep Room as the existing sound and add Plate, Spring and Chamber as explicit choices. Preserve saved Pieces and fresh defaults until audition approves a change. This follows [ADR 0001](../adr/0001-preserve-saved-sound-models.md). Space remains the shared finishing stage; Depth still controls per-part sends and return filtering. Space's Spring has its own state and routing, independent of Tape's spring.

Give each model a different time structure, not just different EQ. Plate should bloom quickly into a dense tail; Spring should expose dispersive chirps and uneven echoes; Chamber should reveal a short reflection pattern before its diffuse decay. Keep the current Space/Depth controls meaningful across all models. Avoid adding a hardware-control panel before players hear the candidate.

## Plate

Dattorro's published plate-class network uses input allpass diffusion, a cross-coupled recirculating tank, damped delays and stereo output taps. It targets rapid reflection density and smooth decay. Input diffusion reduces audible repetition, while feedback damping makes high frequencies decay faster. See [Dattorro, *Effect Design, Part 1*, JAES 45(9), 1997, pp. 661–665, Fig. 1 and Tables 1–2](https://nagasm.org/ASL/Sketch14/fig5/EffectDesignPart1.pdf). The [author's original URL](https://ccrma.stanford.edu/~dattorro/EffectDesignPart1.pdf) was blocked by the search fetcher; the cited PDF is a mirror of the original paper.

Physical reference: EMT's own operation instructions specify a handwheel decay range of 0.8–5 seconds, calibrated at 500 Hz. Long settings have shorter high-frequency decay and greater low-frequency persistence. See [EMT 140 operation instructions, §2](https://www.barryrudolph.com/recall/manuals/emt140.pdf), an original manual hosted by an archive.

Proposed implementation: four short input allpasses into two cross-fed tank branches, each with delay, damping and diffusion. Derive decorrelated stereo taps from both branches. Scale published delays by sample rate if using that topology. Use subtle modulation only where needed to break repetition, because obvious chorus will change the intended character. Keep feedback bounded below unity.

Controls: Decay changes feedback and damping coherently; Tone changes input bandwidth and high-frequency decay; existing Width changes the stereo return. A long predelay is optional creative behavior, not an intrinsic plate property. A compact network cannot establish EMT-unit authenticity without measured comparison.

## Spring

A helical spring supports several propagation modes with frequency-dependent velocities. Its impulse response contains dispersive chirps and repeated arrivals. [Parker and Bilbao, *Spring Reverberation: A Physical Perspective*, DAFx-09, §§2–4](https://www.pure.ed.ac.uk/ws/portalfiles/portal/12456049/Spring_Reverbation_A_Physical_Perspective.pdf) identifies these physical and perceptual features. Generic diffusion with a narrow bandwidth does not reproduce them.

An efficient parametric model combines delay feedback with allpass dispersion, output resonance and filtering. The low-frequency branch includes dispersion in the return path; the secondary high-frequency branch can omit that cascade to reduce computation. See [Gamper, Parker and Välimäki, *Automated Calibration of a Parametric Spring Reverb Model*, DAFx-11, §2, Fig. 1](https://www.dafx.de/paper-archive/2011/Papers/39_e.pdf). [Parker's author-hosted companion recordings](https://research.spa.aalto.fi/publications/papers/jasp-spring/) provide full-effect and isolated dispersive-branch examples, including efficiency modifications.

Proposed implementation: two unequal dispersive feedback paths, each using a modest allpass cascade and damped return. Combine their taps into a restrained stereo image. Start with the perceptually important chirp behavior; do not claim a physical simulation. A small cascade will approximate dispersion over a limited band, so listen for metallic ringing and thin comb-filter coloration.

Controls: Decay changes loop loss, Tone changes excitation and damping, and an optional Character control changes dispersion within stable limits. Do not substitute periodic pitch wobble for dispersion. Leave crash noise and tank knocks out of the default sound.

## Chamber

Abbey Road describes a loudspeaker exciting a hard reflective room, with microphones recording its reflections, including reflections around pillars. See [Abbey Road, *Studio Two Echo Chamber*, 2022](https://www.abbeyroad.com/news/studio-two-echo-chamber-gearthatmadeus-3114). Its [first-party chamber product description](https://www.abbeyroad.com/audio-products/71/modal) also names the speaker, microphones and optional tape-based processing. This supports treating acoustic reflections and transducer coloration separately from Tape.

Proposed implementation: a deterministic stereo set of unequal early-reflection delays feeding a damped diffuse late tank. Give the early pattern more presence than Plate and a slower density build. Apply gentle input bandwidth limits to suggest speaker/microphone coloration. This is a design abstraction, not a geometric model of Studio Two. Actual chamber response depends on source, microphone positions and boundaries; an arbitrary tap pattern cannot authenticate that room.

Controls: Decay controls the late tail; Tone controls coloration and damping; Width controls the returned stereo field. Keep any early/late balance internal for the first audition.

## Browser cost and acceptance

Use preallocated typed-array delay buffers and sample-rate-aware coefficients inside the audio processor. Avoid allocation in processing. These are implementation recommendations, not measured performance claims. Compare the models at matched wet loudness before tuning defaults. Evaluate short impulses for onset, chirps and ringing, sustained Foundation audio for accumulated mud, and Motion transients for audible repetition. Listen in stereo and mono, with Tape bypassed and enabled. Automated stability and compatibility checks do not establish musical acceptance or physical-device performance.

Write original code from the published structures. Public paper access does not grant a license to copy third-party implementations, recorded impulse responses or commercial plugin assets. No proprietary code or sampled commercial chamber response is required for this proposal.
