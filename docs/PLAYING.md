# Playing Hushfield

Hushfield makes one Piece from three sound parts: Foundation, Texture and Motion. Space and Tape finish their blend. The [glossary](../GLOSSARY.md) defines these terms.

## Start and blend

Tap Start in the bottom bar to play the complete Piece, and Stop to pause. Enter or Space also activates the focused button. Opening another editor changes the controls and display, not the music. Drag a slider to change a continuous value; tap its underlined readout for exact entry with a range and formatted preview. Categories such as scene, scale, waveform and shape have direct menus. The common minus/plus pair still adjusts the selected control, and holding a button repeats. A zero blend level means that part is inaudible; Add texture sets Texture to 35%, and Add motion sets Motion to 25%. These actions set the level; they do not start a stopped Piece.

Start/Stop is a separate button in the bottom bar beside the minus/plus controls. Tapping the visual does not toggle playback. The bottom-bar output waveform is hidden; Visual provides the output visualizations. Pausing keeps the normal black visual without an overlay.

The visual viewport stays square and fixed while editing. It uses the screen height in landscape and the screen width in portrait, with a small outer margin. The header, navigation and adjustments sit beside it in landscape and below it in portrait. Scroll that control area without moving or resizing the visual; editor tabs stay pinned while scrolling, and Start/Stop and minus/plus remain at the bottom of the control area. The square resizes only when the available viewport changes. Nearly square windows reserve enough room to keep controls reachable.

Solo makes one part audible even if its saved blend level is zero, while temporarily silencing the other parts. Full mix restores their saved levels. Solo is not written to project files or recovery drafts.

## Foundation

Compose controls the scene, key, scale, chord length, activity and evolution. Voices adjusts the chord bed, melodic notes and airy noise. The four dots are sustained chord voices: drag vertically for scale steps and horizontally for pan. The pitches glide to their new values. Each dot shows its voice number and note, with pitch/stereo guides during a drag. Reset dots returns all four to their default positions.

Sound adds **Color**, **Drift** and **Bloom**. Color changes harmonic richness, Drift gently moves the voices independently, and Bloom changes their color over time. Fresh sessions and complete presets use recurring motifs with deliberate rests and nearby chord voicings. Evolution also controls a repeating two-minute phrase: Texture grows in level and grain density as Motion becomes quieter and sparser, then the balance returns. Foundation breathes more subtly. The saved Blend stays unchanged; a part at zero stays silent, and Solo still isolates the requested part. Older projects retain their classic Foundation until you edit Sound or choose a complete preset.

Hold chord pauses harmonic changes while the Piece continues, including its slower musical development. New piece changes the seed and restarts its musical progression while keeping sounds, blend settings and the current classic/evolving sound mode.

The Whole piece menu is different from Scene. Stillwater, Slow cloud, Glass shards and Worn memory set Foundation, blend levels, live Texture source, linked Motion, sound patches and finishing controls together. Each complete preset has complementary trigger and ball instruments. The Scene card changes Foundation's scene without replacing the whole Piece. Existing optional source material remains available in Your sound / trim.

## Texture sources

Texture starts with its adjustments visible. Hide adjust hides the Texture fields while keeping the blend and toolbar available; Adjust shows them again. The visual square keeps its size and position. Display contains Wave smoothing: 0 keeps the detailed trace, while higher values make it flow more smoothly; the default is 65%. This changes the picture only, is saved with Visual settings, and supports Undo/Redo. Escape also hides the Texture fields when focus is inside. Texture, Scan and Variation remain available as tabs in the dock.

The source status distinguishes three kinds of material:

| Status | Material and pitch behavior |
| --- | --- |
| LIVE · RECENT FOUNDATION | A rolling four-second stereo window generated while the Piece plays. It continues to receive Foundation audio even when Foundation's audible blend level is zero. |
| FROZEN PHRASE · ORIGINAL HARMONY | A fixed excerpt copied from that window. It retains the harmony present at capture. |
| YOUR SOUND · ORIGINAL PITCH | An optional demo, Surge texture, imported recording or microphone take. It is not automatically reharmonized. |

