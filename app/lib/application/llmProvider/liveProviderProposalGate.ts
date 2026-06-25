/**
 * Phase 4A: Live Provider Adapter Proposal Gate
 *
 * Final gate that determines whether a future live provider adapter PR
 * may be opened. Does NOT connect a live provider.
 *
 * Even if this gate returns Go, it only allows opening a future PR.
 * It does NOT allow live integration within this phase.
 *
 * Live provider integration remains No-Go.
 */

import { evaluateLiveProviderReadiness, type ReadinessScorecardResult } from "./liveProviderReadinessScorecard.ts"

export type LiveProviderProposalGateResult = {
  readonly status: ReadinessScorecardResult
  readonly reason: string
  readonly mayOpenFutureLiveProviderPR: boolean
}

export function evaluateLiveProviderProposalGate(): LiveProviderProposalGateResult {
  const score = evaluateLiveProviderReadiness()
  if (score === "No-Go" || score === "Conditional Go") {
    return {
      status: score,
      reason: "Phase gates incomplete. Live provider integration remains No-Go.",
      mayOpenFutureLiveProviderPR: false,
    }
  }
  return {
    status: "Go — future live-provider PR may be opened",
    reason: "All Phase 2-3 gates passed. A separate future live provider adapter PR may be opened after human approval.",
    mayOpenFutureLiveProviderPR: true,
  }
}
