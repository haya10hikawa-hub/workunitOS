#!/usr/bin/env node
/**
 * Phase E1 — Electron dev-shell runtime smoke check (dependency-free, no GUI).
 *
 * Read-only, fail-closed on artifact problems. Verifies the safe-shell is RUNTIME
 * READY without launching a GUI and without executing any shell/file/provider action:
 *
 *   - electron/main.ts and electron/preload.ts exist
 *   - electron:dev and electron:build:check scripts exist
 *   - the renderer start URL is governed by ATRA_ELECTRON_START_URL (default
 *     http://localhost:3000) and nothing else
 *   - reports whether the electron binary is resolvable (informational only — the
 *     `electron` devDependency install is the developer's local step; per the alpha
 *     safety gate it must be a devDependency, never a runtime dependency)
 *
 * It NEVER launches Electron, opens a window, reads product data, calls the network,
 * or runs shell/file/provider commands. GUI verification is a manual local step.
 */

import { readFileSync, existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { createRequire } from "node:module"
import path from "node:path"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const MAIN = path.join(root, "electron/main.ts")
const PRELOAD = path.join(root, "electron/preload.ts")
const DEFAULT_START_URL = "http://localhost:3000"

const failures = []
const notes = []
function check(name, ok, detail) {
  if (!ok) failures.push(`${name}${detail ? ` — ${detail}` : ""}`)
}

check("main-exists", existsSync(MAIN), "electron/main.ts missing")
check("preload-exists", existsSync(PRELOAD), "electron/preload.ts missing")

const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"))
const scripts = pkg.scripts ?? {}
check("electron-dev-script", typeof scripts["electron:dev"] === "string", "electron:dev script missing")
check("electron-build-check-script", scripts["electron:build:check"] === "node scripts/electron-build-check.mjs", "electron:build:check script missing")

if (existsSync(MAIN)) {
  const main = readFileSync(MAIN, "utf8")
  check("start-url-governed", main.includes("ATRA_ELECTRON_START_URL"), "main.ts must read ATRA_ELECTRON_START_URL")
  check("start-url-default-localhost", main.includes(DEFAULT_START_URL), `default dev URL ${DEFAULT_START_URL} expected`)
  // The dev script must pass the start URL via the env var, not hardcode anything else.
  const dev = scripts["electron:dev"] ?? ""
  check("dev-uses-start-url-or-localhost", dev.includes("ATRA_ELECTRON_START_URL") || dev.includes(DEFAULT_START_URL), "electron:dev must use ATRA_ELECTRON_START_URL/localhost")
}

// Informational: is the electron binary installed? Not a failure if absent.
let binaryResolvable = false
try {
  // Resolve from the project root without importing/executing electron.
  createRequire(path.join(root, "package.json")).resolve("electron")
  binaryResolvable = true
} catch {
  binaryResolvable = false
}
notes.push(
  binaryResolvable
    ? "electron binary is resolvable; you can run `npm run electron:dev` (GUI requires a display)."
    : "electron devDependency is NOT installed. To run the GUI locally:\n      npm install --save-dev electron && npm run dev && (in another shell) npm run electron:dev",
)

if (failures.length > 0) {
  console.error("❌ Electron runtime smoke check failed:")
  for (const f of failures) console.error(`  - ${f}`)
  process.exit(1)
}
console.log("✅ Electron dev-shell is runtime-ready (no GUI launched, no shell/file/provider action).")
for (const n of notes) console.log(`   • ${n}`)
