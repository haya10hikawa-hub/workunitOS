/**
 * Phase E1 — Electron runtime / dev-shell policy.
 *
 * Verifies the dev-shell is runtime-ready and remains a safe shell, independent of
 * whether the `electron` devDependency is currently installed (its install is a local
 * developer step; per the alpha safety gate it may exist ONLY as a devDependency).
 *
 * Source-level + policy assertions: dependency-free, no network, no GUI.
 */

import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync, existsSync } from "node:fs"
import path from "node:path"
import { evaluateElectronDependencyPolicy, FORBIDDEN_ELECTRON_DEPENDENCIES } from "../scripts/electronDependencyPolicy.mjs"

const root = process.cwd()
const read = (p: string) => readFileSync(path.join(root, p), "utf8")
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
}
const pkg = JSON.parse(read("package.json"))
const main = stripComments(read("electron/main.ts"))
const preload = stripComments(read("electron/preload.ts"))

// 1. Electron, IF present in package.json, is a devDependency only (never runtime/
//    optional/peer). True whether electron is absent or added as a devDependency.
test("1. electron is permitted only as a devDependency (policy-enforced)", () => {
  const res = evaluateElectronDependencyPolicy(pkg, {
    buildCheckScriptOk: pkg.scripts?.["electron:build:check"] === "node scripts/electron-build-check.mjs",
    invariantTestExists: existsSync(path.join(root, "tests/electronSecurityInvariants.test.mts")),
  })
  assert.equal(res.ok, true, res.failures.join(","))
  assert.equal("electron" in (pkg.dependencies ?? {}), false)
  assert.equal("electron" in (pkg.optionalDependencies ?? {}), false)
  assert.equal("electron" in (pkg.peerDependencies ?? {}), false)
})

// 2–3. Required dev scripts exist.
test("2. package.json has electron:dev", () => {
  assert.equal(typeof pkg.scripts?.["electron:dev"], "string")
})
test("3. package.json has electron:build:check", () => {
  assert.equal(pkg.scripts?.["electron:build:check"], "node scripts/electron-build-check.mjs")
})

// 4. No packaging/signing/autoupdate scripts.
test("4. package.json has no packaging/signing/autoupdate scripts", () => {
  const scriptText = JSON.stringify(pkg.scripts ?? {}).toLowerCase()
  for (const tok of ["electron-builder", "electron-forge", "electron-packager", "notarize", "codesign", "electron-updater", "autoupdate", "--publish"]) {
    assert.equal(scriptText.includes(tok), false, `forbidden script token: ${tok}`)
  }
})

// 5. No electron packaging/updater/signing dependency anywhere.
test("5. no electron-builder/electron-forge/electron-updater (or peers) dependency", () => {
  const all = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}), ...(pkg.optionalDependencies ?? {}), ...(pkg.peerDependencies ?? {}) }
  for (const dep of FORBIDDEN_ELECTRON_DEPENDENCIES) assert.equal(dep in all, false, `forbidden dep: ${dep}`)
  assert.equal(Object.keys(all).some((d) => d.startsWith("@electron-forge/")), false)
})

// 6. Electron main only loads ATRA_ELECTRON_START_URL or localhost:3000.
test("6. electron main loads ATRA_ELECTRON_START_URL or localhost:3000 only", () => {
  assert.match(main, /process\.env\.ATRA_ELECTRON_START_URL/)
  assert.match(main, /http:\/\/localhost:3000/)
  // loadURL must use the governed START_URL constant, never an ad-hoc/remote URL.
  assert.match(main, /loadURL\(\s*START_URL\s*\)/)
  const otherHttp = [...main.matchAll(/https?:\/\/[^\s"')]+/g)].map((m) => m[0]).filter((u) => !u.startsWith("http://localhost:3000"))
  assert.deepEqual(otherHttp, [], `unexpected URL(s) in main: ${otherHttp.join(", ")}`)
})

// 7. No unsafe shell.openExternal; external navigation is deny-by-default.
test("7. electron main has no shell.openExternal and denies navigation by default", () => {
  assert.equal(main.includes("shell.openExternal"), false)
  assert.equal(main.includes("openExternal"), false)
  assert.match(main, /action:\s*"deny"/)
  assert.match(main, /will-navigate/)
})

// 8. Preload exposes only getAppVersion/getPlatform.
test("8. preload exposes only getAppVersion and getPlatform", () => {
  assert.match(preload, /contextBridge\.exposeInMainWorld\(\s*["']atraDesktop["']/)
  const exposed = [...preload.matchAll(/(\w+):\s*\(\)\s*:/g)].map((m) => m[1])
  assert.deepEqual(new Set(exposed), new Set(["getAppVersion", "getPlatform"]))
  assert.equal(/exposeInMainWorld\([^)]*ipcRenderer/.test(preload), false)
})

// 9. No forbidden IPC channels.
test("9. no forbidden IPC channels are introduced", () => {
  const channels = [...(main + preload).matchAll(/(?:handle|invoke)\(\s*["']([^"']+)["']/g)].map((m) => m[1])
  assert.deepEqual(new Set(channels), new Set(["atra:getAppVersion", "atra:getPlatform"]))
  for (const name of ["runCommand", "execute", "createIssue", "schedule", "readFile", "writeFile", "openFile", "openShell", "externalAction"]) {
    assert.equal(main.includes(name), false, `main: ${name}`)
    assert.equal(preload.includes(name), false, `preload: ${name}`)
  }
})

// 10. Electron runtime scripts call no external execution / tools route.
test("10. electron runtime scripts call no external execution or /api/workunit/tools", () => {
  const smoke = stripComments(read("scripts/electron-runtime-smoke.mjs"))
  const buildCheck = stripComments(read("scripts/electron-build-check.mjs"))
  // Runtime-adjacent code (main/preload/smoke) must contain no execution or network.
  // The build-check is a static analyzer whose source legitimately *names* forbidden
  // tokens as detection patterns, so it is only scanned for the tools route.
  for (const src of [main, preload, smoke]) {
    assert.equal(/\bfetch\s*\(/.test(src), false)
    for (const tok of ["child_process", "exec(", "spawn(", "shell.openExternal", "chat.postMessage", "messages/send"]) {
      assert.equal(src.includes(tok), false, tok)
    }
  }
  for (const src of [main, preload, smoke, buildCheck]) {
    assert.equal(src.includes("/api/workunit/tools"), false)
  }
})

// Runtime smoke script is dependency-free (node: builtins or local relative only).
test("runtime smoke script imports no npm dependency", () => {
  const src = read("scripts/electron-runtime-smoke.mjs")
  const imports = [...src.matchAll(/^import .*from ["']([^"']+)["']/gm)].map((m) => m[1])
  for (const i of imports) assert.ok(i.startsWith("node:") || i.startsWith("./") || i.startsWith("../"), `npm import forbidden: ${i}`)
})
