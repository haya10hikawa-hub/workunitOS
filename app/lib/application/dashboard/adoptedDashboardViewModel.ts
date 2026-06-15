import type { DashboardPreviewGroup } from "@/lib/application/actionField/dashboardPreviewClient"
import type { InboxWorkUnit } from "@/lib/application/workunitInbox/types"
import type { DashboardAuditLog, DashboardIntegrationProviderStatus } from "./dashboardDataClient"
import { buildPreviewGroupFromSelectedWorkUnit } from "./selectedWorkUnitPreviewModel.ts"

export type DashboardWorkUnitView = {
  id: string
  title: string
  roi: number
  statusLabel: "READY" | "NEEDS REVIEW" | "BLOCKED" | "DRAFT" | "ERROR"
  iconKind: "slack" | "mail" | "bug" | "calendar" | "chart" | "cloud"
  iconBg: string
}

export type DashboardTabView = {
  id: string
  label: string
}

export type DashboardLogEntryView = {
  status: "INFO" | "READY" | "NEEDS_REVIEW" | "NEEDS_OWNER" | "NOT_READY" | "STATUS" | "ACTION"
  text: string
  indicator?: "green" | "yellow" | "red" | "gray"
}

export type DashboardReadinessGateView = {
  label: string
  checked: boolean
}

export type DashboardActionFieldView = {
  recommendedAction: string
  evidenceTitle: string
  evidenceSummary: string
  confidence: "High" | "Medium" | "Low"
  previewGroup: DashboardPreviewGroup
  canCreatePreview: boolean
}

export type DashboardIntegrationStatusView = {
  provider: string
  status: string
  mode: string
  detail: string
}

export type DashboardAuditLogView = {
  id: string
  title: string
  timestamp: string
  summary: string
}

export type AdoptedDashboardViewModel = {
  workUnits: DashboardWorkUnitView[]
  tabs: DashboardTabView[]
  selectedWorkUnitId: string
  title: string
  situation: string
  problem: string
  deadline: string
  decisionOptions: readonly ["Accept", "Defer", "Reject", "Ask Owner"]
  logs: DashboardLogEntryView[]
  actionField: DashboardActionFieldView
  readinessGates: DashboardReadinessGateView[]
  integrationStatuses: DashboardIntegrationStatusView[]
  auditLogs: DashboardAuditLogView[]
}

const DECISION_OPTIONS = ["Accept", "Defer", "Reject", "Ask Owner"] as const
const SENSITIVE_VIEW_KEYS = new Set(["token", "accesstoken", "refreshtoken", "secret", "authorization", "cookie", "rawpayload", "rawbody", "password"])

export function buildAdoptedDashboardViewModel(input: {
  workUnits: InboxWorkUnit[]
  selectedWorkUnitId?: string
  selectedDecision?: string | null
  previewCreated: boolean
  approved: boolean
  integrationStatuses: DashboardIntegrationProviderStatus[]
  auditLogs: DashboardAuditLog[]
}): AdoptedDashboardViewModel {
  const explorerWorkUnits = input.workUnits.map(mapWorkUnitToView)
  const selectedWorkUnit = selectWorkUnit(input.workUnits, input.selectedWorkUnitId)
  const selectedView = selectedWorkUnit
    ? explorerWorkUnits.find((row) => row.id === selectedWorkUnit.id)
    : undefined

  return {
    workUnits: explorerWorkUnits,
    tabs: explorerWorkUnits.slice(0, 3).map((row) => ({ id: row.id, label: shortenLabel(row.title) })),
    selectedWorkUnitId: selectedView?.id ?? "",
    title: selectedWorkUnit?.title ?? "No WorkUnit selected",
    situation: buildSituation(selectedWorkUnit),
    problem: buildProblem(selectedWorkUnit),
    deadline: buildDeadline(selectedWorkUnit),
    decisionOptions: DECISION_OPTIONS,
    logs: buildLogs(selectedWorkUnit, input.selectedDecision, input.previewCreated),
    actionField: buildActionFieldView(selectedWorkUnit, input.selectedDecision),
    readinessGates: buildReadinessGates(selectedWorkUnit, input.selectedDecision, input.previewCreated, input.approved),
    integrationStatuses: input.integrationStatuses.slice(0, 3).map(mapIntegrationStatus),
    auditLogs: input.auditLogs.slice(0, 4).map(mapAuditLog),
  }
}

export function mapWorkUnitToView(workUnit: InboxWorkUnit): DashboardWorkUnitView {
  return {
    id: workUnit.id,
    title: workUnit.title,
    roi: calculateRoi(workUnit),
    statusLabel: mapStatusLabel(workUnit),
    iconKind: mapIconKind(workUnit),
    iconBg: mapIconBg(workUnit),
  }
}

