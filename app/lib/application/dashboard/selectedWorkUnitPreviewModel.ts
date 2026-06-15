/**
 * Selected WorkUnit to DashboardPreviewGroup mapper.
 *
 * Security: Client-side preview assembly. targetHash, payloadHash, tenantId,
 * actorUserId, approvedByUserId, role, status, usedAt, tokens, secrets, and raw
 * provider payloads MUST NOT appear in any output.
 *
 * This is a pure function — it does not call APIs, access tokens, or perform I/O.
 */

import type { DashboardPreviewGroup } from "@/lib/application/actionField/dashboardPreviewClient.ts"
import type { InboxWorkUnit } from "@/lib/application/workunitInbox/types.ts"

// ─── Public types ───────────────────────────────────────────────

export type SelectedWorkUnitPreviewInput = {
  readonly selectedWorkUnit: InboxWorkUnit | null
  readonly selectedDecision: string | null
}

export type PreviewGroupResult =
  | { readonly ok: true; readonly group: DashboardPreviewGroup }
  | { readonly ok: false; readonly reason: "no_workunit_selected" | "decision_required" | "unsafe_target" }

// ─── Builder ────────────────────────────────────────────────────

/**
 * Build a safe {@link DashboardPreviewGroup} from the currently selected
 * WorkUnit and decision. Returns a not-ready result when:
 *
 * - No WorkUnit is selected (`no_workunit_selected`)
 * - A decision is required by readiness policy but missing (`decision_required`)
 * - The selected WorkUnit has no safe source/provider to derive a preview target
 *   (`unsafe_target`)
 */

export function buildPreviewGroupFromSelectedWorkUnit(
  input: SelectedWorkUnitPreviewInput,
): PreviewGroupResult {
  const { selectedWorkUnit, selectedDecision } = input

  // ── Gate: no WorkUnit ──────────────────────────────────────
  if (!selectedWorkUnit) {
    return { ok: false, reason: "no_workunit_selected" }
  }

  // ── Gate: decision required ─────────────────────────────────
  if (!selectedDecision) {
    return { ok: false, reason: "decision_required" }
  }

  // ── Determine safe target ───────────────────────────────────
  const source = resolveSafeSource(selectedWorkUnit)
  if (!source) {
    return { ok: false, reason: "unsafe_target" }
  }

  // ── Build actions ───────────────────────────────────────────
  const primaryAction = buildPrimaryPreviewAction(selectedWorkUnit, selectedDecision)

  return {
    ok: true,
    group: {
      workUnitId: selectedWorkUnit.id,
      workUnitTitle: selectedWorkUnit.title,
      source,
      actions: [primaryAction],
    },
  }
}

// ─── Helpers ────────────────────────────────────────────────────

function resolveSafeSource(workUnit: InboxWorkUnit): string | null {
  // Prefer repository path
  if (workUnit.repository) {
    return `${providerLabel(workUnit.sourceProvider)} / ${workUnit.repository}`
  }

  // Actor/assignee only when we have a provider
  if (workUnit.actor || workUnit.assignee) {
    const person = workUnit.actor ?? workUnit.assignee ?? ""
    return `${providerLabel(workUnit.sourceProvider)} / ${person}`
  }

  // sourceUrl is acceptable as a display source (no auth/tokens)
  if (workUnit.sourceUrl) {
    return workUnit.sourceUrl
  }

  // Provider label alone is the minimum safe source
  return providerLabel(workUnit.sourceProvider)
}

function buildPrimaryPreviewAction(
  workUnit: InboxWorkUnit,
  selectedDecision: string,
): DashboardPreviewGroup["actions"][number] {
  const actionType = resolveActionType(workUnit)
  const tool = mapTool(workUnit)

  const title = workUnit.nextAction.length > 0
    ? workUnit.nextAction
    : "Prepare action plan for selected WorkUnit"

  return {
    id: `action:${workUnit.id}`,
    type: actionType,
    tool,
    title,
    fields: buildSafeFields(workUnit, selectedDecision),
  }
}

function resolveActionType(
  workUnit: InboxWorkUnit,
): DashboardPreviewGroup["actions"][number]["type"] {
  // Only map to external action types when the source provider has a safe match
  switch (workUnit.sourceProvider) {
    case "slack":
      return "slack_reply"
    case "calendar":
      return "calendar_block"
    case "github":
      // Only use github_issue when repository info is available
      return workUnit.repository ? "github_issue" : "database_update"
    default:
      return "database_update"
  }
}

function mapTool(workUnit: InboxWorkUnit): string {
  switch (workUnit.sourceProvider) {
    case "slack":
      return "slack"
    case "calendar":
      return "calendar"
    case "github":
      return "github"
    default:
      return "workunit_os"
  }
}

function buildSafeFields(
  workUnit: InboxWorkUnit,
  selectedDecision: string,
): Record<string, string | string[]> {
  const fields: Record<string, string | string[]> = {}

  // Safe display-only fields — never include hashes, tokens, secrets, raw payloads

  // The user-selected decision (Accept / Defer / Reject / Ask Owner)
  fields.decision = selectedDecision

  // Recommended next action from the work unit (NOT the decision)
  if (workUnit.nextAction.length > 0) {
    fields.recommendedAction = workUnit.nextAction
  }

  if (workUnit.title) fields.workUnitTitle = workUnit.title
  if (workUnit.sourceProvider) fields.sourceProvider = workUnit.sourceProvider
  if (workUnit.sourceUrl) fields.sourceUrl = workUnit.sourceUrl
  if (workUnit.priority) fields.priority = workUnit.priority

  const summary = truncate(workUnit.evidence || workUnit.reason || workUnit.title, 120)
  if (summary) fields.summary = summary

  return fields
}

function providerLabel(provider: string): string {
  switch (provider) {
    case "slack":
      return "Slack"
    case "calendar":
      return "Calendar"
    case "github":
      return "GitHub"
    default:
      return provider
  }
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value
  return `${value.slice(0, max - 3)}...`
}
