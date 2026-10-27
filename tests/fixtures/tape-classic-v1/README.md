# Frozen Classic Tape reference

These three source files are unmodified copies from commit `ac4790f05fcd4139b546cd995c01bd718085e9c5`, before the RE-201-inspired model. The source retains its relative imports so the reference runs independently of current DSP and settings.

`tests/re201-dsp.test.mjs` compares exact stereo Float32 PCM in the same JavaScript runtime at 8, 44.1 and 48 kHz, including parameter changes and bypass. Do not refresh these files when changing Tape. They protect the sound of existing saved Pieces.
