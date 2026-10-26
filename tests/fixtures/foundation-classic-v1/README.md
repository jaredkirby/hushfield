# Frozen classic Foundation reference

These three files are unmodified `dist/` sources from Hushfield commit
`6e5c607a76f53021ed4bb016fdd5a42a43edd817`, before expressive Foundation synthesis.
They are test-only reference code and must not be updated alongside the current engine.

The regression in [foundation-expression.test.mjs](../../foundation-expression.test.mjs) renders this reference and the current classic mode in the same
runtime and requires byte-identical Float32 PCM at 8, 44.1 and 48 kHz. JavaScript transcendental math may differ
between V8 versions, so a hash captured on Node 22 is not a portable Node 24 oracle.
The original Node 22 8 kHz / seed 719 / four-second interleaved-block hash was
`5248ba72dd5eec62d4a0b0639e7319ef38e3ecd9a57dd361d1bbeac9dbe0618d`.

Source SHA-256:

- `ambient-dsp.mjs`: `dd6cb0c26b61eb414f6fb24cb51d98da76e2c6e0e5cf2fd55aa09cc56b1ec2a0`
- `ambient-settings.mjs`: `f067b072123fb58c64b7468f1aa6c1bf00ecc554c67e9c4178b2c7cd5c0c2eb7`
- `ambient-points.mjs`: `930c70317bcb7eae0c79a44662828b57229e3001b3b5f087758eb4397a7cddc4`
