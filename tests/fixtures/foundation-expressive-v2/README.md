# Frozen expressive Foundation reference

These files are exact, unmodified copies of `dist/` sources at Hushfield commit
`4be348a672039318e26f9dba3d84f0bed763c132` (`4be348a`), before Foundation instrument selection.
They are independent test-only reference code. Never regenerate or update these
files alongside the current engine. Their relative imports resolve only within
this fixture, preserving the original defaults and settings interpretation.

`tests/foundation-instruments-compat.test.mjs` uses the public `AmbientEngine`
interface to compare stereo Float32 PCM in the same JavaScript runtime at
8, 44.1 and 48 kHz. This avoids treating runtime-dependent transcendental math
as a synthesis regression. The original classic fixture remains independent.

Source SHA-256:

- `ambient-dsp.mjs`: `b3727a539823dfc1d6051ea716113a42db15285e61703af4d9e93b08b680c81f`
- `ambient-settings.mjs`: `b92586edebc51cb52538a5ff5145984a523873b39e22fdbcc5c0c84be5c8145b`
- `ambient-points.mjs`: `930c70317bcb7eae0c79a44662828b57229e3001b3b5f087758eb4397a7cddc4`
