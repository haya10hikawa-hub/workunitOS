/**
 * Phase 2E: Offline Provider Fixture Gate
 *
 * Runs all offline fixtures through the provider boundary to
 * verify that blocked conditions are correctly enforced.
 *
 * This gate never calls a live provider, never imports SDKs,
 * never reads env secrets, and never produces executable output.
 *
 * Live provider integration remains No-Go.
 */

import { evaluateLlmProviderBoundary } from "./llmProviderBoundary.ts"
import { toSafeDiagnostics } from "./blockedDiagnosticRedaction.ts"
import { OFFLINE_PROVIDER_FIXTURES, type OfflineProviderFixture } from "./offlineProviderFixtures.ts"

export type FixtureGateResult = {
  readonly fixture: string
  readonly name: string
  readonly pass: boolean
  readonly blocked: boolean
  readonly blockedReasons: readonly string[]
  readonly diagnostics: readonly { readonly key: string; readonly reason: string }[]
}

/**
 * Run a single fixture through the provider boundary.
 * Returns structured gate result, never exposes raw values.
 */
export function runFixtureGate(fixture: OfflineProviderFixture): FixtureGateResult {
  const result = evaluateLlmProviderBoundary({
    request: fixture.request,
    controls: fixture.controls,
    policy: fixture.policy,
  })

  const pass = fixture.expectedBlocked === !result.ok
    && (!fixture.expectedBlockedReasons
      || fixture.expectedBlockedReasons.every((r: string) => result.blockedReasons.includes(r as never)))

  return {
    fixture: fixture.name,
    name: fixture.description,
    pass,
    blocked: !result.ok,
    blockedReasons: result.blockedReasons,
    diagnostics: result.findings
      ? toSafeDiagnostics(result.findings as unknown as Parameters<typeof toSafeDiagnostics>[0])
        .map((d) => ({ key: d.key, reason: d.reason }))
      : [],
  }
}

/**
 * Run all offline fixtures through the provider boundary.
 * Returns aggregate gate result.
 */
export function runOfflineFixtureGate(): {
  readonly total: number
  readonly passed: number
  readonly failed: number
  readonly allBlocked: boolean
  readonly results: readonly FixtureGateResult[]
} {
  const results = OFFLINE_PROVIDER_FIXTURES.map(runFixtureGate)
  return {
    total: results.length,
    passed: results.filter((r) => r.pass).length,
    failed: results.filter((r) => !r.pass).length,
    allBlocked: results.every((r) => r.blocked),
    results,
  }
}
