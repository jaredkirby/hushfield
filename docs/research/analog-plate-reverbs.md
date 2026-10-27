# Analog studio plate reverbs

Research checked 27 October 2026. This note separates original hardware documentation, published physics, and recommendations for Hushfield's Space candidate. No physical unit was measured and no DSP or interface was changed.

The useful correction is simple. An EMT-style pair of surfaces represents one vibrating metal plate and one movable absorber. Closing their gap shortens the tail. The documented mechanism does not make that gap a pre-delay control.

## The EMT 140 mechanism

The EMT 140 TS has a steel sheet in a shock-mounted frame. A moving-coil driver excites it; two ceramic contact pickups sample different positions. A separate porous damping panel moves toward or away from the sheet. Bringing it closer increases damping and shortens reverberation. EMT specifies a minimum separation of about 1/8 inch without contact, giving roughly one second at 500 Hz. The motorized version changes that same separation remotely. [EMT 140 TS manufacturer brochure, April 1971, printed/PDF pages 3–5](https://www.preservationsound.com/wp-content/uploads/2013/09/EMT_140_ts_1971.pdf#page=3).

Stereo comes from two pickup positions on the same vibrating sheet, with frequency-dependent phase relationships. The driver receives a combined mono signal, while the pickups have separate return amplifiers. Two output channels do not imply two vibrating plates. [EMT brochure, pages 6–7](https://www.preservationsound.com/wp-content/uploads/2013/09/EMT_140_ts_1971.pdf#page=6).

Specifications are frequency- and version-specific. This brochure lists 1–4 seconds at 500 Hz, while its descriptive text gives about five seconds at 500 Hz without additional damping and about 1.5 seconds at 10 kHz. Avoid presenting one universal decay range for every EMT 140. [EMT brochure, pages 2 and 8](https://www.preservationsound.com/wp-content/uploads/2013/09/EMT_140_ts_1971.pdf#page=8).

## What travels through the metal

Arcas and Chaigne describe a 2 m × 1 m, 0.5 mm steel plate and test a thin-plate model against an EMT 140. The relevant motion is transverse bending. Waves spread across the sheet, reflect at its boundaries and excite many resonances. In their Kirchhoff–Love model, higher frequencies travel faster than lower frequencies. This dispersion spreads an impulse in time, so individual echoes cease to resemble distinct room reflections. Internal and external losses determine the frequency dependence of decay. [Arcas and Chaigne, *On the quality of plate reverberation*, Applied Acoustics 71, 2010, pages 147–156, especially sections 2, 4 and 6](https://www.sciencedirect.com/science/article/pii/S0003682X09001716). The publisher's accessible preview includes those section excerpts; the full paper was not available during this research.

This explains why a plate is more than a repeating echo with its treble reduced. Its onset and dense tail arise from a dispersive resonant sheet. It also explains why literal room geometry is a poor explanation for the two surfaces in the candidate.

## Why the gap controls decay

EMT's smaller 240 manual explains the energy transfer explicitly. A vibrating foil gives energy to surrounding air. Bringing an absorber closer removes more energy from that sound field and damps the decay. Slots in the damping material make the absorption frequency-dependent. This is acoustic damping near a vibrating surface, rather than a pad pressing against it. [EMT 240 instruction manual, printed page 3, PDF page 4](https://thehistoryofrecording.com/Manuals/EMT/EMT%20240%20full.pdf#page=4).

The 240 retains the tensioned-sheet, driver and pickup principle, but uses an electroplated 24-carat gold foil, 18 μm thick and 270 × 290 mm. It is a different mechanical design, not merely a steel 140 scaled down. [EMT 240 manual, page 3](https://thehistoryofrecording.com/Manuals/EMT/EMT%20240%20full.pdf#page=4).

## Decay and pre-delay describe different things

Decay describes how the reverberant energy dies away after excitation stops. Added pre-delay describes a delay between the direct sound and the input to, or return from, the reverberator. This distinction concerns the signal path. It does not require the physical plate's first response to be instantaneous.

The cited hardware descriptions establish gap-controlled damping. They do not establish gap-controlled pre-delay. The plate's dispersive onset is also different from inserting a clean, adjustable silent interval before its response. Therefore the current mapping of separation to both decay and pre-delay is an artistic macro. Calling it a reconstruction of the original mechanics would overstate the evidence.

Universal Audio's EMT 140 documentation describes historical added pre-delay using a tape deck, with tape speed determining the delay. This supports treating it as a separate processing stage. [Universal Audio, UAD Powered Plug-Ins Manual v6.1, printed page 236](https://media.uaudio.com/support/downloads/UADManual_61.pdf#page=236).

## Implications for a truthful two-surface candidate

These are design recommendations, not original EMT specifications:

- Depict one metal sheet and one visibly different absorber. Move the absorber to explain damping. A symmetric two-surface gesture can remain an interaction convenience if the labels explain the actual relationship.
- Map a smaller gap to stronger damping and a shorter decay. Keep a visible gap at the closest setting. Do not imply collision or squeezing.
- Give added pre-delay its own control or timing cue. If one gesture continues to change both parameters, label it as a designed Space macro and show both resulting values.
- Show stereo through two pickup locations or two responses on one sheet, rather than two separate resonators.
- Treat animated ripples as an explanatory illustration. Their visible speed and amplitude would need calibration before they could claim to display the physical displacement or propagation of a real unit.

A delay-network or convolution implementation can be plate-inspired without solving plate mechanics. The research literature explicitly distinguishes physical numerical models from efficient hybrid reverberators that capture an onset with convolution and generate the late decay with a feedback delay network. [Välimäki et al., *Fifty Years of Artificial Reverberation*, section 3.2, discussion of the hybrid plate reverberator](https://mural.maynoothuniversity.ie/id/eprint/4696/1/VL_recent%20advances.pdf).

For any later implementation, verify gap direction, band-dependent decay, the independence of added pre-delay, and stereo differences with impulse renders. Listening against a documented physical unit remains a separate step. Existing saved Pieces must retain their established sound under the [saved-sound decision](../adr/0001-preserve-saved-sound-models.md).