Start the Piece and let it play briefly before choosing Freeze phrase. During the first four seconds, the available phrase may be shorter; at least a quarter-second of material is required. Use live foundation switches back to evolving material without discarding the stored optional source.

Drag POSITION on the waveform to choose the read anchor, and the millisecond handle to resize the grain window. Dragging the waveform itself also moves the read anchor. The shaded scatter area and density/overlap readout show how the settings relate. Texture uses Visual Scope's renderer: stacked left/right traces, a dotted grid and fading trails with the same dither treatment. It displays the full source phrase so the read anchor and grain length line up with the material. Visual Scope itself shows a short window of the post-effects mix. Scanning can continue moving the playback head.

Grain length and density shape smoothness and thickness. Position scatter spreads grain positions; Pitch transposes them. Scan direction, range, speed, wander and smoothing move through the material. The Variation section adds Repeat position, Jump chance, Skip grain, Reverse chance, Pitch variation and Timing variation. Texture remains editable at zero blend, with an inaudible status; raise its blend, Add texture or Solo to hear it.

Your sound / trim opens the source tool. Import browser-decodable audio, choose a synthesized demo or Surge texture, or record the microphone. Imports longer than 60 seconds retain their first 60 seconds. Drag IN and OUT on the waveform, or drag near a boundary to move the nearest edge. Seconds readouts show both endpoints and the selected duration; the boundaries cannot cross. Apply trim commits the selected range; Restore full sample returns to the retained original. Returning with Use this material selects it as Texture; opening an editor alone does not raise its blend level.

The source menu also offers **Evolving pad**, **Damped pluck**, and **Soft FM bell** under **Surge textures · original C4**. These are dry 24-second stereo recordings made by a native Surge XT engine. Selecting one fetches its bundled WAV from the same host as Hushfield; the native engine does not run in the browser and no Surge installation is needed. Their pitch is C4 at A4=440 Hz; they retain that pitch as Foundation changes. Use Texture Pitch, hold a matching harmony, or use the source as a less tonal background. [Native source details and listening comparisons](SURGE-TEXTURE.md).

Listen to source pauses the Piece and plays the original material directly through master volume, bypassing shared Space and Tape. It is an audition, not a preview of the processed Texture.

## Motion and harmony

Motion uses Orbit: a rotating circle/polygon, bouncing balls and 1–24 equally spaced trigger marks. Turn the orientation handle to offset the shape, or enter an angle in degrees. Signed spin speed passes through zero: negative values rotate counterclockwise, positive values clockwise. Stop spin sets zero RPM, halting new automatic notes while existing sound tails can decay. Scatter resets the balls. Tap the Orbit background to give the balls a nudge.

HARMONY LINKED makes new notes follow Foundation's current chord tones. Foundation continues supplying harmony at zero audible Foundation blend. INDEPENDENT NOTES uses patch tuning instead. Existing sustained notes finish normally when harmony changes. Imported and frozen Texture material is not retuned by this link.

Triggers and Balls have separate sound banks. Tap a trigger mark to select its sound for editing; selection does not audition it. The target menu selects All or an individual item, and the scope label identifies what will change. Edit Voice, Envelope, Tone, Brightness or Space. Brightness has its own attack, decay and signed depth in semitones, independent of amplitude; zero depth retains the static filter.

All shows Mixed where the sounds differ. Changing a field applies that field across the bank while retaining unrelated overrides. The envelope graph shows the first sound when envelopes differ: drag A, D, H and R horizontally for attack, decay, hold and release time, or S vertically for sustain. Numeric controls remain available beneath the graph. Bank delay/feedback/room controls are grouped separately and always apply to the whole bank.

Listen auditions the selected patch through shared finishing without raising the Motion blend. For an All target, Listen first auditions the first sound, not the entire bank.

## Shared finishing

