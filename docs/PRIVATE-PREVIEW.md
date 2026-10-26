# Private music preview

The musical-expression branch is hosted within the existing Tailscale network:

- [Instrument](https://kirbys-mac-mini.tailac5a2a.ts.net:8449/#ambient)
- [Saved listening comparisons](https://kirbys-mac-mini.tailac5a2a.ts.net:8449/qa-musicality.html?saved)

Connect Tailscale on the viewing device. The Mac mini must be awake and connected. This preview uses HTTPS port 8449 and preserves existing Serve handlers on 443 and 8443–8448. It uses Tailscale Serve, with no public Funnel exposure.

The user LaunchAgent `chat.kirby.hushfield-music` runs the loopback server on 4886 after login and restarts it if it exits. Its source configuration is `ops/hushfield-music-preview.plist`; the installed copy is `~/Library/LaunchAgents/chat.kirby.hushfield-music.plist`. Logs are `/tmp/hushfield-music-preview.{out,err}.log`.

The server reads this isolated worktree and the saved comparisons under `.scratch/listening/artifacts/`. Keep that worktree and artifact directory while the preview is needed. It accepts render-artifact writes from the local origin and the explicitly configured private HTTPS origin. The `?saved` comparison URL opens the existing 75-second examples and 180-second arc without starting a new render or playing audio automatically.

Verification: both HTTPS pages and the generated application/worklet bytes match local files; all five listening WAV hashes match their render receipt. Byte-range responses and private-origin artifact writes succeed, while an unrelated browser origin is rejected. The browser auto-loaded all five saved examples and ran the instrument for four seconds, then paused. The LaunchAgent is running; previous Tailscale handlers remain unchanged. See `tests/tailscale-preview-results.json`. Actual phone/tablet access still awaits user confirmation.
