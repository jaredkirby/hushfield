# Audible shared Tape

Historical approved scope. Original baseline and local-only completion instructions are retained as a record; the work was subsequently integrated into main. See [current guides and review history](../README.md) for later behavior and superseding decisions.

## Problem

The player cannot distinguish Tape On from Off. Off currently retains the same echo; the coloration is too weak at normal Foundation levels, and cold-start processor settings lack a readiness acknowledgement.

## Approved outcome

Verify the shared route, then strengthen Tape's audible character. Off bypasses the entire Tape effect at the existing dry reference level. On adds clearly stronger default echo, saturation, tone and continuous pitch movement to the direct piece as well as repeats. Preserve headroom, smooth switching, bounded decaying feedback, idle silence, existing saved control values, and the shared Foundation/Texture/Motion path. Do not deploy or push.

## Verification

Reuse approved rendered PCM/Worklet and browser UI boundaries. Check bypass, echo timing and decay, direct tape movement with echo at zero, low-level harmonics, reasonable level matching, finite stress output, startup settings and actual toggle delivery. Independently review Standards and Spec before finishing a local commit. Quantitative checks do not establish the player's subjective listening acceptance.
