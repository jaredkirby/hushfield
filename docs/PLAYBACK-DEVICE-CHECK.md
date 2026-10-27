# Playback device check

The target is an uninterrupted 60-minute focus session, including app switching and screen lock. Calls should temporarily interrupt a playing Piece, with playback returning when the device permits. Explicit Stop must stay stopped. Starting other media should pause Hushfield. Loading or recovering a Piece starts paused. See [product direction](PRODUCT-DIRECTION.md).

## What this candidate can establish

The playback-intent controller separates the player's Start/Stop choice from audio-context availability. A suspended or interrupted context retains the earlier playback choice. A browser-restored running context can continue only if that choice still requests playback and activation has finished. Stop, system Pause, restoration and failed activation cancel pending starts. The controller never calls `resume()` or rebuilds an audio graph.

Audio Session exposes `active`, `interrupted` and `inactive`. It does not expose a reliable interruption cause. The specification describes both calls and competing playback as possible interruptions. Media Session supplies play, pause and stop actions, but no call-versus-media reason for those actions. [Audio Session draft](https://www.w3.org/TR/audio-session/), [Media Session draft](https://www.w3.org/TR/mediasession/).

The device check must establish the events Safari delivers for each case. Do not label a generic interruption as a call. Do not treat setting `playback`, a successful resume promise or a running context alone as proof of audible, continuous playback.

## Integration contract

`createPlaybackIntent()` exposes the following methods:

- `requestStart()` returns a token for one activation attempt.
- `reconcileContext(context.state)` records availability and returns `shouldRun`. Pass events only from the current audio graph, using the application's graph-generation guard.
- `finishStart(token)` completes a current activation attempt without replacing the last observed context state. Reconcile the current context after an activation await, then finish the token. An interruption before completion therefore remains silent.
- `failStart(token)` cancels only the matching pending attempt. Late results from replaced attempts have no effect.
- `stop(reason)` clears playback intent synchronously. Use it before any asynchronous work for explicit Stop, system Pause/Stop, project/recovery restoration, source audition and microphone recording. Processor failure also clears intent.
- `status()` returns a fresh settings-free snapshot. Do not persist playback intent in a project or recovery draft.

Changes to visibility alone do not change intent. Optional platform play/pause/stop controls should use these same transitions. Browser feature detection must keep ordinary app controls usable when Audio Session or Media Session is unavailable. Avoid periodic forced resumes or silent-media workarounds.

## Record the environment

Record device model, OS/browser versions, Safari tab versus installed Home Screen app, candidate revision/build hash, output route and tested Piece. Test the real output volume. Preserve a project before a long session. Recovery belongs to the exact browser origin, so changing host or port creates a different recovery context.

For each sequence, retain the observed event order and write whether sound actually continued, stopped or resumed. Mark listening results separately from telemetry. A page may receive no JavaScript callbacks while suspended, so gaps in its log do not prove that audio stopped.

## Test sequences

1. Start a Piece and listen for several minutes. Change editors and rotate the device. Confirm the Piece continues and the reported audio state agrees with what is heard.
2. Switch to a non-audio app, wait at least two minutes, then return. Repeat with the screen locked. Confirm playback continues without requiring the page to remain visible.
3. Complete a 60-minute session with several app switches and a sustained locked-screen interval. Record audible gaps, battery use and output-route changes. The session should continue after 60 minutes until explicitly stopped.
4. While playing, receive and answer a real phone call. End it and record whether playback returns without tapping Start. Repeat while already stopped. The stopped Piece must remain silent. Test the actual call app used on each target device.
5. If controls remain accessible during an interruption, press Stop before the interruption ends. Confirm that a later context-running event does not restart the Piece. Otherwise test this race in the automated controller suite and record the device limitation.
6. Start music, a podcast or a video in another app while Hushfield plays. Confirm Hushfield yields. Record any platform pause action and what happens when that media ends or the user returns to Safari. If the browser delivers only an indistinguishable generic interruption, record the unmet distinction explicitly.
7. Test available lock-screen/headset play, pause and stop controls. Pause must prevent later browser restoration from starting the Piece. Record unavailable controls rather than assuming support.
8. Load a saved project and recover an offered draft. Both must remain paused. Test a failed Start, a quick Start then Stop, and an explicit Stop followed by app switching. None may produce delayed playback.

Repeat the switching, lock, call and competing-media cases on each intended phone and iPad configuration. Keep failures and partial results. Automated checks do not close this device acceptance.

## Capture event evidence

Open the candidate with `?playbackCheck=1`, then expand **Playback check** in the controls. Use **Mark call started**, **Mark call ended**, **Mark other media started** and **Mark other media ended** around the matching events. **Export playback log** downloads the last 200 entries as JSON. The log stays in memory until explicitly downloaded; it is not sent or stored remotely.

Entries include wall-clock time, monotonic time, visibility, audio-context state/currentTime, Audio Session type/state, requested and effective playback, pending Start state and any Media Session action. Record the browser/build identity separately with the export.

Add manual markers immediately before and after each call or competing-media test. Those markers supply the real-world cause; the browser event alone does not. Use screen recording or listening notes when practical. Do not collect microphone audio, contacts, call identifiers or network telemetry for this check.

A result should name the tested revision and device, separate automated behavior from audible observations, and list remaining failures. Background playback and call recovery remain unverified until those sequences pass on the target devices.