Space's filter, stereo width and room process the normal Foundation, Texture and Motion blend. Depth sets each part's room send. Fresh sessions and complete presets start with Foundation 22%, Texture 65% and Motion 30%, placing Texture farther back than Foundation. Room low cut removes bass from ambience and Room high cut darkens its tail. Reverb controls overall room level; the modern return also follows shared width. Drag the filter handle or response surface horizontally for cutoff and vertically for resonance; moving right raises the cutoff and moving up increases resonance. Filter type remains a direct menu. Width and room have separate sliders and visual indicators. The curve is a settings preview, not a measured spectrum. Motion's own bank effects remain upstream of this shared path.

Tape starts Off with the Space Echo model selected. Tape model stays available in both Echo and Character. Echo contains timing, Feedback and Echo level, plus Head mode and Spring level for Space Echo. Character contains Drive, Wow, Flutter, Hiss and Tone. Drag the echo grid horizontally for time and vertically for feedback. Off bypasses the entire effect, including coloration, echo and spring. Settings remain editable while bypassed.

Space Echo uses three heads on one mono tape transport, with a stereo direct preamp. Head 3 time sets the longest delay, from 0.05 to 1.5 seconds; heads 1 and 2 play at one third and two thirds of that time. The long range extends the original hardware. Changing time bends the pitch of material already on the tape, then newly recorded material settles toward its original pitch. Drive colors the direct sound and tape recording. Wow, Flutter and Tone affect the tape echoes only; they do not wobble, delay or filter the direct signal. Hiss follows the input envelope.

Head modes follow the original RE-201 chart. Modes 1, 2 and 3 select one head; mode 4 selects heads 2 and 3. Modes 5, 6 and 7 add spring to individual heads. Mode 8 uses heads 1 and 2 with spring; mode 9 uses 2 and 3; mode 10 uses 1 and 3; mode 11 uses all three. Mode 12 is spring only. Echo level and Spring level are independent. Spring level has no audible effect in modes 1 through 4. The synthetic spring runs in parallel, so changing tape time does not change its timing.

High Feedback can sustain saturated echoes after the input stops. Lower Feedback to release them, or switch Tape Off to bypass and drain the loop. Changing Tape model starts an empty machine with a smoothed transition, so it does not transfer the old model's echo tail. Reversing a transition preserves the machines already playing.

Classic retains the earlier single echo and short modulated direct tape path. In Classic, Drive, Wow, Flutter and Tone affect the direct sound even at zero Echo level. Saved Pieces without an explicit Tape model load as Classic and retain it after re-export. Worn memory also stays Classic with its deliberately stronger settings. Choose Space Echo explicitly to change an older Piece.

New-session settings are Head 3 time 0.36 s, Feedback 28%, Echo level 16%, Drive 16%, Wow 10%, Flutter 6%, Hiss 4%, Tone 42%, Head mode 4 and Spring level 12%. Mode 4 disables spring despite that stored level. The [RE-201 research](research/re201-space-echo.md) explains the source behavior and the limits of this approximation.

The cassette illustrates the settings and signal level: Wow sways the path, Flutter adds ripples, Drive brightens the head and Echo level/Feedback shape fading repeats. The echo grid makes time and feedback directly editable. Both displays illustrate settings rather than measured tape telemetry. Movement settles in bypass, freezes while stopped and respects reduced motion.

## Visual and keyboard controls

Visual opens Scope, Spectrum or Vector from any editor. Scope shows left/right waveforms; Spectrum shows logarithmic frequency bands; Vector shows the stereo phase image and correlation. Display gain, trails, smoothing, range and peak decay do not change the sound. Drag Spectrum to inspect frequency and level. Hold picture freezes the picture while the Piece continues; it is distinct from Hold chord and Freeze phrase. Back to sound returns to the previous editor.

