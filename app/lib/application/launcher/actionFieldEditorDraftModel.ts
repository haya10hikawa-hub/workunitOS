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

export function deriveActionFieldEditorDraft(workUnit: LauncherWorkUnit | null): ActionFieldEditorDraft {
  return {
    id: formatDraftId(workUnit?.id ?? "roi-79"),
    version: "Draft v4",
    title: workUnit?.id === "roi-79" || !workUnit ? "Quarterly review presentation" : workUnit.title,
    objective: workUnit?.id === "roi-79" || !workUnit
      ? "Deliver a clear, data-driven quarterly review to the executive team and obtain approval to proceed with Q3 initiatives as planned."
      : workUnit.objective,
    editableLabel: EDITABLE_LABEL,
    body: buildDraftBody(),
    notes: "",
    verificationState: "Local draft only. Preview and approval remain outside this phase.",
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

function buildDraftBody(): string {
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
