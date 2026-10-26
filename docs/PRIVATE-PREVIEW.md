# Private music preview

The music and direct-control UI merged in [PR #22](https://github.com/jaredkirby/hushfield/pull/22) are hosted within the existing Tailscale network:

- [Instrument](https://kirbys-mac-mini.tailac5a2a.ts.net:8449/#ambient)
- [Saved listening comparisons](https://kirbys-mac-mini.tailac5a2a.ts.net:8449/qa-musicality.html?saved)

Connect Tailscale on the viewing device and use an account/device allowed by the tailnet's access policy. The Mac mini must be awake and connected. This preview uses Tailscale Serve HTTPS port 8449, proxying `http://127.0.0.1:4886`; it does not require public Funnel. Other Serve handlers use 443 and 8443–8448 and are independent of this preview.

## Service and checkout

The user LaunchAgent `chat.kirby.hushfield-music` runs the loopback server on 4886 after login and restarts it if it exits. Its host-specific source configuration is [`ops/hushfield-music-preview.plist`](../ops/hushfield-music-preview.plist); the installed copy is `~/Library/LaunchAgents/chat.kirby.hushfield-music.plist`. Logs are `/tmp/hushfield-music-preview.out.log` and `/tmp/hushfield-music-preview.err.log`.

The service reads `/Users/kirbybot/sound-music/hushfield-music`, including its `dist/` application and `.scratch/listening/artifacts/` saved comparisons. This is the retained music checkout, rather than the separate `hushfield-web` main checkout. Keep that checkout and artifact directory while the preview is needed; changing another checkout does not update this URL. The service's PR-22 head `1a64ba8` is included in merged `main` commit `1779418`.

The server reads application files on each request with `Cache-Control: no-store`; source changes still require `npm run build` to update the shipped bundle. Editing application assets does not require restarting the Node process. Changing server code, service arguments or environment requires a deliberate service reload. Updating the installed plist alone does not change the running job. Preserve saved artifacts and any unrelated Serve handlers during maintenance.

It accepts render-artifact writes from local browser origins and the explicitly configured private HTTPS origin, `HUSHFIELD_LISTENING_ORIGIN`. This is not application authentication: clients without an Origin header are also accepted. Keep the write-capable server behind trusted private access. See [development-server behavior](../ops/README.md#listening-development-server) and [security boundaries](../SECURITY.md#data-and-hosting-boundaries).

The `?saved` comparison URL opens the existing 75-second examples and 180-second arc without starting a new render or playing automatically. Rendering a new set, including a short check, replaces the selected preset's receipt. Use a separate checkout/port for new experiments when retaining the shared listening set.

## Recovery and checks

Recovery belongs to the viewing browser and exact origin, not this service's filesystem. This HTTPS origin has a different draft from localhost, another port or another host; export a project before moving a session. Recovery always asks for an explicit choice and restores paused. A server restart does not copy drafts between origins. See [playing and recovery](PLAYING.md#save-recover-and-record).

Read-only service checks on the host:

```sh
launchctl print gui/$(id -u)/chat.kirby.hushfield-music
tailscale serve status --json
curl --head http://127.0.0.1:4886/
```

During this documentation review (2026-10-26 UTC), the LaunchAgent was running, the loopback page returned HTTP 200, and Serve still mapped 8449 to 4886 with the other handlers present. These checks did not rerun browser playback, comparison hashes or physical-device access, and did not change service/network state.

The earlier [preview receipt](../tests/tailscale-preview-results.json) records matching HTTPS application/worklet bytes, five listening WAV hashes, byte-range responses, private-origin writes and rejection of an unrelated browser origin. That run also loaded all five saved examples and played the instrument for four seconds, then paused. It is historical evidence for its recorded revision, not a fresh result from this documentation review. Actual phone/tablet access and subjective listening acceptance still await user confirmation.

## Space Echo candidate

The RE-201-inspired Tape work has a separate private preview:

- [Space Echo instrument](https://kirbys-mac-mini.tailac5a2a.ts.net:8450/#tape)
- [Five saved listening examples](https://kirbys-mac-mini.tailac5a2a.ts.net:8450/qa-space-echo.html?saved)

The user LaunchAgent `chat.kirby.hushfield-space-echo` serves `hushfield-docs` on loopback 4893. Tailscale Serve HTTPS port 8450 proxies that server. The source configuration is [the Space Echo plist](../ops/hushfield-space-echo-preview.plist), installed at `~/Library/LaunchAgents/chat.kirby.hushfield-space-echo.plist`. Logs use `/tmp/hushfield-space-echo-preview.out.log` and `.err.log`. The existing music preview on 8449 retains its own checkout and saved renders.

The saved examples are deterministic 16-second, 48 kHz synthesized phrases through dry, Classic, three-head Space Echo, speed-change and spring-only settings. They use a common source gain, with no separate normalization. This is a comparison of our code, not recordings of Roland hardware. The local receipt records source/harness and WAV SHA-256 hashes. The saved WAVs live under `hushfield-docs/.scratch/listening/artifacts/`; retain that directory and checkout while the preview is needed.

On 2026-10-26, the LaunchAgent was running, the HTTPS Worklet hash matched the tested local build, and a WAV range request returned the requested 64 bytes. Browser Worklet checks and explicit paused recovery are recorded in [the Space Echo receipt](../tests/re201-browser-results.json). Physical phone/tablet access and subjective listening acceptance remain open. The same private-access and recovery-origin limits above apply to port 8450.
