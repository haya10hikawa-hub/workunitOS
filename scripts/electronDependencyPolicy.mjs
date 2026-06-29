/**
 * Phase E0.5 — Electron dependency policy (pure, dependency-free).
 *
 * Encodes the conditional rule that replaces the previous blanket Electron ban:
 *
 *   Electron MAY be present, but ONLY as a devDependency, AND only while the
 *   safe-shell guards exist (the electron:build:check script and the Electron
 *   security-invariant test). Electron must NEVER be a runtime / optional / peer
 *   dependency, and packaging / updater / signing / native-secret dependencies
 *   remain forbidden everywhere.
 *
 * This module performs NO file I/O, NO network access, and NEVER exits the process.
 * The caller (scripts/alpha-safety-gate.mjs) supplies the already-read package.json
 * object and the two environment facts, so the policy is a pure, unit-testable
 * function. Electron is NOT packaged or released by allowing the dev dependency.
 */

/**
 * Electron packaging / updater / signing / native-secret dependencies that remain
 * forbidden in every dependency section. Allowing the `electron` devDependency must
 * not open the door to any of these.
 */
export const FORBIDDEN_ELECTRON_DEPENDENCIES = Object.freeze([
  "electron-builder",
  "electron-forge",
  "electron-updater",
  "electron-packager",
  "electron-log",
  "electron-store",
  "app-builder-lib",
  "auto-launch",
  "keytar",
  "node-keytar",
])

/**
 * Evaluate the Electron dependency policy.
 *
 * @param {object} pkgJson Parsed package.json.
 * @param {{ buildCheckScriptOk?: boolean, invariantTestExists?: boolean }} env
 *   buildCheckScriptOk  — the `electron:build:check` script is present and correct.
 *   invariantTestExists — the Electron security-invariant test file exists.
 * @returns {{ ok: boolean, electronPresent: boolean, electronDevOnly: boolean, failures: string[] }}
 */
export function evaluateElectronDependencyPolicy(pkgJson, env = {}) {
  const runtime = pkgJson?.dependencies ?? {}
  const dev = pkgJson?.devDependencies ?? {}
  const optional = pkgJson?.optionalDependencies ?? {}
  const peer = pkgJson?.peerDependencies ?? {}
  const all = { ...runtime, ...dev, ...optional, ...peer }

  const failures = []

  // Electron must never live outside devDependencies.
  if ("electron" in runtime) failures.push("electron-in-dependencies")
  if ("electron" in optional) failures.push("electron-in-optionalDependencies")
  if ("electron" in peer) failures.push("electron-in-peerDependencies")

  // No packaging / updater / signing / native-secret dependency anywhere.
  for (const name of FORBIDDEN_ELECTRON_DEPENDENCIES) {
    if (name in all) failures.push(`forbidden-electron-dep:${name}`)
  }
  if (Object.keys(all).some((name) => name.startsWith("@electron-forge/"))) {
    failures.push("forbidden-electron-dep:@electron-forge/*")
  }

  // If Electron is present at all, the safe-shell guards must exist.
  const electronPresent =
    "electron" in dev || "electron" in runtime || "electron" in optional || "electron" in peer
  if (electronPresent && env.buildCheckScriptOk !== true) {
    failures.push("electron-without-build-check-script")
  }
  if (electronPresent && env.invariantTestExists !== true) {
    failures.push("electron-without-invariant-test")
  }

  const electronDevOnly =
    "electron" in dev &&
    !("electron" in runtime) &&
    !("electron" in optional) &&
    !("electron" in peer)

  return { ok: failures.length === 0, electronPresent, electronDevOnly, failures }
}
