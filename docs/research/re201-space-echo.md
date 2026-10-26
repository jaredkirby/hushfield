# Roland RE-201 Space Echo research

Research checked 26 October 2026. This note separates documented RE-201 behavior from Hushfield's DSP choices. We have not measured a physical RE-201 or compared matched recordings against one. The goal is an RE-201-inspired Tape sound, with specific behaviors we can test.

## What the original controls do

Roland's original owner manual defines four echo-only modes, seven echo-plus-reverb modes and one reverb-only mode. Repeat Rate changes tape speed. Turning it clockwise shortens the echo interval. Intensity controls repeat level and can produce oscillation at high settings. Echo Volume changes echo level separately from the input. Bass and Treble affect the echoes. The following table transcribes the printed chart, checked visually because extracted PDF text loses its column alignment. [Original RE-201 owner manual, first PDF page](https://cdn.roland.com/assets/media/pdf/RE-201_OM.pdf)

| Mode | Playback heads | Spring reverb |
| --- | --- | --- |
| 1 | 1 | Off |
| 2 | 2 | Off |
| 3 | 3 | Off |
| 4 | 2, 3 | Off |
| 5 | 1 | On |
| 6 | 2 | On |
| 7 | 3 | On |
| 8 | 1, 2 | On |
| 9 | 2, 3 | On |
| 10 | 1, 3 | On |
| 11 | 1, 2, 3 | On |
| 12 | None | On |

## Tape transport, pitch and spring routing

