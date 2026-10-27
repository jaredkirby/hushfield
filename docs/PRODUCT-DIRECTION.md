# Hushfield product direction

Hushfield is a playable ambient instrument for focus and calm. A player can start with a coherent Piece, shape it through direct gestures and listen as it develops. Musical curiosity is enough to begin; deeper controls can be discovered gradually. Phone, iPad and desktop are supported design targets.

## Agreed experience

The player can shape a Piece and leave it playing for 30–60 minutes. Gentle development should sustain interest without requiring intervention. Active playing and unattended listening are both valid uses. Playback continues until explicitly stopped; 30–60 minutes is a reliability target, not an automatic cutoff. A timed ending, if added, must be an explicit choice.

Fresh sessions should favor soft attacks, smooth harmonic movement, restrained melodic activity and gradual changes in loudness. Main controls should generally preserve a calm, usable Piece. More abrasive or unstable sounds should require deliberate choices.

The visuals are creative works worth watching in their own right. They should evolve with enough interest to reward sustained watching, while remaining comfortable to ignore during focus. The Tape page is the player's reference: its changing motion evokes watching a lava lamp. Each editor should have a distinct visual personality connected to its musical role, within the shared black-and-white monochrome dithered style.

Players should be able to shape sound by interacting with the editor visuals. Gestures should have consistent, learnable musical consequences, reflected in the corresponding sound controls and reversible with Undo. Picture-only adjustments must be clearly identified.

A manual adjustment establishes the new baseline for ongoing development. The Piece continues evolving around that choice rather than gradually returning to the previous settings.

Autonomous visual movement requires active Piece playback. Views stay still before Start and while playback is stopped or interrupted; Tape additionally requires Tape On. This replaces the earlier silent-animation choice. The audio playback state must remain clear, and touching artwork must never unexpectedly start audio. Gestures made while stopped can prepare settings for the next playback and redraw the edited view.

Every editor needs a Reset to defaults action. It restores that editor's sound and appearance settings from a fresh Hushfield session, regardless of the preset or saved Piece currently loaded. It preserves the Blend, selected Texture material, playback state and other editors' settings. Reset is one undoable action, requires no confirmation dialog and makes a gentle audible transition during playback.

Resetting Foundation harmony naturally affects linked Motion and live Texture without overwriting their settings. The reset target is the actual fresh-session configuration, which can differ from generic defaults stored internally.

The intended focus experience includes continued playback while switching apps or locking a phone or iPad. This is an accepted product requirement. The current implementation does not guarantee background or locked-screen playback; delivery requires investigation and real-device verification.

After a phone call interrupts playback, Hushfield should resume when the device permits it, provided the Piece was playing before the call. It must respect an explicit Stop. Loading or recovering a Piece still starts paused. When the player deliberately starts other media, such as music, a podcast or a video in another app, Hushfield should pause. Simultaneous playback would require an explicit option if added later.

## Domain and acceptance

The [glossary](../GLOSSARY.md) defines one evolving Piece with Foundation, Texture and Motion, finished by shared Space and Tape. This model remains the basis of the instrument.

Automated checks support technical verification. Listening preference, visual enjoyment, touch interaction and sustained playback on physical devices require human acceptance. [Verification](../VERIFICATION.md) records current evidence and its limits.

The complete product direction was confirmed on 2026-10-27. Implementation details must satisfy this agreement and preserve the existing [saved-sound compatibility decision](adr/0001-preserve-saved-sound-models.md).

## Proposed implementation sequence

1. Establish the implementation baseline. Record the source revision, preserve concurrent work and assess the current app against the agreed requirements. Identify behavior that already works, missing behavior and acceptance that still needs a real device.
2. Investigate background playback early. Use a focused playback diagnostic to assess app switching, screen lock, calls and competing media on real phones and tablets. Keep the delivery approach provisional until those results establish what the browser can support.
3. Deliver per-editor Reset to defaults as the first bounded feature. Use the actual fresh-session settings, preserve the agreed surrounding state, support one-step Undo and check audible transitions. Cover all five sound editors and review the result in the playable app.
4. Use Tape as the first visual-interaction candidate. Preserve its evolving monochrome dithered character while making direct gestures produce understandable sound changes. Verify manual baselines, motion only during playback with Tape On, matching controls, Undo and reset before extending the approach to other editors. Each editor retains its own visual identity.
5. Review calmness and sustained use. Assess default attacks, melodic activity, harmonic changes, loudness transitions and ordinary control ranges. Preserve older saved sounds and deliberate experiments. Complete at least a 60-minute focus session on the target devices, with separate listening, visual and touch approval.

This sequence is a proposal for implementation planning. It does not establish that these features or acceptance checks are complete.
