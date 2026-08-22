/**
 * Builds the offline bundle that Capacitor packages into the Android app.
 *
 * SkillSync renders entirely on the client (`ssr: false` on the root route),
 * so the only thing a server ever sends is a shell document. Inside the APK
 * there is no server, so this script renders that shell once at build time
 * (through the freshly built server entry) and writes it to
 * `dist/client/index.html`. The WebView then boots the whole app from disk with
 * no network at all.
 *
 * The Vite/Nitro output location has moved between toolchain versions
 * (`dist/client` + `dist/server` today, `.output/public` + `.output/server`
 * previously), so the directories are discovered instead of assumed, and the
 * result is always normalised into `dist/client` — the path
 * `capacitor.config.ts` declares as `webDir`.
 *
 * Usage:  bun run build:mobile
 */

import { execFileSync } from "node:child_process";
import { cpSync, copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(import.meta.dirname, "..");
const targetDir = join(root, "dist", "client");

const CLIENT_CANDIDATES = [
  join(root, "dist", "client"),
  join(root, ".output", "public"),
  join(root, "dist", "public"),
  join(root, "dist"),
];
const SERVER_CANDIDATES = [
  join(root, "dist", "server", "index.mjs"),
  join(root, ".output", "server", "index.mjs"),
  join(root, "dist", "server", "server.mjs"),
  join(root, ".output", "server", "server.mjs"),
];

const ls = (dir) => (existsSync(dir) ? readdirSync(dir).join(", ") : "<missing>");

/* ------------------------------- 1. build ------------------------------- */

console.log("\n> vite build");
const bin = process.platform === "win32" ? "npx.cmd" : "npx";
execFileSync(bin, ["vite", "build"], { cwd: root, stdio: "inherit" });

const clientDir = CLIENT_CANDIDATES.find(
  (dir) => existsSync(dir) && readdirSync(dir).some((f) => f === "assets" || f.endsWith(".html")),
);
if (!clientDir) {
  throw new Error(
    `Could not locate the client build output. Looked in:\n` +
      CLIENT_CANDIDATES.map((d) => `  ${d} -> ${ls(d)}`).join("\n"),
  );
}
console.log(`\n· client assets: ${clientDir}`);

const serverEntry = SERVER_CANDIDATES.find((f) => existsSync(f));
if (!serverEntry) {
  throw new Error(
    `Could not locate the built server entry. Looked in:\n` +
      SERVER_CANDIDATES.map((f) => `  ${f}`).join("\n"),
  );
}
console.log(`· server entry: ${serverEntry}`);

/* --------------------- 2. render the shell once, offline ------------------ */

const mod = await import(pathToFileURL(serverEntry).href);
const fetchHandler = mod.default?.fetch ?? mod.fetch;
if (typeof fetchHandler !== "function") {
  throw new Error("The built server entry does not expose a fetch handler.");
}

const response = await fetchHandler(
  new Request("http://localhost/"),
  {},
  {
    waitUntil() {},
    passThroughOnException() {},
  },
);

if (!response.ok) {
  throw new Error(`Rendering the app shell failed with status ${response.status}.`);
}

let html = await response.text();
if (!html.includes("<html")) {
  throw new Error("The rendered shell does not look like an HTML document.");
}

// The APK has no server: drop the remote font stylesheet so the first paint
// never waits on the network. System fallbacks are already declared in CSS.
html = html.replace(/<link[^>]+fonts\.(?:googleapis|gstatic)\.com[^>]*>/g, "");

/* ------------------ 3. normalise everything into dist/client -------------- */

mkdirSync(targetDir, { recursive: true });
if (resolve(clientDir) !== resolve(targetDir)) {
  cpSync(clientDir, targetDir, { recursive: true });
}

writeFileSync(join(targetDir, "index.html"), html, "utf8");
// WebView reload / deep-link fallback: serve the same document so the client
// router resolves the path itself instead of showing a 404 page.
copyFileSync(join(targetDir, "index.html"), join(targetDir, "404.html"));

/* ---------------------------- 4. verify offline --------------------------- */

if (!existsSync(join(targetDir, "index.html"))) {
  throw new Error("dist/client/index.html was not produced.");
}
if (!existsSync(join(targetDir, "assets"))) {
  throw new Error(`dist/client/assets is missing — contents: ${ls(targetDir)}`);
}
const remote = html.match(/(?:src|href)="https?:\/\/[^"]+"/g) ?? [];
if (remote.length) {
  console.warn(`⚠ shell still references remote URLs: ${remote.join(", ")}`);
}

console.log(`\n✔ Offline shell written to dist/client/index.html (${html.length} bytes)`);
console.log(`  dist/client: ${ls(targetDir)}`);
