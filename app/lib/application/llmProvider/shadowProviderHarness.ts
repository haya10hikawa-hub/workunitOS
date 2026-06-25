/**
 * Phase 3D: Shadow Provider Harness
 *
 * End-to-end shadow harness using offline fixtures and mock transport.
 * No live provider. No SDK. No network. No execution.
 *
 * Live provider integration remains No-Go.
 */

import { OFFLINE_PROVIDER_FIXTURES } from "./offlineProviderFixtures.ts"
import { runFixtureGate, type FixtureGateResult } from "./offlineProviderFixtureGate.ts"

export type ShadowHarnessResult = {
  readonly total: number
  readonly passed: number
  readonly allBlocked: boolean
  readonly results: readonly FixtureGateResult[]
}

export function runShadowHarness(): ShadowHarnessResult {
  return runOfflineFixtureGate()
}

function runOfflineFixtureGate(): ShadowHarnessResult {
  const results = OFFLINE_PROVIDER_FIXTURES.map(runFixtureGate)
  return {
    total: results.length,
    passed: results.filter((r) => r.pass).length,
    allBlocked: results.every((r) => r.blocked),
    results,
  }
}
