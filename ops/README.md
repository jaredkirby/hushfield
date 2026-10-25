# Static hosting

Serve the contents of `dist/` from localhost or HTTPS. The app uses relative URLs and can live at a site root or subdirectory. No API keys, database, runtime npm server or third-party CDN are needed.

For a local preview:

```sh
python3 -m http.server 4878 --bind 127.0.0.1 --directory dist
```

When editing, run `npm ci` and `npm run build` first. Publish the whole `dist/` directory, including `build/`, worklets and styles. Ensure JavaScript/module files have a JavaScript MIME type. Use a new cache version in the bootstrap and style URLs when changing shipped assets; update the startup test and rebuild embedded shell scripts to match.

For network access, put the static server behind an HTTPS host or a private HTTPS proxy. Plain HTTP on a LAN address does not provide the secure context needed by AudioWorklet and microphone APIs. Deployment is separate from this repository's CI workflow; pushing a commit does not publish a running site.

`org.hushfield.web.plist.example` is an optional macOS LaunchAgent template. Replace both `__PROJECT_DIR__` values with the absolute checkout path, save it under `~/Library/LaunchAgents/org.hushfield.web.plist`, and bootstrap it for your user. It binds only to loopback port 4878. Keep customized hosting configuration and logs out of Git; `.local/` is ignored for that purpose.
