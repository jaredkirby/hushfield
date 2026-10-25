# Tape impact review

Scope: [audible shared Tape](specs/tape-impact.md), [issue #12](https://github.com/jaredkirby/hushfield/issues/12). Baseline: 90cf6ff. Implementation: 4012811. Local commits only; no push or deployment.

## Findings and changes

The shared route was already connected. Off still included echo, quiet Foundation signals produced little saturation, and wow/flutter affected repeats only. Tape also lacked initial processor settings and a readiness acknowledgement.

Off now bypasses coloration and repeats at the existing 0.75 dry reference level. On applies a bounded eight-millisecond tape head with tone, stronger saturation and continuous pitch movement to the direct piece. Echo remains separately controlled by Mix. New-piece defaults are Drive 55%, Wow 45%, Flutter 25% and Mix 28%; saved control values remain intact. Startup supplies settings through processorOptions and reapplies them after a guarded ready acknowledgement.

Parameter changes and bypass remain smoothed over 35 milliseconds. Gain compensation stays outside the feedback loop; feedback is capped and attenuating. Hiss remains input-gated, so idle silence stays silent.

## Independent review

Standards: no material findings. The reviewer confirmed bounded audio-thread buffers, shared routing, saved control preservation, startup handling and feedback constraints.

Spec: no material findings. Four focused tests passed independently. Additional renders of the four actual Foundation scenes isolated direct coloration by disabling echo and modulation; On versus Off RMS ranged from -1.19 to +0.52 dB, supporting reasonable level matching.

## Verification

- Build passed; full Node suite: 41 passed, 0 failed. Checks cover true bypass, direct movement with Mix zero, low-level harmonics, tone, echo timing/decay, finite output and startup settings.
- Actual browser Worklet: 10 checks passed across 44.1 and 48 kHz for constructor settings, shared-path bypass, default PCM change, echo tails and delivered on/off messages.
- Actual app: enabled Tape before starting audio, started successfully, toggled Off and On during playback, then stopped. No browser warnings or errors were recorded.
- Tape controls: six viewport sizes passed, from 320 x 568 through 1440 x 900, with no document overflow or clipped buttons/selects.
- `git diff --check` passed.

Browser receipt: tests/tape-browser-results.json. Screenshot: docs/images/tape-impact.jpg. The receipt includes the tested build manifest hash. PCM differences include phase and latency effects and do not measure perceived improvement. Subjective listening acceptance on the player's device remains outstanding.
