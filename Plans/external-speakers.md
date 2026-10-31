# External speaker integration

Status: built and independently reviewed; automated verification complete. Rendered-browser and physical-device acceptance remain open. Base: f9311ef, current origin/main on 2026-10-31. Worktree: hushfield-output, branch codex/external-speakers. Preserve all existing edits in hushfield-web.

## Objective and scope

Build the proposed first release: an Output control beside master volume, browser device selection when permitted, Bluetooth setup, Sonos through AirPlay, grouping guidance, and explicit Test sound. Direct Sonos cloud streaming is deferred as proposed because it needs a service and account authorization. No new system media-session integration or microphone permission for speakers.

## Delegated goals

1. Routing agent owns dist/output-routing.mjs and tests/output-routing.test.mjs. Provide capability detection, default/permitted device lists, selection, context rebinding and stale-request protection. Verify denied access, missing devices, cancellation, overlaps, enumeration changes, disconnect and Restart. Never create or resume audio.
2. Interface agent owns dist/output-ui.mjs, dist/output.css and its scoped tests. Match monochrome controls, expose connection guidance and Test sound, support focus/Escape and small screens. Consume the agreed routing interface. Never activate audio except explicit Test sound.
3. Lead integrates AudioContext lifecycle in dist/app.js, includes stylesheet, updates player/architecture docs, builds and serves the candidate. Preserve existing signal graph, capture and saved Piece state.
4. Verification agent independently reviews routing/lifecycle and interface against acceptance. Lead resolves findings and runs browser and full regression checks.

## Routing interface

Export createOutputRouting({mediaDevices, onChange}). Controller methods: snapshot(), refresh(), bindContext(contextOrNull), select(deviceId), choose(), dispose(). snapshot returns {supported, canChoose, devices:[{deviceId,label}], selectedId, selectedLabel, busy, message}. Always include Device output at ID ''. bindContext returns a promise for route readiness and never resumes a context. select works while no context exists as a session-only preference. choose invokes a dedicated picker only when both picker and AudioContext output switching are supported. Production may pass a supportsOutputSelection option to detect prototype support before a context exists. Keep ID preference in memory only. The controller and interface use this contract.

## Acceptance

- Open/refresh/select while stopped never creates/resumes audio or changes Piece state.
- Switch through the existing context; keep master, effects, stereo WAV capture, preview and synthesis paths unchanged.
- Confirm selected labels only after success. Serialize overlapping switches and reject stale results from retired contexts. Handle unavailable device, permission rejection, enumeration failure and cancelled picker.
- Reapply available permitted selection on Restart before audible notes/playback; return to explicit Device output when the preference cannot be restored. Surface failure honestly.
- No output identifiers in Piece files, IndexedDB recovery or Undo; no new media-session acquisition.
- Accessible focus, keyboard and dialog behavior; fit phone, short landscape, tablet, Split View and desktop without outer overflow.
- Pass build, full Node tests, deterministic rebuild and browser behavior/layout checks. Automated API simulations and muted playback do not establish physical-speaker acceptance.

## Evidence and remaining checks

Build and all 237 Node tests pass on Node 22.22.0. The 41 focused checks include 19 routing, 10 interface and 12 application-lifecycle checks. A consecutive rebuild produces identical generated files. Whitespace and local documentation link targets pass. The independent verification agent found no remaining source blockers. The receipt is tests/external-speakers-results.json.

Review fixes include waiting for route readiness before audible test notes, ignoring retired Restart failures, keeping output changes out of recovery edits, displaying test outcomes inside the modal, replacing stale test feedback on disconnect, and preserving pending speaker selection plus failure explanations through first activation. Existing audio worklet bundles are unchanged.

Local candidate preview: http://127.0.0.1:4891. The server serves this isolated checkout; no existing service or deployed release was replaced.

Rendered-browser layout, native Escape/focus and mobile/tablet behavior could not be verified because local browser use is disabled in Work settings. The user was asked to enable it. DOM-boundary tests do not establish rendered-browser acceptance. Physical Bluetooth/Sonos output, measured wireless latency, grouping, 60-minute playback and background/lock-screen acceptance require the actual devices.

GitHub tracker publication initially required additional approval. The user explicitly approved the exact issue payload and destination, and [issue #44](https://github.com/jaredkirby/hushfield/issues/44) is now published with the approved scope, acceptance checks and validation results.

## Phone presentation follow-up

The user reached Output on an iPhone and reported a screenshot showing generic dialog styling. The served CSS was correct, so the precise phone-side cause remains unknown. Embedded Output styles in the shipped page, refreshed the app cache version and expanded iPhone Sonos setup with direct Control Center > AirPlay guidance. All 238 tests pass, including 42 focused output checks, and a consecutive rebuild is identical. The private phone URL serves the exact updated HTML and app. Actual corrected rendering and Sonos playback await user testing.
