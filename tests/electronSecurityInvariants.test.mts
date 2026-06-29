/**
 * Phase E0 — Electron safe-shell security invariants (source-level).
 *
 * Proves the Electron shell is a desktop container only and adds NO execution
 * authority: secure BrowserWindow settings, a contextBridge preload that exposes only
 * a read-only allowlist, read-only IPC only, and the absence of any forbidden
 * shell/file/provider/token/secret/approval/external-execution surface.
 *
 * These are source scans (no Electron runtime is installed; the alpha safety gate
 * forbids the electron dependency). Comments are stripped before forbidden-name scans
 * so explanatory prose naming a forbidden concept never causes a false pass/fail.
 */

import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync, existsSync } from "node:fs"
import path from "node:path"

const root = process.cwd()
const MAIN = path.join(root, "electron/main.ts")
const PRELOAD = path.join(root, "electron/preload.ts")

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
}

const mainRaw = existsSync(MAIN) ? readFileSync(MAIN, "utf8") : ""
const preloadRaw = existsSync(PRELOAD) ? readFileSync(PRELOAD, "utf8") : ""
const main = stripComments(mainRaw)
const preload = stripComments(preloadRaw)
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"))

// 1–2. Files exist.
test("1. electron/main.ts exists", () => assert.equal(existsSync(MAIN), true))
test("2. electron/preload.ts exists", () => assert.equal(existsSync(PRELOAD), true))

// 3–5. Secure BrowserWindow settings.
test("3. BrowserWindow uses nodeIntegration: false", () => assert.match(main, /nodeIntegration:\s*false/))
test("4. BrowserWindow uses contextIsolation: true", () => assert.match(main, /contextIsolation:\s*true/))
test("5. BrowserWindow uses sandbox: true", () => assert.match(main, /sandbox:\s*true/))

// 6. Preload path configured.
test("6. preload path is configured", () => assert.match(main, /preload:\s*\w/))

