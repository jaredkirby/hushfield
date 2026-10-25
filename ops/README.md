# Static hosting

Serve **the contents of `dist/`** from localhost or HTTPS. URLs are relative, so the app can live at a site root or subdirectory. It needs no database, API key, application server or runtime CDN.

## Local preview

From the repository root:

```sh
python3 -m http.server 4878 --bind 127.0.0.1 --directory dist
```

Open http://127.0.0.1:4878. `npm start` runs the same command and still requires Python 3. To use another port, change `4878` in the direct Python command. Binding to loopback keeps this preview local to the machine.

The checked-in build is playable without npm. After changing source, use Node.js 22 or newer with `npm ci` and `npm run build`. Opening HTML from the filesystem does not load the instrument correctly.

## Hosting elsewhere

Publish the whole `dist/` directory, including `build/`, styles, modules and worklets. Serve JavaScript/module files with a JavaScript MIME type. Use HTTPS for access from another device: a plain HTTP LAN address does not provide the secure context required by AudioWorklet and microphone APIs. `localhost` on an iPad refers to the iPad, not the machine hosting your preview.

Device/layout adaptation is automatic; no phone-specific URL is needed. Stable routes are `#ambient` (Foundation), `#grain` (Texture), `#orbit` (Motion), `#fx` (Space) and `#tape`. `#sample` opens Texture material and `#visual` opens visualization. Existing `phone=1` links remain compatible and no longer force a narrow layout on a wide device.

When shipped assets change, update their cache version in `boot.js` and relevant style/worklet URLs, update any matching startup-test expectation, then run the full build so the embedded bootstrap matches. Replacing only source `app.js` does not update the bundled runtime. This documentation-only refresh does not change asset versions.

The GitHub CI workflow validates source/build consistency; it does not deploy a live site. Public source hosting does not change the access rules of an existing private preview.

## Recovery and origins

Recovery drafts use one bounded IndexedDB record per browser origin, shared across paths. Different schemes, hosts or ports have separate drafts; moving a deployment can therefore make a draft unavailable at its new URL. Export a project file before moving and import it on the new origin.

Use an isolated/unused port for generated browser recovery tests so you do not overwrite a real session draft. See [testing](../docs/TESTING.md) and [the playing guide](../docs/PLAYING.md#save-recover-and-record).

## Optional macOS service

`org.hushfield.web.plist.example` is a LaunchAgent template. Replace both `__PROJECT_DIR__` values with the absolute checkout path and confirm its Python executable path exists. Save it as `~/Library/LaunchAgents/org.hushfield.web.plist` and bootstrap it for your user. It serves loopback port 4878; HTTPS/network access is configured separately.

Customized service files, host names and logs belong outside Git; `.local/` is ignored for that purpose. The template does not install a service automatically.