export function buildReadinessGates(
  workUnit: InboxWorkUnit | null,
  selectedDecision: string | null | undefined,
  previewCreated: boolean,
  approved: boolean,
): DashboardReadinessGateView[] {
  const hasWorkUnit = Boolean(workUnit)
  return [
    { label: "Source Verified", checked: Boolean(workUnit?.evidence || workUnit?.sourceUrl) },
    { label: "Owner Confirmed", checked: Boolean(workUnit?.actor || workUnit?.assignee || workUnit?.repository) },
    { label: "Decision Selected", checked: Boolean(selectedDecision) },
    { label: "Action Preview Created", checked: previewCreated },
    { label: "Approval Completed", checked: approved },
    { label: "External Execution Allowed", checked: hasWorkUnit && Boolean(selectedDecision) && previewCreated && approved },
  ]
}

function selectWorkUnit(
  workUnits: InboxWorkUnit[],
  selectedWorkUnitId?: string,
): InboxWorkUnit | null {
  if (workUnits.length === 0) return null
  return workUnits.find((row) => row.id === selectedWorkUnitId) ?? workUnits[0]
}

function buildSituation(workUnit: InboxWorkUnit | null): string {
  if (!workUnit) return "No live WorkUnit signal is selected."
  const actor = workUnit.actor ?? workUnit.assignee ?? workUnit.repository ?? providerLabel(workUnit.sourceProvider)
  return `Received signal from ${actor}.`
}

function buildProblem(workUnit: InboxWorkUnit | null): string {
  if (!workUnit) return "Inbox returned no actionable WorkUnits."
  if (workUnit.reason.length > 0) return capitalize(workUnit.reason)
  return `WorkUnit kind: ${workUnit.kind.replace(/_/g, " ")}`
}

function buildDeadline(workUnit: InboxWorkUnit | null): string {
  if (!workUnit) return "Waiting for source signals."
  if (workUnit.dueAt) return `Deadline: ${formatIso(workUnit.dueAt)}`
  return `Priority: ${workUnit.priority.toUpperCase()}`
}

function buildLogs(
  workUnit: InboxWorkUnit | null,
  selectedDecision: string | null | undefined,
  previewCreated: boolean,
): DashboardLogEntryView[] {
  if (!workUnit) {
    return [
      { status: "INFO", text: "Dashboard has no WorkUnits to decompose." },
      { status: "STATUS", text: "Action preview is not created." },
      { status: "ACTION", text: "Select a WorkUnit to continue." },
    ]
  }
  return [
    { status: "INFO", text: `Mapped ${workUnit.kind.replace(/_/g, " ")} into dashboard shell.` },
    { status: "READY", text: `1. Source Provider (${providerLabel(workUnit.sourceProvider)})`, indicator: "green" },
    { status: "NEEDS_REVIEW", text: `2. Evidence: ${truncate(workUnit.evidence || workUnit.reason, 56)}`, indicator: "yellow" },
    { status: "NEEDS_OWNER", text: `3. Next Action: ${truncate(workUnit.nextAction, 56)}`, indicator: "red" },
    { status: "NOT_READY", text: `4. Approval State: ${previewCreated ? "Preview created, approval pending" : "Preview not created"}`, indicator: "gray" },
    { status: "STATUS", text: selectedDecision ? `Decision selected: ${selectedDecision}` : "Awaiting user decision." },
    { status: "ACTION", text: previewCreated ? "Action preview created through canonical preview API." : "Create Action Preview is available." },
  ]
}

function buildActionFieldView(workUnit: InboxWorkUnit | null, selectedDecision: string | null | undefined): DashboardActionFieldView {
  if (!workUnit) {
    return {
      recommendedAction: "Select a WorkUnit before creating an action preview.",
      evidenceTitle: "No source selected",
      evidenceSummary: "No evidence is available until a WorkUnit is selected.",
      confidence: "Low",
      canCreatePreview: false,
      previewGroup: emptyPreviewGroup(),
    }
  }

  // Build the safe preview group via the dedicated mapper
  const mapped = buildPreviewGroupFromSelectedWorkUnit({ selectedWorkUnit: workUnit, selectedDecision: selectedDecision ?? null })

  const target = buildEvidenceTarget(workUnit)

  if (!mapped.ok) {
    const reasonText = mapped.reason === "no_workunit_selected"
      ? "No WorkUnit is selected."
      : mapped.reason === "decision_required"
        ? "A decision (Accept/Defer/Reject/Ask Owner) must be selected."
        : "The selected WorkUnit has no safe target data for a preview."
    return {
      recommendedAction: reasonText,
      evidenceTitle: target,
      evidenceSummary: truncate(workUnit.evidence || workUnit.reason || workUnit.title, 96),
      confidence: workUnit.priority === "high" ? "High" : workUnit.priority === "medium" ? "Medium" : "Low",
      canCreatePreview: false,
      previewGroup: emptyPreviewGroup(),
    }
  }

  return {
    recommendedAction: workUnit.nextAction,
    evidenceTitle: target,
    evidenceSummary: truncate(workUnit.evidence || workUnit.reason || workUnit.title, 96),
    confidence: workUnit.priority === "high" ? "High" : workUnit.priority === "medium" ? "Medium" : "Low",
    canCreatePreview: true,
    previewGroup: mapped.group,
  }
}

