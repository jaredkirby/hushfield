# Original Space reference

`piece-space.mjs` is frozen byte-for-byte from commit `af4c346`, before Vintage Space audio changes. SHA-256: `d7aa499be8eb286731285c38a27ab86ee36d44b837a967830cd0b5b2c74edc4f`.

Do not refresh this reference to make changed audio pass. The browser diagnostic bundles the fixture and current source into the same runtime and compares exact PCM for both legacy shared room and modern Depth routing. `dist/qa-space-reverb.html` also checks the actual new graph through OfflineAudioContext.
