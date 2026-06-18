import type { InboxWorkUnit } from "@/lib/application/workunitInbox/types"

export type LauncherWorkUnit = {
  readonly id: string
  readonly title: string
  readonly source: string
  readonly status: string
  readonly roi: number
  readonly summary: string
  readonly objective: string
  readonly kind: string
  readonly priority: string
  readonly ownerLabel: string
}

export function mapInboxWorkUnitToLauncherWorkUnit(workUnit: InboxWorkUnit): LauncherWorkUnit {
  return {
    id: workUnit.id,
    title: workUnit.title || "Untitled WorkUnit",
    source: providerLabel(workUnit.sourceProvider),
    status: statusLabel(workUnit),
    roi: calculateLauncherRoi(workUnit),
    summary: workUnit.reason || workUnit.evidence || workUnit.nextAction || "Safe inbox signal is available.",
    objective: workUnit.nextAction || "Review the WorkUnit and decide the next PM-owned step.",
    kind: workUnit.kind.replace(/_/g, " "),
    priority: workUnit.priority,
    ownerLabel: workUnit.assignee ?? workUnit.actor ?? workUnit.repository ?? "PM",
  }
}

export function fallbackLauncherWorkUnits(): LauncherWorkUnit[] {
  return [
    {
      id: "wu-review-request",
      title: "Review request needs PM focus",
      source: "GitHub",
      status: "READY",
      roi: 91.2,
      summary: "Sample fallback WorkUnit for command launcher validation.",
      objective: "Review context and prepare an editable PM-facing draft.",
      kind: "review waiting",
      priority: "high",
      ownerLabel: "PM",
    },
    {
      id: "wu-team-follow-up",
      title: "Team follow-up waiting on decision",
      source: "Team",
      status: "NEEDS REVIEW",
      roi: 84.5,
      summary: "Sample fallback WorkUnit for non-mutating selection flow.",
      objective: "Clarify the decision and keep the draft editable.",
      kind: "missed response",
      priority: "medium",
      ownerLabel: "PM",
    },
    {
      id: "wu-calendar-deadline",
      title: "Deadline checkpoint approaching",
      source: "Calendar",
      status: "DRAFT",
      roi: 76,
      summary: "Sample fallback WorkUnit for timing context only.",
      objective: "Inspect the deadline and draft a local response plan.",
      kind: "deadline",
      priority: "medium",
      ownerLabel: "PM",
    },
  ]
}

export function filterLauncherWorkUnits(
  workUnits: readonly LauncherWorkUnit[],
  query: string,
): LauncherWorkUnit[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return [...workUnits]

  return workUnits.filter((workUnit) => {
    const haystack = [
      workUnit.id,
      workUnit.title,
      workUnit.source,
      workUnit.status,
      workUnit.summary,
      workUnit.objective,
      workUnit.kind,
      workUnit.priority,
      workUnit.ownerLabel,
    ].join(" ").toLowerCase()
    return haystack.includes(normalized)
  })
}

export function clampLauncherActiveIndex(index: number, length: number): number {
  if (length <= 0) return -1
  if (!Number.isFinite(index)) return 0
  return Math.min(Math.max(Math.trunc(index), 0), length - 1)
}

export function getActiveLauncherWorkUnit(
  workUnits: readonly LauncherWorkUnit[],
  activeIndex: number,
): LauncherWorkUnit | null {
  const index = clampLauncherActiveIndex(activeIndex, workUnits.length)
  return index === -1 ? null : workUnits[index] ?? null
}

function providerLabel(provider: InboxWorkUnit["sourceProvider"]): string {
  if (provider === "github") return "GitHub"
  if (provider === "calendar") return "Calendar"
  return "Team"
}

function statusLabel(workUnit: InboxWorkUnit): string {
  if (workUnit.status === "done" || workUnit.status === "useful") return "READY"
  if (workUnit.status === "later") return "DRAFT"
  if (workUnit.status === "not_useful") return "BLOCKED"
  if (workUnit.kind === "blocker") return "BLOCKED"
  if (workUnit.kind === "missed_response") return "NEEDS REVIEW"
  return "READY"
}

function calculateLauncherRoi(workUnit: InboxWorkUnit): number {
  const priorityBase = workUnit.priority === "high" ? 84 : workUnit.priority === "medium" ? 74 : 64
  const kindBonus = workUnit.kind === "review_waiting"
    ? 8
    : workUnit.kind === "missed_response"
      ? 6
      : workUnit.kind === "deadline"
        ? 5
        : workUnit.kind === "assigned_issue"
          ? 4
          : 0
  const statusDelta = workUnit.status === "later" ? -9 : workUnit.status === "not_useful" ? -64 : 0
  return Math.max(0, Number((priorityBase + kindBonus + statusDelta).toFixed(1)))
}