| Key | Action |
| --- | --- |
| Space | Start/stop the Piece when focus is outside a button, link, input or select. |
| F | Hold/release the current chord under the same focus rule when Foundation is enabled. In older projects with Foundation disabled, it toggles the legacy Texture freeze outside Motion. |
| Arrows on a slider | Adjust its value; Home / End reach its bounds. |
| Enter / Space on an underlined numeric readout | Open exact entry; Apply commits and Cancel leaves the value unchanged. |
| Arrows on grain/trim, filter, echo, orientation or envelope handles | Adjust the corresponding values. Shift makes larger steps on supported visual handles. |
| Cmd/Ctrl + Z / Cmd/Ctrl + Shift + Z | Undo / Redo settings when focus is outside text entry, menus and dialogs. |
| Left / Right, Home / End on an editor tab | Select and focus the previous/next, first/last editor. |
| Arrows on a voice dot | Adjust pitch or stereo position. |
| Home on a voice dot | Reset that voice. |

Expensive drawing is capped at 30 fps independently of audio processing. Audio timestamps keep voice movement aligned with the Piece; paused views redraw when relevant state changes.

## Undo settings

Undo and Redo in the utility strip keep up to 40 settings edits. A slider drag or visual gesture is one edit, so Undo restores the value from before the gesture. This covers blend, Foundation, Texture, Motion sounds, shared effects, master volume and Visual settings. Navigation and auditions do not become settings edits.

History belongs to the current material and configuration. Loading a project or recovery draft, choosing a complete preset, starting a New piece, or replacing/committing source material clears it. Moving trim boundaries is reversible; Apply trim commits audio and clears settings history. Restore full sample returns to the retained original. Undo does not rewind playback, restore recordings or recover discarded audio buffers.

## Save, recover and record

Save project downloads a version-5 `.hushfield.json` file. It contains the retained sample/frozen phrase, Texture source relationship, blend, harmony link, Foundation voices, patches, controls, volume and Visual settings. Versions 1–4 load through migration with retained material/blend and classic Foundation/shared-room behavior. Versions 1–3 keep independent Motion tuning. Re-exporting an older Piece retains its sound mode. Choosing a complete preset opts into new sounds and depth defaults; editing Foundation Sound opts into the evolving voice, and editing Depth opts into independent room sends. The file restores configuration and material, not an exact playback position, waveform history or Solo state. Project input is limited to 30 MiB, including encoded audio. The [saved-sound decision](adr/0001-preserve-saved-sound-models.md) explains the compatibility boundary.

Recovery stores one bounded draft per browser origin (scheme, host and port) in IndexedDB. Paths on the same origin share this draft. A previous draft is offered explicitly; edits do not overwrite it until you recover or discard it. Recovery replaces the current session and starts paused. Private browsing, storage clearing/quota, multiple tabs or eviction can affect availability; export a project for a separate copy.

| Session status | Meaning |
| --- | --- |
| UNSAVED / SAVING | Edits are waiting for, or writing, a local draft. |
| LOCAL DRAFT | The latest draft was stored on this device. |
| RECOVER | A previous draft is available; open the status dialog to choose. |
| RECOVERED | The draft was restored with playback paused. |
| EXPORTED | A project download was initiated; the browser handles saving it. |
| SAVE ERROR | Draft storage failed; export a file and use Save local draft to retry. |

An asterisk indicates changes since the last project export. RECOVERING, DISCARDING and NO DRAFT describe the corresponding dialog operations.

To record a performance, Start the Piece, choose Capture, then Finish capture. Capture records the current mix, so check the blend, Solo and master volume first. The app exports post-effects/master-volume stereo PCM as a 16-bit WAV, up to five minutes. Finalization completes before another take can begin. Capture does not start a stopped Piece.

Record microphone requests permission and pauses the Piece once recording begins. Cancel microphone request cancels a pending take; Stop recording ends an active take. Takes stop at 60 seconds and release their microphone tracks. The recording becomes optional Texture material for trimming. Finish recording/capture before Restart audio.

All audio processing, imported recordings and recovery drafts stay in the browser. See [verification limits](../VERIFICATION.md) for what has been checked on physical devices.
