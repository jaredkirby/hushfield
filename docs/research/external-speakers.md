# External speakers

Research date: 2026-10-31. This record informed the first Output implementation, now described in the [playing guide](../PLAYING.md#external-speakers) and [implementation plan](../../Plans/external-speakers.md). The original source snapshot and proposed alternatives below remain research context. The cited platform capabilities have not been tested with Hushfield on physical speakers.

## Recommended direction

Start with the device's existing audio output and explain how to select it. Bluetooth pairing and Apple AirPlay already provide practical routes to external speakers. Add browser output selection only where supported. Treat a dedicated Sonos streaming service as a separate project because it changes Hushfield's static, browser-only architecture.

## Current Hushfield audio path

Inspected the local `hushfield-web` checkout at `6b5cb2c` with existing working-tree edits. This is source evidence for that checkout, not verification of the deployed app.

[`ensureOutput()`](../../dist/app.js) creates one AudioContext and connects limiter, master volume, analyser and `ctx.destination`. Output capture branches from master into its own worklet; the existing five-minute WAV capture is not a continuous network stream. Test sound and source preview use the same context. [`audio-startup.mjs`](../../dist/audio-startup.mjs) requests a playback audio session where available and activates audio inside a user gesture. There is no speaker selector or Sonos service in the inspected output code.

[`outputAudioTime()`](../../dist/ambient-points.mjs) already uses output timestamps, with output/base latency as a fallback. Preserve that behavior and measure wireless delay on actual devices. The helper does not establish that every speaker reports its full network buffering delay.

## Browser output selection

Chrome documents `AudioContext.setSinkId()` for routing to permitted outputs, including Bluetooth speakers. The empty device ID selects the default output. Enumeration can be limited by permission. [Chrome Web Audio output routing](https://developer.chrome.com/blog/audiocontext-setsinkid).

The two APIs needed for a direct Web Audio picker have uneven support. The following is the compatibility project's data checked on the research date, not a device test. Detect capabilities at runtime.

| Browser family | AudioContext.setSinkId | Dedicated selectAudioOutput picker | Initial Hushfield approach |
| --- | --- | --- | --- |
| Chrome / Edge | Listed since Chromium 110 | Listed as unsupported | System output, optionally enumerate already permitted outputs |
| Firefox desktop | Listed as unsupported | Listed since 116 | System output |
| Safari / iOS Safari | Listed as unsupported | Listed as unsupported | System output and Control Center guidance |

Sources: [MDN compatibility data for AudioContext](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/AudioContext.json), [MDN compatibility data for MediaDevices](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/MediaDevices.json).

The output-selection specification requires a user gesture for its picker and defines the `speaker-selection` permissions policy. Persisted device identifiers can require renewed selection and may rotate. [Audio Output Devices API](https://www.w3.org/TR/audio-output/).

Recommendation: do not request microphone access just to expose a speaker list. Prefer system instructions when outputs are unavailable. A future browser with both APIs could use the dedicated picker. A MediaStream-to-audio-element bridge could serve other combinations, but needs a separate prototype for activation, duplicate playback, latency, teardown and Safari behavior.

Web Bluetooth exposes GATT communication. It does not provide Hushfield's ordinary Bluetooth speaker audio route; the operating system handles pairing and audio output. [Web Bluetooth scope](https://bluetooth.spec.whatwg.org/), [Chrome audio routing](https://developer.chrome.com/blog/audiocontext-setsinkid).

## Bluetooth and Apple output routing

On a Mac, pair a speaker in System Settings > Bluetooth, then select it in System Settings > Sound > Output. Apple documents Bluetooth speakers as audio output devices. Hushfield's current AudioContext destination should follow that system route, which is an engineering expectation to verify on devices. [Apple Bluetooth guidance](https://support.apple.com/en-gb/guide/mac-help/-blth1004/mac), [Apple audio output guidance](https://support.apple.com/en-il/guide/mac-help/mchlp2256/mac).

For Sonos on iPhone or iPad, use the AirPlay control in Control Center's audio card. On Mac, select a compatible Sonos product in Sound > Output. Sonos says an AirPlay receiver can be grouped with other Sonos products for multi-room playback. It also warns that macOS AirPlay 1 system audio can have delay or interruptions. [Sonos AirPlay guidance](https://support.sonos.com/en/article/stream-airplay-audio-to-sonos).

Compatibility depends on the exact Sonos model and configuration. Sonos lists One, One SL, Five, Play:5 Gen 2, Era models, Move models, Roam models, Port and several soundbars among its AirPlay receivers. Speakers configured as surrounds do not offer AirPlay independently. Use the maintained list rather than promising that every Sonos product can receive AirPlay. [Sonos AirPlay compatibility](https://support.sonos.com/en/article/stream-airplay-audio-to-sonos).

## Sonos Bluetooth and grouping

Sonos lists Bluetooth audio support for Arc Ultra, Beam Ultra, Era 100, Era 100 SL, Era 300, Move, Move 2, Play, Roam and Roam 2, as well as its headphones. Pairing requires Bluetooth discovery mode on the Sonos product. The list is model-specific; a Sonos badge alone does not establish Bluetooth audio support. [Sonos Bluetooth models and pairing](https://support.sonos.com/en-us/article/use-bluetooth-on-sonos).

Sharing Bluetooth audio with other Sonos rooms is a further capability. Sonos lists Arc Ultra, Beam Ultra, Era 100, Era 100 SL, Era 300, Move 2, Roam, Roam 2, Roam SL and Sonos Play for sharing. The receiving product must already be set up on the Sonos system over Wi-Fi and remain grouped. Group rooms in the Sonos app or web app. Do not assume the original Move can share Bluetooth audio just because it can receive it. [Sonos Bluetooth sharing](https://support.sonos.com/en/article/share-bluetooth-audio-with-your-sonos-system).

## Sonos Connect hardware

If the intended device is the older product named Sonos Connect, its line-in provides another route. Sonos documents connecting a source's headphone or line output to the RCA inputs on Port or Connect, then selecting Line-In in the Sonos app. A Mac headphone output or suitable audio interface could supply Hushfield audio. This needs the correct cable and a device test. It does not require a browser Sonos API. [Sonos Port and Connect line-in](https://support.sonos.com/en-gb/article/play-line-in-on-your-sonos-port).

## Direct Sonos API integration

The Sonos Control API sends playback, grouping and volume commands through the Sonos cloud. Groups play the same content synchronously. The API is a control channel rather than a documented endpoint for uploading an arbitrary browser audio graph. [Sonos Control API](https://docs.sonos.com/docs/control).

`loadStreamUrl` loads an HTTP URL for live radio in an open playback session backed by a cloud queue. It can start playback after loading and requires playback event handling. This offers a possible destination for an encoded live Hushfield stream, but it does not create that stream. [Sonos loadStreamUrl](https://docs.sonos.com/reference/playbacksession-loadstreamurl-sessionid).

`audioClip` accepts MP3 or WAV URLs and schedules clips on individual players. Sonos describes this as short audio playback, which may mix with existing content and is unavailable on some devices. Repeated audio clips are a poor fit for one continuously evolving Piece. [Sonos loadAudioClip](https://docs.sonos.com/reference/audioclip-loadaudioclip-playerid), [Sonos connected-home capabilities](https://docs.sonos.com/docs/connected-home-features).

Official authorization requires a registered integration, a publicly routable HTTPS redirect and user consent through OAuth. Sonos says token exchange and refresh use a client secret and should run server-side. A production integration therefore needs a service for credentials and sessions. [Sonos authorization](https://docs.sonos.com/docs/authorize).

An engineering prototype would have to encode the final Hushfield mix into a format Sonos accepts, host a continuous stream at an address the speaker can fetch, establish the session and handle disconnects, buffering and remote pause. Exact codec support, startup delay and long-running behavior must be demonstrated before choosing this design. A browser `blob:` URL or in-memory MediaStream is not that hosted HTTP stream. These are design implications of the URL-based API, not verified Hushfield capabilities. Browser suspension also remains relevant while the browser generates the live Piece.

## Device acceptance still needed

Test the exact browser, OS and speaker combination. Check routing before Start, routing changes during playback, disconnect and reconnect, Test sound, master volume, microphone capture interactions and local WAV capture. For Sonos groups, measure the delay between a control edit and audible change. Run a sustained session and test background and lock-screen behavior separately. Source documentation establishes available routes, not reliable unattended playback or subjective listening acceptance.

## Proposed first release

Add an Output button near master volume. Its default label should be "Device output" because the browser may not know which physical speaker the OS selected. Open a small panel with Bluetooth setup, Sonos through AirPlay, and Test sound. On iPhone and iPad, explain Control Center; on Mac, explain Sound > Output. Keep grouping in the Sonos app initially.

When `ctx.setSinkId` exists and permitted outputs are exposed, offer their labels plus Device output. Confirm a selection only after switching succeeds. Choosing an output while stopped must keep the Piece stopped. Keep route choice separate from saved Piece sound settings and Undo. Preserve it across Restart only while the device remains available and permitted; handle stale contexts and failed selections explicitly.

Implement this later in a small output-routing controller, integrated at AudioContext creation and retirement. Keep synthesis, effects, capture and preview on their existing graph. Use meaningful routing checks for cancellation, unavailable devices, rejected switching and Restart during a pending request. Physical checks should include stereo output, a 60-minute session, route changes and the existing capture path. OS fallback behavior on disconnect must be recorded before deciding the app's response.

Only consider direct Sonos room selection after the actual speaker models and the need for playback independent of a phone are established. If playback must continue after the browser sleeps or closes, a live browser-to-Sonos bridge alone cannot meet that requirement; synthesis or rendered content must also live elsewhere. That is a separate architecture choice from selecting a speaker.
