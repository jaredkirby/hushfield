import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const root = fileURLToPath(new URL("../", import.meta.url));
const result = await build({ metafile: true, absWorkingDir: root, entryPoints: ["dist/app.js", "dist/ambient-worklet.js", "dist/grain-worklet.js", "dist/tape-worklet.js", "dist/orbit-worklet.js"], outdir: "dist/build", bundle: true, format: "esm", platform: "browser", target: ["safari15.4", "chrome100"], minify: true, plugins: [{ name: "local-version-query", setup(builder) {
  builder.onResolve({ filter: /^\.\/.*\?v=/ }, (args) => ({ path: path.resolve(args.resolveDir, args.path.split("?")[0]) }));
} }], logLevel: "info" });
const inputs = {};
for (const file of Object.keys(result.metafile.inputs)) inputs[file] = createHash("sha256").update(await readFile(path.join(root, file))).digest("hex");
await writeFile(path.join(root, "dist/build/manifest.json"), JSON.stringify({ inputs }, null, 2) + "\n");
await import("./build-shell.mjs");