// 7–9. Preload contextBridge allowlist.
test("7. preload uses contextBridge", () => assert.match(preload, /contextBridge\.exposeInMainWorld\(\s*["']atraDesktop["']/))
test("8. preload does not expose ipcRenderer directly", () => {
  assert.equal(/exposeInMainWorld\([^)]*ipcRenderer/.test(preload), false)
  // Only invoke() may be used internally; raw send/on/removeListener must not appear.
  for (const raw of ["ipcRenderer.send", "ipcRenderer.on", "ipcRenderer.removeListener", "ipcRenderer.postMessage", "ipcRenderer.sendSync"]) {
    assert.equal(preload.includes(raw), false, raw)
  }
})
test("9. preload exposes only getAppVersion and getPlatform", () => {
  const exposed = [...preload.matchAll(/(\w+):\s*\(\)\s*:/g)].map((m) => m[1])
  assert.deepEqual(new Set(exposed), new Set(["getAppVersion", "getPlatform"]))
})

// 10. Only allowed IPC channels are registered.
test("10. only allowed IPC channels are registered", () => {
  const handled = [...main.matchAll(/ipcMain\.handle\(\s*["']([^"']+)["']/g)].map((m) => m[1])
  const invoked = [...preload.matchAll(/ipcRenderer\.invoke\(\s*["']([^"']+)["']/g)].map((m) => m[1])
  const allowed = new Set(["atra:getAppVersion", "atra:getPlatform"])
  assert.deepEqual(new Set(handled), allowed)
  for (const ch of invoked) assert.equal(allowed.has(ch), true, ch)
  // No event-style listeners (ipcMain.on) that could accept arbitrary commands.
  assert.equal(/ipcMain\.on\(/.test(main), false)
})

// 11. Forbidden IPC / channel / action names are absent (from code, not comments).
test("11. forbidden IPC/channel/action names are absent", () => {
  const forbidden = ["runCommand", "execute", "createIssue", "schedule", "openFile", "openShell", "externalAction"]
  for (const name of forbidden) {
    assert.equal(main.includes(name), false, `main: ${name}`)
    assert.equal(preload.includes(name), false, `preload: ${name}`)
  }
  // Channel-name verbs must never appear as IPC channel strings.
  const channels = [...(main + preload).matchAll(/(?:handle|invoke)\(\s*["']([^"']+)["']/g)].map((m) => m[1])
  for (const ch of channels) {
    for (const verb of ["send", "post", "execute", "run", "create", "schedule", "read", "write", "shell", "open", "approval", "provider", "token", "secret"]) {
      assert.equal(ch.toLowerCase().includes(verb), false, `channel ${ch} contains ${verb}`)
    }
  }
})

// 12. No shell command API.
test("12. no shell command API is exposed", () => {
  for (const tok of ["shell", "child_process", "exec(", "spawn(", "execSync", "openShell"]) {
    assert.equal(main.includes(tok), false, `main: ${tok}`)
    assert.equal(preload.includes(tok), false, `preload: ${tok}`)
  }
})

// 13. No file read/write IPC.
test("13. no file read/write IPC is exposed", () => {
  for (const tok of ["readFile", "writeFile", "openFile", "fs.", "promises.readFile", "dialog"]) {
    assert.equal(main.includes(tok), false, `main: ${tok}`)
    assert.equal(preload.includes(tok), false, `preload: ${tok}`)
  }
})

// 14. No provider/token/secret/approval IPC.
test("14. no provider/token/secret/approval IPC is exposed", () => {
  for (const tok of ["provider", "token", "secret", "approval", "oauth", "vault", "rawPayload", "providerPayload"]) {
    assert.equal(main.toLowerCase().includes(tok.toLowerCase()), false, `main: ${tok}`)
    assert.equal(preload.toLowerCase().includes(tok.toLowerCase()), false, `preload: ${tok}`)
  }
})

// 15–16. No tools route / external execution route.
test("15. no /api/workunit/tools call is introduced", () => {
  assert.equal((main + preload).includes("/api/workunit/tools"), false)
})
test("16. no external execution route is introduced", () => {
  for (const tok of ["/api/workunit/tools", "externalActions", "executeExternal", "chat.postMessage", "messages/send", "/repos/", "fetch("]) {
    assert.equal((main + preload).includes(tok), false, tok)
  }
})

// 17. package.json includes electron:build:check.
test("17. package.json includes electron:build:check", () => {
  assert.equal(pkg.scripts["electron:build:check"], "node scripts/electron-build-check.mjs")
})

// 18. No packaging/signing/autoupdate dependency or scripts.
test("18. no packaging/signing/autoupdate dependency or scripts are introduced", () => {
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) }
  for (const dep of ["electron", "electron-builder", "electron-forge", "@electron-forge/cli", "electron-updater", "app-builder-lib", "electron-packager"]) {
    assert.equal(dep in deps, false, `forbidden dep: ${dep}`)
  }
  // Unambiguous packaging/signing/autoupdate tool invocations (generic words like
  // "package"/"make"/"sign" are intentionally excluded — they collide with benign
  // flags such as MODULE_TYPELESS_PACKAGE_JSON; the dependency check above is the
  // authoritative guard against the actual tools).
  const scriptText = JSON.stringify(pkg.scripts).toLowerCase()
  for (const tok of ["electron-builder", "electron-forge", "electron-packager", "notarize", "codesign", "electron-updater", "autoupdate", "--publish"]) {
    assert.equal(scriptText.includes(tok), false, `forbidden script token: ${tok}`)
  }
})

// Required security settings must be REAL — guard against silent weakening.
test("secure settings are not weakened (no insecure flags)", () => {
  for (const bad of ["webSecurity: false", "allowRunningInsecureContent", "experimentalFeatures", "enableRemoteModule", "nodeIntegrationInWorker", "@electron/remote", "nodeIntegration: true", "contextIsolation: false", "sandbox: false"]) {
    assert.equal(main.includes(bad), false, bad)
  }
  // External navigation must be deny-by-default.
  assert.match(main, /action:\s*"deny"/)
  assert.match(main, /will-navigate/)
})
