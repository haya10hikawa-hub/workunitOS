/**
 * Phase E0.5 — Electron dependency policy gate.
 *
 * Exercises the pure policy function with positive and negative controls so the gate
 * provably ALLOWS Electron only as a devDependency (with safe-shell guards present)
 * and provably REJECTS it as a runtime/optional/peer dependency, as well as any
 * packaging/updater/signing dependency. Also confirms the real gate still exits 0 and
 * that the Electron security-invariant test file is present.
 *
 * Pure, dependency-free, no network, no GUI.
 */

import test from "node:test"
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { evaluateElectronDependencyPolicy, FORBIDDEN_ELECTRON_DEPENDENCIES } from "../scripts/electronDependencyPolicy.mjs"

const root = process.cwd()
// Guards that exist in this phase, so an electron devDependency would be allowed.
const guardsPresent = { buildCheckScriptOk: true, invariantTestExists: true }

// 1. No electron dependency at all → allowed.
test("1. policy allows package.json with no electron dependency", () => {
  const res = evaluateElectronDependencyPolicy({ dependencies: { next: "16" }, devDependencies: { typescript: "5" } }, guardsPresent)
  assert.equal(res.ok, true)
  assert.equal(res.electronPresent, false)
})

// 2. electron only in devDependencies (guards present) → allowed.
test("2. policy allows electron only in devDependencies", () => {
  const res = evaluateElectronDependencyPolicy({ devDependencies: { electron: "33.0.0" } }, guardsPresent)
  assert.equal(res.ok, true, res.failures.join(","))
  assert.equal(res.electronDevOnly, true)
})

// 3. electron in dependencies → rejected.
test("3. policy rejects electron in dependencies", () => {
  const res = evaluateElectronDependencyPolicy({ dependencies: { electron: "33.0.0" } }, guardsPresent)
  assert.equal(res.ok, false)
  assert.equal(res.failures.includes("electron-in-dependencies"), true)
})

// 4. electron in optionalDependencies → rejected.
test("4. policy rejects electron in optionalDependencies", () => {
  const res = evaluateElectronDependencyPolicy({ optionalDependencies: { electron: "33.0.0" } }, guardsPresent)
  assert.equal(res.ok, false)
  assert.equal(res.failures.includes("electron-in-optionalDependencies"), true)
})

// 5. electron in peerDependencies → rejected.
test("5. policy rejects electron in peerDependencies", () => {
  const res = evaluateElectronDependencyPolicy({ peerDependencies: { electron: "33.0.0" } }, guardsPresent)
  assert.equal(res.ok, false)
  assert.equal(res.failures.includes("electron-in-peerDependencies"), true)
})

// 6. electron-builder → rejected (even alongside a valid electron devDependency).
test("6. policy rejects electron-builder", () => {
  const res = evaluateElectronDependencyPolicy({ devDependencies: { electron: "33.0.0", "electron-builder": "24" } }, guardsPresent)
  assert.equal(res.ok, false)
  assert.equal(res.failures.includes("forbidden-electron-dep:electron-builder"), true)
})

// 7. electron-updater → rejected.
test("7. policy rejects electron-updater", () => {
  const res = evaluateElectronDependencyPolicy({ devDependencies: { electron: "33.0.0", "electron-updater": "6" } }, guardsPresent)
  assert.equal(res.ok, false)
  assert.equal(res.failures.includes("forbidden-electron-dep:electron-updater"), true)
})

// 8. electron-forge (and @electron-forge/*) → rejected.
test("8. policy rejects electron-forge and scoped @electron-forge/*", () => {
  const flat = evaluateElectronDependencyPolicy({ devDependencies: { electron: "33.0.0", "electron-forge": "6" } }, guardsPresent)
  const scoped = evaluateElectronDependencyPolicy({ devDependencies: { electron: "33.0.0", "@electron-forge/cli": "7" } }, guardsPresent)
  assert.equal(flat.failures.includes("forbidden-electron-dep:electron-forge"), true)
  assert.equal(scoped.failures.includes("forbidden-electron-dep:@electron-forge/*"), true)
})

// 9. electron present but electron:build:check script missing → rejected.
test("9. policy rejects electron when electron:build:check script is missing", () => {
  const res = evaluateElectronDependencyPolicy({ devDependencies: { electron: "33.0.0" } }, { buildCheckScriptOk: false, invariantTestExists: true })
  assert.equal(res.ok, false)
  assert.equal(res.failures.includes("electron-without-build-check-script"), true)
})

// 10. electron present but security-invariant test missing → rejected.
test("10. policy rejects electron when the security-invariant test is missing", () => {
  const res = evaluateElectronDependencyPolicy({ devDependencies: { electron: "33.0.0" } }, { buildCheckScriptOk: true, invariantTestExists: false })
  assert.equal(res.ok, false)
  assert.equal(res.failures.includes("electron-without-invariant-test"), true)
})

// 11. The existing Electron security-invariant test file remains present (its cases
//     run as part of the full suite), and the real alpha gate still exits 0.
test("11. electron security-invariant test exists and the real gate still passes", () => {
  assert.equal(existsSync(path.join(root, "tests/electronSecurityInvariants.test.mts")), true)
  const out = execFileSync("node", ["scripts/alpha-safety-gate.mjs"], { encoding: "utf8" })
  assert.match(out, /Alpha safety gate passed/)
})

// Forbidden-list completeness sanity (mirrors the absolute non-goals).
test("forbidden Electron dependency list covers packaging/updater/signing/secret tools", () => {
  for (const name of ["electron-builder", "electron-forge", "electron-updater", "keytar", "node-keytar", "electron-store", "auto-launch"]) {
    assert.equal(FORBIDDEN_ELECTRON_DEPENDENCIES.includes(name), true, name)
  }
})

// The policy helper must itself be dependency-free (no npm import) so the gate stays
// dependency-free when it imports the helper.
test("policy helper imports no npm dependency", () => {
  const src = readFileSync(path.join(root, "scripts/electronDependencyPolicy.mjs"), "utf8")
  const imports = [...src.matchAll(/^import .*from ["']([^"']+)["']/gm)].map((m) => m[1])
  for (const i of imports) {
    assert.ok(i.startsWith("node:") || i.startsWith("./") || i.startsWith("../"), `npm import forbidden in helper: ${i}`)
  }
})

// Real package.json today: electron is absent, so the policy is satisfied.
test("real package.json satisfies the policy (electron currently absent)", () => {
  const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"))
  const res = evaluateElectronDependencyPolicy(pkg, {
    buildCheckScriptOk: (pkg.scripts ?? {})["electron:build:check"] === "node scripts/electron-build-check.mjs",
    invariantTestExists: existsSync(path.join(root, "tests/electronSecurityInvariants.test.mts")),
  })
  assert.equal(res.ok, true, res.failures.join(","))
})
