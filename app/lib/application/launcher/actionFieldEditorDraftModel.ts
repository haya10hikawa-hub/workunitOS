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
}

const EDITABLE_LABEL = "AI-generated draft — editable"

export function deriveActionFieldEditorDraft(workUnit: LauncherWorkUnit | null): ActionFieldEditorDraft {
  return {
    id: workUnit?.id ?? "fallback-draft",
    version: "v0.1 local",
    title: workUnit?.title ?? "No WorkUnit selected",
    objective: workUnit?.objective ?? "Select a WorkUnit before editing the draft.",
    editableLabel: EDITABLE_LABEL,
    body: buildDraftBody(workUnit),
    notes: "",
    verificationState: "Local draft only. Preview and approval remain outside this phase.",
    editable: true,
    aiGenerated: true,
  }
}

export function deriveLauncherReadinessCards(workUnit: LauncherWorkUnit | null): LauncherReadinessCard[] {
  return [
    {
      id: "source-context",
      label: "Source Context",
      detail: workUnit ? `${workUnit.source} signal is selected.` : "Waiting for a WorkUnit selection.",
      state: workUnit ? "ready" : "waiting",
    },
    {
      id: "owner-context",
      label: "Owner Context",
      detail: workUnit ? `Owner: ${workUnit.ownerLabel}` : "Owner appears after selection.",
      state: workUnit?.ownerLabel ? "ready" : "waiting",
    },
    {
      id: "draft-editable",
      label: "Editable Draft",
      detail: EDITABLE_LABEL,
      state: "review",
    },
    {
      id: "verification",
      label: "Verification Boundary",
      detail: "Preview and approval are not wired from the launcher.",
      state: "waiting",
    },
  ]
}

function buildDraftBody(workUnit: LauncherWorkUnit | null): string {
  if (!workUnit) return "Select a WorkUnit to generate a local editable draft."
  return [
    `Objective: ${workUnit.objective}`,
    "",
    `Context: ${workUnit.summary}`,
    "",
    "Draft:",
    "- Confirm the PM decision needed.",
    "- Keep source context sanitized.",
    "- Prepare the next review step without provider mutation.",
  ].join("\n")
}
