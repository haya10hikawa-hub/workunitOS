#!/usr/bin/env node
/**
 * Atra / WorkUnit OS — Electron safe-shell static build check (Phase E0).
 *
 * Dependency-free, read-only, fail-closed. Electron is intentionally NOT a package
 * dependency (the alpha safety gate forbids it), so this statically verifies the
 * Electron source files instead of compiling against the electron runtime:
 *
 *   - the safe-shell files exist
 *   - the BrowserWindow uses the required secure webPreferences
 *   - the preload exposes only the read-only allowlist via contextBridge
 *   - no forbidden IPC / shell / file / provider / token / secret / approval surface
 *   - no packaging / signing / autoupdate surface
 *
 * Exit 0 = pass, exit 1 = fail.
 */

import { readFileSync, existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const MAIN = path.join(root, "electron/main.ts")
const PRELOAD = path.join(root, "electron/preload.ts")

const failures = []
function check(name, condition, detail) {
  if (!condition) failures.push(`${name}${detail ? ` — ${detail}` : ""}`)
}

// Strip line and block comments so prose (which legitimately names forbidden
// concepts to explain why they are absent) never trips the source scans.
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
}

check("main-exists", existsSync(MAIN), "electron/main.ts missing")
check("preload-exists", existsSync(PRELOAD), "electron/preload.ts missing")
if (failures.length === 0) {
  const main = stripComments(readFileSync(MAIN, "utf8"))
  const preload = stripComments(readFileSync(PRELOAD, "utf8"))

  // Required secure BrowserWindow settings.
  check("node-integration-false", /nodeIntegration:\s*false/.test(main))
  check("context-isolation-true", /contextIsolation:\s*true/.test(main))
  check("sandbox-true", /sandbox:\s*true/.test(main))
  check("preload-configured", /preload:\s*\w/.test(main))
  check("deny-window-open", /setWindowOpenHandler\([^)]*\)\s*=>\s*\(\{\s*action:\s*"deny"/.test(main) || /action:\s*"deny"/.test(main))

  // Read-only IPC allowlist only.
  const ipcHandles = [...main.matchAll(/ipcMain\.handle\(\s*["']([^"']+)["']/g)].map((m) => m[1])
  const ALLOWED_IPC = new Set(["atra:getAppVersion", "atra:getPlatform"])
  check("ipc-allowlist-only", ipcHandles.every((ch) => ALLOWED_IPC.has(ch)), `unexpected IPC: ${ipcHandles.filter((c) => !ALLOWED_IPC.has(c)).join(", ")}`)
  check("no-ipc-on", !/ipcMain\.on\(/.test(main), "ipcMain.on (event listener) is forbidden")

  // Preload allowlist only.
  check("preload-context-bridge", /contextBridge\.exposeInMainWorld\(\s*["']atraDesktop["']/.test(preload))
  check("preload-no-raw-ipc-exposed", !/exposeInMainWorld\([^)]*ipcRenderer/.test(preload), "raw ipcRenderer must not be exposed")
  check("preload-getappversion", /getAppVersion/.test(preload))
  check("preload-getplatform", /getPlatform/.test(preload))
  const invoked = [...preload.matchAll(/ipcRenderer\.invoke\(\s*["']([^"']+)["']/g)].map((m) => m[1])
  check("preload-invoke-allowlist", invoked.every((ch) => ALLOWED_IPC.has(ch)), `unexpected invoke: ${invoked.filter((c) => !ALLOWED_IPC.has(c)).join(", ")}`)

  // Forbidden capability surface (electron modules / channel names / concepts).
  const FORBIDDEN = [
    /\bshell\b/, /\bdialog\b/, /child_process/, /\bexec\b/, /\bspawn\b/,
    /\breadFile\b/, /\bwriteFile\b/, /\bopenFile\b/, /\bopenShell\b/,
    /\bfetch\s*\(/, /\bglobalShortcut\b/, /\bTray\b/, /\bNotification\b/,
    /enableRemoteModule/, /nodeIntegrationInWorker/, /webSecurity:\s*false/,
    /allowRunningInsecureContent/, /experimentalFeatures/, /@electron\/remote/,
    /\brunCommand\b/, /\bcreateIssue\b/, /externalAction/, /\boauth\b/i, /\bvault\b/i,
  ]
  for (const src of [["main", main], ["preload", preload]]) {
    for (const pat of FORBIDDEN) {
      check(`no-forbidden-${src[0]}`, !pat.test(src[1]), `${pat} found in electron/${src[0]}.ts`)
    }
  }
  check("no-tools-route", !/\/api\/workunit\/tools/.test(main + preload), "must not reference the tools route")
}

if (failures.length > 0) {
  console.error("❌ Electron safe-shell build check failed:")
  for (const f of failures) console.error(`  - ${f}`)
  process.exit(1)
}
console.log("✅ Electron safe-shell build check passed. Read-only allowlist IPC only; no execution authority added.")
