/**
 * Phase 2E: Offline Provider Fixtures
 *
 * Deterministic fixture inputs and expected outputs for exercising
 * the provider boundary, dry-run contract, and diagnostic redaction
 * without SDKs, network calls, env secrets, or execution.
 *
 * Live provider integration remains No-Go.
 */

import type { SanitizedLlmProviderRequest, LlmProviderRuntimeControls } from "./llmProviderBoundary.ts"
import type { SafeBlockedDiagnostic } from "./blockedDiagnosticRedaction.ts"

/** A single offline fixture exercising the full provider boundary. */
export type OfflineProviderFixture = {
  readonly name: string
  readonly description: string
  readonly request: SanitizedLlmProviderRequest
  readonly controls: LlmProviderRuntimeControls
  readonly expectedBlocked: boolean
  readonly expectedBlockedReasons?: readonly string[]
  readonly expectedDiagnostics?: readonly SafeBlockedDiagnostic[]
}

const BASE_PACK = {
  route: "fast_extraction" as const,
  nodeSummary: "Fixture test: summarize candidate",
  constraints: {
    externalExecutionBlocked: true as const,
    approvalRequired: true as const,
    humanReviewRequired: true as const,
    forbiddenActions: ["sendSlack", "createIssue"] as const,
  },
}

const CONTROLS_ON: LlmProviderRuntimeControls = {
  featureFlagEnabled: true,
  globalKillSwitchOpen: true,
  tenantAllowlisted: true,
  budgetLimitAvailable: true,
  redactionApplied: true,
  auditLoggingEnabled: true,
  p0ScannerEnabled: true,
  contextAllowlistApplied: true,
}

/**
 * All offline fixtures covering the provider boundary surface.
 * These are deterministic — same input always produces same output.
 */
export const OFFLINE_PROVIDER_FIXTURES: readonly OfflineProviderFixture[] = [
  {
    name: "all-controls-pass",
    description: "All controls pass, readiness go. Should be blocked by provider_implementation_missing.",
    request: { contextPack: BASE_PACK },
    controls: CONTROLS_ON,
    expectedBlocked: true,
    expectedBlockedReasons: ["provider_implementation_missing"],
  },
  {
    name: "readiness-no-go",
    description: "Empty policy. Should be blocked by readiness_gate_no_go.",
    request: { contextPack: BASE_PACK },
    controls: CONTROLS_ON,
    expectedBlocked: true,
    expectedBlockedReasons: ["readiness_gate_no_go"],
  },
  {
    name: "kill-switch-closed",
    description: "Global kill switch closed. Controls override readiness.",
    request: { contextPack: BASE_PACK },
    controls: { ...CONTROLS_ON, globalKillSwitchOpen: false },
    expectedBlocked: true,
    expectedBlockedReasons: ["global_kill_switch_closed"],
  },
  {
    name: "raw-provider-payload",
    description: "rawProviderPayload present. Should be blocked.",
    request: { contextPack: BASE_PACK, rawProviderPayload: { dangerous: true } },
    controls: CONTROLS_ON,
    expectedBlocked: true,
    expectedBlockedReasons: ["raw_provider_payload_forbidden"],
  },
  {
    name: "forbidden-context-approvalId",
    description: "approvalId in context pack. Should be blocked at context allowlist or forbidden_context level.",
    request: { contextPack: { ...BASE_PACK, approvalId: "ap-secret" } as unknown as typeof BASE_PACK },
    controls: CONTROLS_ON,
    expectedBlocked: true,
    expectedBlockedReasons: ["context_key_not_allowlisted"],
  },
  {
    name: "feature-flag-disabled",
    description: "Feature flag off. Should be blocked.",
    request: { contextPack: BASE_PACK },
    controls: { ...CONTROLS_ON, featureFlagEnabled: false },
    expectedBlocked: true,
    expectedBlockedReasons: ["feature_flag_disabled"],
  },
  {
    name: "p0-scanner-disabled",
    description: "P0 scanner off. Should be blocked.",
    request: { contextPack: BASE_PACK },
    controls: { ...CONTROLS_ON, p0ScannerEnabled: false },
    expectedBlocked: true,
    expectedBlockedReasons: ["p0_scanner_disabled"],
  },
]