function emptyPreviewGroup(): DashboardPreviewGroup {
  return {
    workUnitId: "",
    workUnitTitle: "No WorkUnit selected",
    source: "No source selected",
    actions: [],
  }
}

function mapIntegrationStatus(status: DashboardIntegrationProviderStatus): DashboardIntegrationStatusView {
  const detail = [
    `mode ${status.mode}`,
    status.lastSyncedAt ? `sync ${formatIso(status.lastSyncedAt)}` : null,
    status.lastErrorCode ? `error ${status.lastErrorCode}` : null,
  ].filter(Boolean).join(" | ")
  return {
    provider: providerLabel(status.provider),
    status: status.status,
    mode: status.mode,
    detail,
  }
}

function mapAuditLog(log: DashboardAuditLog): DashboardAuditLogView {
  const metadataEntries = Object.entries(log.metadata)
    .filter(([key]) => !isSensitiveViewKey(key))
    .slice(0, 2)
    .map(([key, value]) => `${key}: ${formatMetadataValue(value)}`)
  return {
    id: log.id,
    title: log.eventKind,
    timestamp: formatIso(log.createdAt),
    summary: metadataEntries.length > 0 ? metadataEntries.join(" | ") : [log.targetType, log.targetId].filter(Boolean).join(" / "),
  }
}

function buildEvidenceTarget(workUnit: InboxWorkUnit): string {
  if (workUnit.repository) return `${providerLabel(workUnit.sourceProvider)} / ${workUnit.repository}`
  if (workUnit.actor) return `${providerLabel(workUnit.sourceProvider)} / ${workUnit.actor}`
  return providerLabel(workUnit.sourceProvider)
}

function mapStatusLabel(workUnit: InboxWorkUnit): DashboardWorkUnitView["statusLabel"] {
  if (workUnit.status === "done" || workUnit.status === "useful") return "READY"
  if (workUnit.status === "later") return "DRAFT"
  if (workUnit.status === "not_useful") return "ERROR"
  if (workUnit.kind === "blocker") return "BLOCKED"
  if (workUnit.kind === "missed_response") return "NEEDS REVIEW"
  return "READY"
}

function mapIconKind(workUnit: InboxWorkUnit): DashboardWorkUnitView["iconKind"] {
  if (workUnit.kind === "missed_response") return "mail"
  if (workUnit.kind === "blocker") return "bug"
  if (workUnit.kind === "deadline") return "calendar"
  if (workUnit.kind === "review_waiting") return "chart"
  if (workUnit.sourceProvider === "slack") return "slack"
  return "cloud"
}

function mapIconBg(workUnit: InboxWorkUnit): string {
  if (workUnit.kind === "missed_response") return "#1e2a3a"
  if (workUnit.kind === "blocker") return "#1a1a3a"
  if (workUnit.kind === "deadline") return "#2a1a2a"
  if (workUnit.kind === "review_waiting") return "#2a1e1a"
  if (workUnit.sourceProvider === "slack") return "#1e3a2e"
  return "#1a1e2a"
}

function calculateRoi(workUnit: InboxWorkUnit): number {
  const priorityBase = workUnit.priority === "high" ? 84 : workUnit.priority === "medium" ? 74 : 64
  const kindBonus = workUnit.kind === "review_waiting" ? 8 : workUnit.kind === "missed_response" ? 6 : workUnit.kind === "deadline" ? 5 : workUnit.kind === "blocker" ? 0 : 4
  const statusDelta = workUnit.status === "later" ? -9 : workUnit.status === "not_useful" ? -64 : workUnit.status === "done" ? 2 : 0
  return Math.max(0, Number((priorityBase + kindBonus + statusDelta).toFixed(1)))
}

function providerLabel(provider: string): string {
  if (provider === "slack") return "Slack"
  if (provider === "calendar") return "Calendar"
  if (provider === "github") return "GitHub"
  return provider
}

function formatIso(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function shortenLabel(label: string): string {
  return label.length > 26 ? `${label.slice(0, 23)}...` : label
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 3)}...` : value
}

function capitalize(value: string): string {
  return value.length > 0 ? `${value[0].toUpperCase()}${value.slice(1)}` : value
}

function formatMetadataValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(String).join(", ")
  if (value && typeof value === "object") return Object.keys(value as Record<string, unknown>).join(", ")
  return String(value)
}

function isSensitiveViewKey(key: string): boolean {
  const normalized = key.toLowerCase()
  return SENSITIVE_VIEW_KEYS.has(normalized) || normalized.endsWith("hash")
}
