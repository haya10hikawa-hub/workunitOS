import type { LauncherWorkUnit } from "./workUnitSelectionModel.ts"

export type ActionFieldEditorDraft = {
  readonly id: string
  readonly version: string
  readonly title: string
  readonly objective: string
  readonly editableLabel: string
  readonly body: string
  readonly notes: string
  readonly verificationState: string
  readonly editable: true
  readonly aiGenerated: true
}

export type LauncherReadinessCard = {
  readonly id: string
  readonly label: string
  readonly detail: string
  readonly state: "ready" | "review" | "waiting"
  readonly score: string
}

const EDITABLE_LABEL = "AI-generated draft — editable"

export type ActionFieldSelectedNode = {
  readonly id: string
  readonly label: string
}

export function deriveActionFieldEditorDraft(
  workUnit: LauncherWorkUnit | null,
  selectedNode?: ActionFieldSelectedNode | null,
): ActionFieldEditorDraft {
  const title = workUnit?.title ?? "Quarterly review presentation"
  const objective = workUnit?.objective
    ?? "Deliver a clear, data-driven quarterly review to the executive team and obtain approval to proceed with Q3 initiatives as planned."
  const focusLabel = selectedNode?.label && selectedNode.id !== workUnit?.id ? selectedNode.label : null
  return {
    id: formatDraftId(workUnit?.id ?? "roi-79"),
    version: "Draft v4",
    title,
    objective,
    editableLabel: EDITABLE_LABEL,
    body: buildDraftBody(workUnit, focusLabel),
    notes: "",
    verificationState:
      "Local draft only. Human review required. Preview and approval remain outside this phase.",
    editable: true,
    aiGenerated: true,
  }
}

export function deriveLauncherReadinessCards(workUnit: LauncherWorkUnit | null): LauncherReadinessCard[] {
  return [
    {
      id: "completeness",
      label: "Completeness",
      detail: "Good",
      state: workUnit ? "ready" : "ready",
      score: "5",
    },
    {
      id: "clarity",
      label: "Clarity",
      detail: "Good",
      state: "ready",
      score: "5",
    },
    {
      id: "evidence",
      label: "Evidence",
      detail: "Good",
      state: "ready",
      score: "5",
    },
    {
      id: "alignment",
      label: "Alignment",
      detail: "Good",
      state: "ready",
      score: "3",
    },
    {
      id: "risks",
      label: "Risks",
      detail: "Medium",
      state: "review",
      score: "!",
    },
  ]
}

function buildDraftBody(workUnit: LauncherWorkUnit | null, focusLabel: string | null): string {
  if (workUnit) {
    return [
      `## Candidate context`,
      workUnit.summary,
      ``,
      focusLabel ? `## Focused node\n${focusLabel}` : `## Proposed next step (candidate only)`,
      focusLabel ? `` : workUnit.nextStep ?? "Review and decide the next PM-owned step.",
      ``,
      `_Human review required. This is a candidate draft for local review only._`,
    ].join("\n")
  }
  return [
    "## 1. Executive Summary",
    "Q2 performance exceeded targets across key metrics. Customer satisfaction improved, and operational efficiency gains offset cost increases.",
    "",
    "## 2. Key Outcomes",
    "- Revenue: 118% of target (>$12.4M)",
    "- NPS: 72 (▲ 8 pts QoQ)",
    "- Gross Margin: 64% (▲ 3 pts QoQ)",
    "- Churn: 1.2% (▼ 0.4 pts QoQ)",
    "",
    "## 3. Q3 Priorities",
    "1. Expand in EHEAA",
    "2. Improve onboarding flow (reduce time-to-value)",
    "3. Increase self-serve adoption",
    "",
    "## 4. Ask",
    "Approve the Q3 plan and resource allocation.",
  ].join("\n")
}

function formatDraftId(id: string): string {
  return id.toUpperCase().replace(/^WU-/, "")
}
