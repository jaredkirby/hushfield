# Reporting a vulnerability

For a vulnerability that could expose someone else's data or compromise a browser, use [GitHub's private vulnerability reporting](https://github.com/jaredkirby/hushfield/security/advisories/new). Include the affected revision, browser, reproduction steps and expected impact.

Audio glitches and ordinary interface bugs belong in public issues. Please omit credentials, private recordings and personal project files from public reports.

The maintained version is the latest `main` branch. There is no separate long-term support release yet.

## Data and hosting boundaries

The instrument is a static browser application. Imported recordings, microphone takes and recovery drafts are processed/stored in that browser; the application has no upload service or telemetry. Optional native-library WAVs are fetched from the same host when selected. A project export contains its Texture audio and settings, so review it before sharing. Recovery is browser-local storage, not a backup or an encrypted vault. Other scripts served from the same origin share that origin's trust boundary.

Use HTTPS when hosting for another device, and serve the contents of `dist/`. The optional listening-comparison server is a development service, separate from normal static hosting: it also accepts WAV/JSON writes into an ignored local artifact directory. It binds to loopback and checks supplied browser Origin headers against its local/explicitly configured preview origins; it accepts clients without an Origin header and has no application login. Keep it on loopback or behind a trusted private access layer. Its 80 MiB per-request limit does not impose a total disk quota. See [hosting](ops/README.md) and [private preview](docs/PRIVATE-PREVIEW.md).
