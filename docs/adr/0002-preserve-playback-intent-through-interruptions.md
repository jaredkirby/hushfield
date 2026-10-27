# Preserve playback intent through browser interruptions

The player's Start or Stop choice is separate from the browser's ability to run audio. An interrupted context retains earlier playback intent, while explicit Stop, project restoration and failed activation cancel it; activation revisions prevent a late result from undoing a newer Stop. Browser-restored playback needs no forced-resume timers or silent-media workarounds, but call-versus-media behavior still requires real-device verification.

Keep the existing audio-activation path and omit new Media Session metadata/transport registration, playback-state updates and early Audio Session listeners or diagnostic reads. A combined comparison without those integrations removed the user-reported Sony headphone mode switch in Helium on a MacBook Pro; it did not isolate the individual cause or verify background/call continuity. Platform transport integration needs separate investigation before reintroduction.
