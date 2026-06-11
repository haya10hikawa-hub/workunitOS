/**
 * Mock LLM Provider
 *
 * Returns deterministic responses for testing the LLM pipeline.
 * Never makes real API calls. Never requires API keys.
 */

import type { LlmProvider, LlmRequest, LlmResponse } from "./types.ts"

/**
 * Create a mock LLM provider that returns the given JSON for every request.
 */
export function createMockLlmProvider(responses?: Record<string, unknown>): LlmProvider & {
  setResponse(stage: string, data: unknown): void
  getCallCount(): number
  getLastRequest(): LlmRequest | null
} {
  let callCount = 0
  let lastRequest: LlmRequest | null = null
  const stagedResponses: Record<string, unknown> = { ...responses }

  return {
    async generateJson(request: LlmRequest): Promise<LlmResponse> {
      callCount++
      lastRequest = request

      const data = stagedResponses[request.stage]
      const content = data !== undefined ? JSON.stringify(data) : JSON.stringify({ error: "no_mock_response", stage: request.stage })

      return {
        content,
        finishReason: "stop",
        usage: { promptTokens: content.length, completionTokens: content.length },
      }
    },

    setResponse(stage: string, data: unknown) {
      stagedResponses[stage] = data
    },

    getCallCount() { return callCount },
    getLastRequest() { return lastRequest },
  }
}

/** Standard mock responses for the full pipeline. */
export const STANDARD_MOCK_RESPONSES = {
  extract_candidate: {
    extractedSummary: "Urgent security review requested for the new API endpoint",
    detectedActors: ["Security Team", "PM"],
    detectedProblem: "API endpoint needs security review before launch",
    detectedDeadline: "2026-07-15",
    detectedIntent: "Request security review and approval",
    confidence: 0.85,
    riskFlags: [],
  },

  generate_workunit_draft: {
    title: "Security review for new API endpoint",
    situation: "A new API endpoint was developed and needs security review before production deployment.",
    problem: "The endpoint may have security vulnerabilities that need to be identified and fixed.",
    actors: ["Security Team", "PM"],
    nextAction: "Schedule security review session with the security team",
    tasks: [
      "Review endpoint code for common vulnerabilities",
      "Run automated security scans",
      "Document findings and recommendations",
    ],
    missingFields: [],
    suggestedImpact: 4,
    suggestedUrgency: 4,
    suggestedEffort: 3,
    suggestedActorWeight: 3,
    riskFlags: [],
  },

  evaluate_workunit: {
    isExecutable: true,
    isComplete: true,
    missingFields: [],
    warnings: [],
    hallucinationRisk: "low" as const,
    suggestedNextStep: "Assign to security team lead and begin review",
  },
}
