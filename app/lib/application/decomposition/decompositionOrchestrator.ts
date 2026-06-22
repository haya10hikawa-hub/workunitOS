import { buildLlmContextPack } from "../llmContext/buildLlmContextPack.ts"
import type { LLMContextPack } from "../llmContext/types.ts"
import { applyColdMemoryPolicy } from "../memory/coldMemoryPolicy.ts"
import { selectHotMemorySummaries } from "../memory/hotMemorySelector.ts"
import { selectWarmMemorySummaries } from "../memory/warmMemorySelector.ts"
import type { ColdMemoryPolicyResult } from "../memory/types.ts"
import type { SourceRef } from "../../domain/types.ts"
import { classifyDecompositionCandidate } from "./decompositionClassifier.ts"
import { createStaticMockDecompositionLlm, validateMockDecompositionLlmOutput, type MockDecompositionLlm } from "./mockDecompositionLlm.ts"
import { runRuleGate, type RuleGateResult } from "./ruleGate.ts"
import type { DecompositionResult, DecompositionTarget } from "./types.ts"

export type DecompositionOrchestratorInput = {
  readonly safeInputSummary: string
  readonly sourceRef?: SourceRef
  readonly humanInputRef?: string
  readonly sourceSummary?: string
  readonly evidenceSummaries?: readonly string[]
  readonly relatedCandidateSummaries?: readonly string[]
  readonly hotMemorySummaries?: readonly string[]
  readonly warmMemorySummaries?: readonly string[]
  readonly coldMemoryRefs?: readonly string[]
  readonly rawContext?: unknown
  readonly mockLlm?: MockDecompositionLlm
}

type DecompositionOrchestrationBlockedReason =
  | "forbidden_context"
  | "forbidden_memory"
  | "invalid_mock_llm_output"
  | "forbidden_mock_llm_output"
  | "p0_violation"

export type DecompositionOrchestrationResult =
  | {
    readonly ok: true
    readonly phase: "candidate_only"
    readonly candidateOnly: true
    readonly mockBoundary: "mock_only"
    readonly contextPack: LLMContextPack
    readonly coldMemoryPolicy: ColdMemoryPolicyResult
    readonly decomposition: DecompositionResult
    readonly promotionGate: RuleGateResult
    readonly auditSignalCandidate: { readonly kind: "decomposition_orchestration"; readonly candidateOnly: true }
    readonly tuningSignalCandidate: { readonly kind: "pm_correction_pending"; readonly candidateOnly: true }
  }
  | {
    readonly ok: false
    readonly phase: "blocked"
    readonly candidateOnly: true
    readonly mockBoundary: "mock_only"
    readonly reason: DecompositionOrchestrationBlockedReason
    readonly mockCalled: boolean
    readonly findings?: readonly unknown[]
  }

export function runDecompositionOrchestrator(input: DecompositionOrchestratorInput): DecompositionOrchestrationResult {
  const hot = selectHotMemorySummaries({ summaries: input.hotMemorySummaries ?? [] })
  if (!hot.ok) return blocked("forbidden_memory", false, hot.findings)
  const warm = selectWarmMemorySummaries({ summaries: input.warmMemorySummaries ?? [] })
  if (!warm.ok) return blocked("forbidden_memory", false, warm.findings)
  const coldMemoryPolicy = applyColdMemoryPolicy({ refs: input.coldMemoryRefs ?? [] })
  const context = buildLlmContextPack({
    route: "fast_extraction",
    nodeSummary: input.safeInputSummary,
    sourceSummary: input.sourceSummary,
    evidenceSummaries: [...(input.evidenceSummaries ?? []), ...hot.summaries, ...warm.summaries],
    relatedCandidateSummaries: input.relatedCandidateSummaries,
    rawContext: input.rawContext,
  })
  if (!context.ok) return blocked("forbidden_context", false, context.findings)
  const provider = input.mockLlm ?? createStaticMockDecompositionLlm({ text: input.safeInputSummary })
  const mockOutput = validateMockDecompositionLlmOutput(provider.generate({ contextPack: context.pack }))
  if (!mockOutput.ok) return blocked(mockOutput.reason, true)
  const decomposition = classifyDecompositionCandidate({
    text: mockOutput.output.text,
    sourceRef: input.sourceRef,
    humanInputRef: input.humanInputRef,
    intent: mockOutput.output.intent,
    outcome: mockOutput.output.outcome,
    verifier: mockOutput.output.verifier,
    acceptanceCriteria: mockOutput.output.acceptanceCriteria,
  })
  if (decomposition.humanReview?.severity === "p0") return blocked("p0_violation", true)
  return {
    ok: true,
    phase: "candidate_only",
    candidateOnly: true,
    mockBoundary: "mock_only",
    contextPack: context.pack,
    coldMemoryPolicy,
    decomposition,
    promotionGate: runRuleGate({ boundary: gateBoundary(decomposition.target), source: gateSource(decomposition.target), doneCondition: decomposition.doneCondition, context: context.pack }),
    auditSignalCandidate: { kind: "decomposition_orchestration", candidateOnly: true },
    tuningSignalCandidate: { kind: "pm_correction_pending", candidateOnly: true },
  }
}

function gateBoundary(target: DecompositionTarget): "formal_candidate" | "merge_finalization" | "split_finalization" {
  if (target === "merge_candidate") return "merge_finalization"
  if (target === "split_candidate") return "split_finalization"
  return "formal_candidate"
}

function gateSource(target: DecompositionTarget): "pending" | "evidence" | "subtask" | "noise" | "merge_candidate" | "split_candidate" {
  if (target === "evidence_candidate" || target === "ai_silent_processing_event_candidate") return "evidence"
  if (target === "subtask_candidate") return "subtask"
  if (target === "noise_candidate") return "noise"
  if (target === "merge_candidate") return "merge_candidate"
  if (target === "split_candidate") return "split_candidate"
  return "pending"
}

function blocked(reason: DecompositionOrchestrationBlockedReason, mockCalled: boolean, findings?: readonly unknown[]): DecompositionOrchestrationResult {
  return { ok: false, phase: "blocked", candidateOnly: true, mockBoundary: "mock_only", reason, mockCalled, findings }
}
