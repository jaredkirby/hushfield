# Playback device check

The target is an uninterrupted 60-minute focus session, including app switching and screen lock. Calls should temporarily interrupt a playing Piece, with playback returning when the device permits. Explicit Stop must stay stopped. Starting other media should pause Hushfield. Loading or recovering a Piece starts paused. See [product direction](PRODUCT-DIRECTION.md).

## What this candidate can establish

The playback-intent controller separates the player's Start/Stop choice from audio-context availability. A suspended or interrupted context retains the earlier playback choice. A browser-restored running context can continue only if that choice still requests playback and activation has finished. Stop, restoration and failed activation cancel pending starts. The controller never calls `resume()` or rebuilds an audio graph.

Audio Session exposes `active`, `interrupted` and `inactive`. It does not expose a reliable interruption cause. The specification describes both calls and competing playback as possible interruptions. Media Session supplies play, pause and stop actions, but no call-versus-media reason for those actions. [Audio Session draft](https://www.w3.org/TR/audio-session/), [Media Session draft](https://www.w3.org/TR/mediasession/).

The app does not register Media Session metadata, headset/lock-screen transport handlers or playback-state updates. It also avoids early Audio Session listeners and diagnostic reads. The existing audio-activation request for `playback` remains. The device check must establish the context events each browser delivers; a generic interruption does not identify a call. A successful resume promise or running context alone does not prove audible, continuous playback.

On 2026-10-27, the user reported that the apparent Sony headphone noise-cancellation/transparency switch was gone in a comparison build without the new platform-session integration, using Helium on a MacBook Pro. The exact headphone model and browser/OS versions were not recorded. The comparison removed several integrations together, so it does not establish the individual cause. This result does not verify calls, background playback or a long session.

## Integration contract

`createPlaybackIntent()` exposes the following methods:

- `requestStart()` returns a token for one activation attempt.
- `reconcileContext(context.state)` records availability and returns `shouldRun`. Pass events only from the current audio graph, using the application's graph-generation guard.
- `finishStart(token)` completes a current activation attempt without replacing the last observed context state. Reconcile the current context after an activation await, then finish the token. An interruption before completion therefore remains silent.
- `failStart(token)` cancels only the matching pending attempt. Late results from replaced attempts have no effect.
- `stop(reason)` clears playback intent synchronously. Use it before any asynchronous work for explicit Stop, project/recovery restoration, source audition and microphone recording. Processor failure also clears intent.
- `status()` returns a fresh settings-free snapshot. Do not persist playback intent in a project or recovery draft.

Changes to visibility alone do not change intent. Keep the existing audio-activation behavior when optional browser APIs are unavailable. Platform transport integration needs separate investigation before reintroduction because the comparison exposed a headphone regression. Avoid periodic forced resumes or silent-media workarounds.

## Record the environment

Record device and headphone models, OS/browser versions, browser tab versus installed Home Screen app, candidate revision/build hash, output route and tested Piece. Note headphone noise-cancellation/ambient mode before loading the page and after Start. Test the real output volume. Preserve a project before a long session. Recovery belongs to the exact browser origin, so changing host or port creates a different recovery context.

For each sequence, retain the observed event order and write whether sound actually continued, stopped or resumed. Mark listening results separately from telemetry. A page may receive no JavaScript callbacks while suspended, so gaps in its log do not prove that audio stopped.

## Test sequences

1. Start a Piece and listen for several minutes. Change editors and rotate the device. Confirm the Piece continues and the reported audio state agrees with what is heard.
2. Switch to a non-audio app, wait at least two minutes, then return. Repeat with the screen locked. Confirm playback continues without requiring the page to remain visible.
3. Complete a 60-minute session with several app switches and a sustained locked-screen interval. Record audible gaps, battery use and output-route changes. The session should continue after 60 minutes until explicitly stopped.
4. While playing, receive and answer a real phone call. End it and record whether playback returns without tapping Start. Repeat while already stopped. The stopped Piece must remain silent. Test the actual call app used on each target device.
5. If controls remain accessible during an interruption, press Stop before the interruption ends. Confirm that a later context-running event does not restart the Piece. Otherwise test this race in the automated controller suite and record the device limitation.
6. Start music, a podcast or a video in another app while Hushfield plays. Confirm Hushfield yields. Record context events and what happens when that media ends or the user returns to the browser. If the browser delivers only an indistinguishable generic interruption, record the unmet distinction explicitly.
7. Record whether the browser itself offers lock-screen/headset controls and how they behave. Hushfield currently registers no handlers for them. Unavailable controls do not establish whether background audio works; do not rely on controls without a separate device check.
8. Load a saved project and recover an offered draft. Both must remain paused. Test a failed Start, a quick Start then Stop, and an explicit Stop followed by app switching. None may produce delayed playback.

Repeat the switching, lock, call and competing-media cases on each intended phone and iPad configuration. Keep failures and partial results. Automated checks do not close this device acceptance.

## Capture event evidence

Open the candidate with `?playbackCheck=1`, then expand **Playback check** in the controls. Use **Mark call started**, **Mark call ended**, **Mark other media started** and **Mark other media ended** around the matching events. **Export playback log** downloads the last 200 entries as JSON. The log stays in memory until explicitly downloaded; it is not sent or stored remotely.

Entries include wall-clock time, monotonic time, visibility, audio-context state/currentTime, requested and effective playback and pending Start state. They do not read Audio Session fields or register Media Session controls. Record the browser/build identity separately with the export.

Add manual markers immediately before and after each call or competing-media test. Those markers supply the real-world cause; the browser event alone does not. Use screen recording or listening notes when practical. Do not collect microphone audio, contacts, call identifiers or network telemetry for this check.

A result should name the tested revision and device, separate automated behavior from audible observations, and list remaining failures. Background playback and call recovery remain unverified until those sequences pass on the target devices.