BOSS's RE-20 manual describes the original RE-201's erase head, record head and three evenly spaced playback heads. It gives the ideal playback-time ratio as 1:2:3. The spring runs in parallel with the tape echo. The original tank has three springs arranged in a Z formation, with coupled motion. [RE-20 owner manual, printed pages 18 and 19](https://static.roland.com/assets/media/pdf/RE-20_OM.pdf#page=18)

The same account explains the pitch behavior. Increasing tape speed first raises the pitch of previously recorded material. Newly recorded material later reaches the heads and returns playback toward its original pitch. Friction and tape slippage cause continuous small speed changes and a chorus effect. Magnetic saturation compresses the recording, and tape speed also changes its tone. These are manufacturer descriptions of the original, rather than measurements of our model. [RE-20 owner manual, printed page 19](https://static.roland.com/assets/media/pdf/RE-20_OM.pdf#page=19)

One shared tape transport matters. Three unrelated modulated delays can produce three echoes, but their independent pitch movement would miss the shared mechanical cause.

## Circuit and timing limits

Roland's 30 July 1978 service notes show the selected playback heads feeding one playback preamp. The block diagram returns the echo through the tone section and Intensity control to the recording preamp. It also shows a separate dry input/buffer path and the parallel spring branch. This supports a shared feedback loop, rather than independent feedback for each head. This is an interpretation of the block diagram, not a component-by-component circuit simulation. [Roland service notes, printed page 2, PDF page 4](https://manuals.fdiskc.com/flat/Roland%20RE-101%20%26%20RE-201%20Service%20Manual.pdf#page=4)

The service notes give approximate tape speed as 12 to 40 cm/s and tone adjustment as plus or minus 10 dB at 100 Hz and 5 kHz. They do not establish an exact millisecond range for every head. [Roland service notes, printed page 18](https://manuals.fdiskc.com/flat/Roland%20RE-101%20%26%20RE-201%20Service%20Manual.pdf#page=20)

For comparison, Universal Audio's own RE-201 emulator manual lists head ranges of 69 to 177 ms, 131 to 337 ms and 189 to 489 ms. Those are the emulator's published values. They are slightly different from ideal 1:2:3 spacing and are not proof that all original units share those ranges. [UAD manual 6.1, printed page 509](https://media.uaudio.com/support/downloads/UADManual_61.pdf)

Hushfield should state its own time range directly. A 1.5-second maximum at head 3 is a useful extension for ambient Pieces, not a verified original specification.

## Avoid copying the RE-202 mode table

The original RE-201 is mono. BOSS describes true stereo I/O, twice the delay time, a fourth playback head and extra reverb types as RE-202 additions. It also documents saturation and wow/flutter controls that expose tape and preamp behavior. Those controls are useful emulation ideas, but their presence is not evidence that the original had the same controls. [BOSS RE-202 product description](https://www.boss.info/us/products/re-202/)

The RE-202's modes 8 through 12 use its fourth head. Its mode 12 also changes the head spacing. That table must not replace the original twelve-mode table above. [RE-202 reference manual, printed page 8](https://static.roland.com/assets/media/pdf/RE-202_reference_eng02_W.pdf#page=8)

## Use a speed model for the pitch glide

Zavalishin and Parker distinguish length-controlled delays from speed-controlled delays. A normal digital ring buffer that moves its read point directly changes effective head distance. A Space Echo changes tape speed. Its pitch ratio depends on playback speed divided by speed when the material was recorded. Their tape equation describes the fixed distance between record and playback heads as the integral of speed over the intervening time. [Efficient emulation of tape-like delay modulation behavior, DAFx 2018, sections 1 and 2](https://www.dafx.de/paper-archive/2018/papers/DAFx2018_paper_9.pdf)

The chosen Hushfield design stores cumulative tape distance beside each recorded audio sample. Each playback head finds the earlier sample whose coordinate is the current coordinate minus its fixed head offset, then interpolates the audio. Head offsets are 1, 2 and 3 distance units. This follows the paper's distance-history approach. It preserves shared speed history and the settling period after a speed change. The paper also describes floating-point drift, interpolation and aliasing concerns; our implementation still needs its own bounds and tests. [DAFx 2018 paper, sections 2 and 3](https://www.dafx.de/paper-archive/2018/papers/DAFx2018_paper_9.pdf)

## Hushfield choices and approximations

The implementation should keep the existing Tape sound available for saved Pieces. Selecting the new model can opt into a different sound without changing an older Piece merely by loading it. This follows the project's [saved-sound decision](../adr/0001-preserve-saved-sound-models.md).

The new path uses a mono tape recording and shared transport. Its direct preamp keeps the stereo channels separate and adds Drive saturation. The same mono echo goes to both output channels. Tape timing, Wow, Flutter and Tone do not process the direct sound. This is a simplified preamp design, not a measured recreation of the original's analog electronics.

Average selected heads for feedback, and divide their output sum by the square root of the active-head count. These gain choices keep dense modes usable without a sudden jump in loop gain. They are designed compensation, not measured RE-201 resistor ratios. Intensity should still reach sustained, saturated oscillation when deliberately pushed.

Apply soft saturation and frequency loss during recording and repeat circulation. A final output low-pass alone cannot make later repeats lose brightness progressively. Model slow wow and faster flutter as small changes in the shared speed, rather than adding independent LFOs after the heads. Deterministic modulation helps compare renders and diagnose changes.

Hushfield's parallel synthetic spring uses three independent damped delay paths with all-pass dispersion. It takes the input/preamp branch, not the tape output. The paths do not model the original springs' mechanical coupling. This produces a metallic, dispersive tail, but it does not reproduce the tank's mechanics. Spring lengths, decay and dispersion are tuned approximations until a measured reference is available.

The exact preamp transfer curve, magnetic hysteresis, head-loss response, motor inertia, modulation spectrum, tape splice behavior and original tank response remain unmeasured. No source here supplies calibrated values for those parts of our implementation.

## Tests that distinguish this model from a generic delay

1. With modulation, feedback, spring and drive disabled, inject an impulse and verify the twelve modes against the table. At constant speed, the head arrival times must follow 1:2:3 within the interpolation tolerance.
2. Feed a steady sine through one head, change speed and measure the temporary pitch ratio. Confirm that it returns toward the input frequency after the newly recorded signal reaches the head. Check all heads share the same speed history.
3. Isolate repeat windows after a bright impulse or noise burst. Verify later repeats lose high-frequency energy and that drive reduces peak-to-RMS ratio as input increases.
4. Set spring-only mode. Its onset must not wait for the tape delay, and no discrete tape repeats should remain. In combined modes, changing Repeat Rate must not retime the spring branch.
5. Sweep time, mode and Intensity during playback. Verify finite output, bounded peak level, continuous delay reads and a decaying tail after reducing feedback. Run at 44.1 and 48 kHz, with an additional low-rate DSP test for buffer bounds.
6. Test zero wet gain and true bypass against the input. Test older saved settings separately so that a new model does not silently replace their processing.
7. Render dry and wet comparisons with a transient phrase, sustained chords and a speed sweep. Listen for clear head rhythms, progressive repeat coloration, pitch settling and spring dispersion. Automated checks cannot establish that the result matches a serviced RE-201 by ear.

The next fidelity step is a matched impulse, level sweep and speed-change recording from a documented physical unit. Until then, describe the effect as RE-201-inspired and report tested behaviors rather than a percentage of authenticity.
