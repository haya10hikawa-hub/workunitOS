"use client"

import { useEffect, useMemo, useState } from "react"
import {
  BarChart2,
  Bell,
  Bug,
  Calendar,
  CheckSquare,
  ChevronRight,
  Cloud,
  FolderOpen,
  Mail,
  Menu,
  Plus,
  Settings,
  Square,
  User,
} from "lucide-react"
import { createDashboardActionPreviews, approveDashboardActionPreviews, type DashboardPreviewRef } from "@/lib/application/actionField/dashboardPreviewClient"
import {
  buildAdoptedDashboardViewModel,
  type DashboardAuditLogView,
  type DashboardIntegrationStatusView,
  type DashboardLogEntryView,
  type DashboardWorkUnitView,
} from "@/lib/application/dashboard/adoptedDashboardViewModel"
import {
  fetchDashboardApprovalStatus,
  type DashboardApprovalStatus,
} from "@/lib/application/dashboard/dashboardApprovalStatusClient"
import {
  fetchDashboardWorkUnits,
  fetchIntegrationStatus,
  fetchRecentAuditLogs,
  type DashboardAuditLog,
  type DashboardIntegrationProviderStatus,
} from "@/lib/application/dashboard/dashboardDataClient"
import type { InboxWorkUnit } from "@/lib/application/workunitInbox/types"
import { runDashboardExecutionDryRun } from "@/lib/application/dashboard/dashboardExecutionDryRunClient"
import { buildExecutionResultViewer } from "@/lib/application/dashboard/executionResultViewerModel"
import styles from "./AdoptedWorkUnitDashboard.module.css"

type LoadStatus = "loading" | "loaded" | "error" | "empty"
type IconKind = DashboardWorkUnitView["iconKind"]

type DashboardState = {
  status: LoadStatus
  workUnits: InboxWorkUnit[]
  integrationStatuses: DashboardIntegrationProviderStatus[]
  auditLogs: DashboardAuditLog[]
  error?: string
}

type PreviewLoadingStatus = "idle" | "creating" | "created" | "failed"

type ApprovalActionState = "idle" | "submitting" | "approved" | "rejected" | "failed"

type LogStatus = DashboardLogEntryView["status"]

const logTagLabel: Record<LogStatus, string> = {
  INFO: "[INFO]",
  READY: "[READY]",
  NEEDS_REVIEW: "[NEEDS REVIEW]",
  NEEDS_OWNER: "[NEEDS OWNER]",
  NOT_READY: "[NOT READY]",
  STATUS: "[STATUS]",
  ACTION: "[ACTION]",
}

export function AdoptedWorkUnitDashboard() {
  const [dashboardState, setDashboardState] = useState<DashboardState>({
    status: "loading",
    workUnits: [],
    integrationStatuses: [],
    auditLogs: [],
  })
  const [selectedWorkUnitId, setSelectedWorkUnitId] = useState<string>()
  const [activeTabId, setActiveTabId] = useState<string>()
  const [selectedDecision, setSelectedDecision] = useState<string | null>(null)
  const [previewCreated, setPreviewCreated] = useState(false)
  const [previewStatus, setPreviewStatus] = useState<PreviewLoadingStatus>("idle")
  const [previewMessage, setPreviewMessage] = useState("")
  const [approvalStatus, setApprovalStatus] = useState<DashboardApprovalStatus | null>(null)
  const [approvalLoading, setApprovalLoading] = useState(false)
  const [approvalError, setApprovalError] = useState(false)
  const [previewRefs, setPreviewRefs] = useState<DashboardPreviewRef[]>([])
  const [approvalAction, setApprovalAction] = useState<ApprovalActionState>("idle")
  const [submitMessage, setSubmitMessage] = useState("")
  const [lastScanLabel, setLastScanLabel] = useState("Pending")
  const [dryRunStatus, setDryRunStatus] = useState<"idle" | "running" | "verified" | "blocked" | "not_ready" | "failed">("idle")
  const [dryRunMessage, setDryRunMessage] = useState<string | null>(null)
  const [dryRunActionCount, setDryRunActionCount] = useState<number>(0)
  const [dryRunActionType, setDryRunActionType] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([
      fetchDashboardWorkUnits("all"),
      fetchIntegrationStatus(),
      fetchRecentAuditLogs(),
    ]).then(([workUnitsResult, integrationResult, auditResult]) => {
      if (!active) return
      const workUnits = workUnitsResult.ok ? workUnitsResult.workUnits : []
      const integrationStatuses = integrationResult.ok ? integrationResult.providers : []
      const auditLogs = auditResult.ok ? auditResult.auditLogs : []
      const status: LoadStatus = workUnits.length === 0
        ? (workUnitsResult.ok ? "empty" : "error")
        : (workUnitsResult.ok ? "loaded" : "error")

      setDashboardState({
        status,
        workUnits,
        integrationStatuses,
        auditLogs,
        error: workUnitsResult.ok ? undefined : workUnitsResult.error,
      })
      setLastScanLabel(workUnitsResult.ok ? formatScanTime(new Date()) : "Unavailable")
      const nextId = workUnits[0]?.id
      setSelectedWorkUnitId((current) => current ?? nextId)
      setActiveTabId((current) => current ?? nextId)
    })
    return () => {
      active = false
    }
  }, [])

  // ─── Fetch approval status when selected WorkUnit changes ──────
  useEffect(() => {
    if (!selectedWorkUnitId) return
    let active = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setApprovalLoading(true)
    setApprovalError(false)
    fetchDashboardApprovalStatus(selectedWorkUnitId).then((result) => {
      if (!active) return
      setApprovalLoading(false)
      if (result.ok) {
        setApprovalStatus(result.approvalStatus)
        setApprovalError(false)
      } else {
        setApprovalError(true)
      }
    }).catch(() => {
      if (!active) return
      setApprovalLoading(false)
      setApprovalError(true)
    })
    return () => { active = false }
  }, [selectedWorkUnitId])

  const viewModel = useMemo(() => buildAdoptedDashboardViewModel({
    workUnits: dashboardState.workUnits,
    selectedWorkUnitId,
    selectedDecision,
    previewCreated,
    previewStatus,
    previewRefCount: previewRefs.length,
    previewRefs: previewRefs.map((ref) => ({ actionId: ref.actionId, previewId: ref.previewId })),
    approvalStatus,
    approvalLoading,
    approvalError,
    integrationStatuses: dashboardState.integrationStatuses,
    auditLogs: dashboardState.auditLogs,
  }), [dashboardState.auditLogs, dashboardState.integrationStatuses, dashboardState.workUnits, previewCreated, previewStatus, previewRefs, selectedDecision, selectedWorkUnitId, approvalStatus, approvalLoading, approvalError])

  const executionViewer = useMemo(() => buildExecutionResultViewer({
    dryRunStatus,
    dryRunMessage,
    dryRunActionCount,
    dryRunActionType,
  }), [dryRunStatus, dryRunMessage, dryRunActionCount, dryRunActionType])

  const handleCreatePreview = async () => {
    setPreviewMessage("")
    if (!viewModel.actionField.canCreatePreview) {
      if (!selectedWorkUnitId) {
        setPreviewMessage("Select a WorkUnit before creating an action preview.")
      } else if (!selectedDecision) {
        setPreviewMessage("Select a decision (Accept/Defer/Reject/Ask Owner) before creating an action preview.")
      } else {
        setPreviewMessage("Preview cannot be created for the selected WorkUnit.")
      }
      return
    }
    if (previewStatus === "creating") {
      setPreviewMessage("Preview creation is already in progress.")
      return
    }
    if (!viewModel.actionField.previewGroup.actions.length) {
      setPreviewMessage("No safe preview actions can be derived from the selected WorkUnit.")
      return
    }
    setPreviewStatus("creating")
    setPreviewCreated(false)
    const result = await createDashboardActionPreviews(viewModel.actionField.previewGroup)
    if (!result.ok) {
      setPreviewCreated(false)
      setPreviewStatus("failed")
      setPreviewMessage(mapSafePreviewError(result.error))
      return
    }
    setPreviewCreated(true)
    setPreviewStatus("created")
    setPreviewRefs(result.previews)
    setApprovalAction("idle")
    setSubmitMessage("")
    setPreviewMessage(`Created ${result.previews.length} action preview${result.previews.length === 1 ? "" : "s"}.`)
    // Refresh approval status after preview creation
    if (selectedWorkUnitId) {
      setApprovalLoading(true)
      setApprovalError(false)
      fetchDashboardApprovalStatus(selectedWorkUnitId).then((statusResult) => {
        setApprovalLoading(false)
        if (statusResult.ok) {
          setApprovalStatus(statusResult.approvalStatus)
        } else {
          setApprovalError(true)
        }
      }).catch(() => {
        setApprovalLoading(false)
        setApprovalError(true)
      })
    }
  }

  const handleApprove = async () => {
    if (!selectedWorkUnitId || previewRefs.length === 0) return
    setSubmitMessage("")
    setApprovalAction("submitting")
    const result = await approveDashboardActionPreviews(selectedWorkUnitId, previewRefs, "approve")
    if (!result.ok) {
      setApprovalAction("failed")
      setSubmitMessage(mapSafeApprovalError(result.error))
      return
    }
    setApprovalAction("approved")
    setSubmitMessage("Approval submitted. Refreshing status...")
    // Refresh approval status from server
    if (selectedWorkUnitId) {
      setApprovalLoading(true)
      setApprovalError(false)
      fetchDashboardApprovalStatus(selectedWorkUnitId).then((statusResult) => {
        setApprovalLoading(false)
        if (statusResult.ok) {
          setApprovalStatus(statusResult.approvalStatus)
        } else {
          setApprovalError(true)
        }
      }).catch(() => {
        setApprovalLoading(false)
        setApprovalError(true)
      })
    }
  }

  const handleReject = async () => {
    if (!selectedWorkUnitId || previewRefs.length === 0) return
    setSubmitMessage("")
    setApprovalAction("submitting")
    const result = await approveDashboardActionPreviews(selectedWorkUnitId, previewRefs, "reject")
    if (!result.ok) {
      setApprovalAction("failed")
      setSubmitMessage(mapSafeApprovalError(result.error))
      return
    }
    setApprovalAction("rejected")
    setSubmitMessage("Rejection submitted. Refreshing status...")
    // Refresh approval status from server
    if (selectedWorkUnitId) {
      setApprovalLoading(true)
      setApprovalError(false)
      fetchDashboardApprovalStatus(selectedWorkUnitId).then((statusResult) => {
        setApprovalLoading(false)
        if (statusResult.ok) {
          setApprovalStatus(statusResult.approvalStatus)
        } else {
          setApprovalError(true)
        }
      }).catch(() => {
        setApprovalLoading(false)
        setApprovalError(true)
      })
    }
  }

  const handleDryRun = async () => {
    if (!selectedWorkUnitId || previewRefs.length === 0) return
    setDryRunStatus("running")
    setDryRunMessage(null)
    const result = await runDashboardExecutionDryRun({
      workUnitId: selectedWorkUnitId,
      previewRefs: previewRefs.map((ref) => ({ actionId: ref.actionId, previewId: ref.previewId })),
      requestedActionType: viewModel.executionCommandPreview.requestedActionType,
    })
    if (!result.ok) {
      setDryRunStatus("failed")
      setDryRunMessage(result.error)
      return
    }
    setDryRunStatus(result.status)
    setDryRunMessage(result.reason)
    setDryRunActionCount(result.actionCount)
    setDryRunActionType(result.requestedActionType)
  }

  const handleClearDryRun = () => {
    // Local-only — no API call, no external side effects
    setDryRunStatus("idle")
    setDryRunMessage(null)
    setDryRunActionCount(0)
    setDryRunActionType(null)
  }

  // ─── Show Approve/Reject when appropriate ──────────────────────
  const showApproveReject = (): boolean => {
    if (!selectedWorkUnitId) return false
    if (previewStatus !== "created") return false
    if (previewRefs.length === 0) return false
    if (approvalLoading || approvalError) return false
    if (!approvalStatus) return false
    const showableStatuses: DashboardApprovalStatus["status"][] = ["none", "pending"]
    if (!showableStatuses.includes(approvalStatus.status)) return false
    if (approvalAction === "submitting") return false
    return true
  }

  const statusText = dashboardState.status === "loading"
    ? "Loading live WorkUnits..."
    : dashboardState.status === "error"
      ? dashboardState.error ?? "Failed to load live WorkUnits."
      : dashboardState.status === "empty"
        ? "No live WorkUnits."
        : "Live WorkUnits loaded."

  return (
    <div className={styles.root}>
      <header className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <button type="button" className={styles.iconBtn} aria-label="Menu">
            <Menu size={16} strokeWidth={1.5} />
          </button>
          <span className={styles.osTitle}>WorkUnit OS</span>
        </div>
        <div className={styles.topBarRight}>
          <span className={styles.systemStatus}>
            System Status: <span className={styles.statusWatching}>Watching</span>
            {" | "}Last Scan: {lastScanLabel}
          </span>
          <button type="button" className={styles.iconBtn} aria-label="User avatar">
            <div className={styles.avatar} />
          </button>
          <button type="button" className={styles.iconBtn} aria-label="Settings">
            <Settings size={16} strokeWidth={1.5} />
          </button>
          <button type="button" className={styles.iconBtn} aria-label="Notifications">
            <Bell size={16} strokeWidth={1.5} />
          </button>
          <button type="button" className={styles.iconBtn} aria-label="Profile">
            <User size={16} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      <div className={styles.body}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <span className={styles.sidebarTitle}>WorkUnit Explorer</span>
            <div className={styles.sidebarState}>{statusText}</div>
          </div>
          <nav className={styles.sidebarNav} aria-label="WorkUnit list">
            {viewModel.workUnits.map((workUnit) => (
              <button
                key={workUnit.id}
                type="button"
                className={`${styles.unitItem} ${viewModel.selectedWorkUnitId === workUnit.id ? styles.unitItemActive : ""}`}
                onClick={() => {
                  setSelectedWorkUnitId(workUnit.id)
                  setActiveTabId(workUnit.id)
                  setSelectedDecision(null)
                  setPreviewCreated(false)
                  setPreviewStatus("idle")
                  setPreviewMessage("")
                  setApprovalStatus(null)
                  setApprovalLoading(false)
                  setApprovalError(false)
                  setPreviewRefs([])
                  setApprovalAction("idle")
                  setSubmitMessage("")
                  setDryRunStatus("idle")
                  setDryRunMessage(null)
                  setDryRunActionCount(0)
                  setDryRunActionType(null)
                }}
              >
                <span className={styles.unitIcon} style={{ backgroundColor: workUnit.iconBg }}>
                  <SourceIcon iconKind={workUnit.iconKind} />
                </span>
                <div className={styles.unitInfo}>
                  <span className={styles.unitLabel}>{workUnit.title}</span>
                  <div className={styles.unitMeta}>
                    <span className={styles.unitRoi}>ROI: {workUnit.roi.toFixed(1)}</span>
                    <Badge label={workUnit.statusLabel} variant={statusVariant(workUnit.statusLabel)} />
                  </div>
                </div>
              </button>
            ))}
          </nav>
        </aside>

        <main className={styles.centerPanel}>
          <div className={styles.tabBar} role="tablist">
            {viewModel.tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTabId === tab.id}
                className={`${styles.tab} ${activeTabId === tab.id ? styles.tabActive : ""}`}
                onClick={() => {
                  setActiveTabId(tab.id)
                  setSelectedWorkUnitId(tab.id)
                }}
              >
                {tab.label}
              </button>
            ))}
            <button type="button" className={styles.tabAdd} aria-label="Add tab">
              <Plus size={14} strokeWidth={1.5} />
            </button>
          </div>

          <div className={styles.centerContent}>
            <h1 className={styles.centerTitle}>Decomposition: {viewModel.title}</h1>

            <section className={styles.section}>
              <h2 className={styles.sectionLabel}>SITUATION</h2>
              <p className={styles.sectionBody}>{viewModel.situation}</p>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionLabel}>PROBLEM / WHY NOW</h2>
              <p className={styles.sectionBody}>{viewModel.problem}</p>
              <p className={styles.sectionBody}>{viewModel.deadline}</p>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionLabel}>DECISION REQUIRED</h2>
              <div className={styles.decisionButtons}>
                {viewModel.decisionOptions.map((decision, index) => (
                  <button
                    key={decision}
                    type="button"
                    className={`${styles.decisionBtn} ${index === 0 ? styles.decisionBtnPrimary : ""}`}
                    onClick={() => setSelectedDecision(decision)}
                  >
                    [{decision}]
                  </button>
                ))}
              </div>
            </section>

            <div className={styles.roiBar}>
              <span className={styles.roiLabel}>ROI Metric</span>
              <span className={styles.roiFormula}>
                Impact × Urgency × Importance / Effort = <span className={styles.roiValue}>{viewModel.workUnits.find((row) => row.id === viewModel.selectedWorkUnitId)?.roi.toFixed(1) ?? "0.0"}</span>
              </span>
            </div>

            <section className={styles.logsSection}>
              <h2 className={styles.logsSectionTitle}>Decision Trace</h2>
              <ul className={styles.logsList}>
                {viewModel.logs.map((entry, index) => (
                  <li key={`${entry.status}-${index}`} className={styles.logEntry}>
                    <ChevronRight size={12} strokeWidth={1.5} className={styles.logChevron} />
                    <LogStatusTag status={entry.status} />
                    <span className={styles.logText}>{entry.text}</span>
                    {entry.indicator ? <IndicatorDot color={entry.indicator} /> : null}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </main>

        <aside className={styles.rightPanel}>
          <h2 className={styles.rightPanelTitle}>Action Field Entry</h2>

          <div className={styles.rightSection}>
            <p className={styles.rightLabel}>
              <span className={styles.rightLabelBold}>RECOMMENDED ACTION:</span>{" "}
              {viewModel.actionField.recommendedAction}
            </p>
          </div>

          <div className={styles.evidenceCapsule}>
            <div className={styles.evidenceHeader}>
              <span className={styles.evidenceTitle}>EVIDENCE CAPSULE</span>
              <span className={styles.confidenceBadge}>Confidence: {viewModel.actionField.confidence}</span>
            </div>
            <div className={styles.evidenceCard}>
              <p className={styles.evidencePath}>{viewModel.actionField.evidenceTitle} |</p>
              <p className={styles.evidenceText}>{viewModel.actionField.evidenceSummary}</p>
            </div>
          </div>

          <div className={styles.readinessSection}>
            <h3 className={styles.readinessTitle}>READINESS GATES</h3>
            <ul className={styles.gatesList}>
              {viewModel.readinessGates.map((gate) => (
                <li key={gate.label} className={styles.gateItem}>
                  {gate.checked ? (
                    <CheckSquare size={14} strokeWidth={1.5} className={styles.gateChecked} />
                  ) : (
                    <Square size={14} strokeWidth={1.5} className={styles.gateUnchecked} />
                  )}
                  <span className={`${styles.gateLabel} ${gate.checked ? styles.gateLabelChecked : ""}`}>{gate.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.ctaSection}>
            <h3 className={styles.ctaTitle}>CTA AREA</h3>
            <button
              type="button"
              className={styles.ctaButton}
              onClick={handleCreatePreview}
              disabled={!viewModel.actionField.canCreatePreview || previewStatus === "creating"}
            >
              {previewStatus === "creating" ? "Creating Preview..." : "Create Action Preview"}
            </button>
            {showApproveReject() ? (
              <div style={{ display: "flex", gap: "var(--sp-2)" }}>
                <button
                  type="button"
                  className={styles.ctaButton}
                  style={{ backgroundColor: "rgba(76, 227, 43, 0.12)", borderColor: "rgba(76, 227, 43, 0.4)", color: "var(--color-primary-dim)", flex: 1 }}
                  onClick={handleApprove}
                  disabled={approvalAction === "submitting"}
                >
                  {approvalAction === "submitting" ? "Submitting..." : "Approve"}
                </button>
                <button
                  type="button"
                  className={styles.ctaButton}
                  style={{ backgroundColor: "rgba(224, 82, 82, 0.12)", borderColor: "rgba(224, 82, 82, 0.4)", color: "var(--color-error)", flex: 1 }}
                  onClick={handleReject}
                  disabled={approvalAction === "submitting"}
                >
                  {approvalAction === "submitting" ? "Submitting..." : "Reject"}
                </button>
              </div>
            ) : null}
            <div className={styles.ctaBlocked}>
              External Execution: <span className={styles.ctaBlockedBadge}>BLOCKED</span>
              <br />
              {viewModel.executionReadiness.reason}
            </div>
            {viewModel.executionReadiness.traceStatus === "execution_blocked" ? (
              <button
                type="button"
                className={styles.ctaButton}
                disabled
                style={{ opacity: 0.5, cursor: "not-allowed" }}
                title="Execution is ready but external execution is disabled in this release."
              >
                Execute (disabled)
              </button>
            ) : null}
            {viewModel.executionReadiness.traceStatus === "execution_blocked" ? (
              <div className={styles.ctaBlocked}>
                <span className={styles.ctaBlockedBadge}>COMMAND ENVELOPE</span>
                <br />
                Mode: {viewModel.executionCommandPreview.mode}
                {viewModel.executionCommandPreview.reason ? ` — ${viewModel.executionCommandPreview.reason}` : ""}
                <br />
                Preview refs: {viewModel.executionCommandPreview.previewRefCount}
                | Action: {viewModel.executionCommandPreview.requestedActionType ?? "Not available"}
              </div>
            ) : null}
            {viewModel.executionReadiness.traceStatus === "execution_blocked" && previewRefs.length > 0 ? (
              <button
                type="button"
                className={styles.ctaButton}
                onClick={handleDryRun}
                disabled={dryRunStatus === "running"}
                style={{ opacity: dryRunStatus === "running" ? 0.5 : 1 }}
              >
                {dryRunStatus === "running" ? "Verifying..." : dryRunStatus !== "idle" ? "Re-run verification" : "Verify Execution"}
              </button>
            ) : null}
            {executionViewer.kind !== "idle" ? (
              <div className={styles.ctaBlocked}>
                <span className={styles.ctaBlockedBadge}>{executionViewer.title}</span>
                <br />
                Status: {executionViewer.statusLabel}
                <br />
                Reason: {executionViewer.reason}
                {executionViewer.kind !== "running" ? (
                  <>
                    <br />
                    Actions checked: {executionViewer.actionCount}
                    <br />
                    Action type: {executionViewer.requestedActionTypeLabel}
                  </>
                ) : null}
                {executionViewer.canClear ? (
                  <div style={{ marginTop: "var(--sp-2)" }}>
                    <button
                      type="button"
                      className={styles.ctaButton}
                      onClick={handleClearDryRun}
                      style={{ fontSize: 12, padding: "6px var(--sp-3)" }}
                    >
                      Clear result
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
            {previewMessage ? <div className={styles.ctaMeta}>{previewMessage}</div> : null}
            {submitMessage ? <div className={styles.ctaMeta}>{submitMessage}</div> : null}
          </div>

          <CompactStatusList title="INTEGRATION STATUS" rows={viewModel.integrationStatuses} />
          <CompactAuditList title="RECENT AUDIT" rows={viewModel.auditLogs} />
        </aside>
      </div>
    </div>
  )
}

function formatScanTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

function Badge({ label, variant }: { label: string; variant: "ready" | "needs-review" | "blocked" | "draft" | "error" }) {
  return <span className={`${styles.badge} ${styles[`badge--${variant}`]}`}>{label}</span>
}

function SourceIcon({ iconKind }: { iconKind: IconKind }) {
  if (iconKind === "slack") return <FolderOpen size={14} strokeWidth={1.5} />
  if (iconKind === "mail") return <Mail size={14} strokeWidth={1.5} />
  if (iconKind === "bug") return <Bug size={14} strokeWidth={1.5} />
  if (iconKind === "calendar") return <Calendar size={14} strokeWidth={1.5} />
  if (iconKind === "chart") return <BarChart2 size={14} strokeWidth={1.5} />
  return <Cloud size={14} strokeWidth={1.5} />
}

function statusVariant(label: DashboardWorkUnitView["statusLabel"]): "ready" | "needs-review" | "blocked" | "draft" | "error" {
  if (label === "READY") return "ready"
  if (label === "NEEDS REVIEW") return "needs-review"
  if (label === "BLOCKED") return "blocked"
  if (label === "DRAFT") return "draft"
  return "error"
}

function LogStatusTag({ status }: { status: LogStatus }) {
  const map: Record<LogStatus, string> = {
    INFO: styles.tagInfo,
    READY: styles.tagReady,
    NEEDS_REVIEW: styles.tagNeedsReview,
    NEEDS_OWNER: styles.tagNeedsOwner,
    NOT_READY: styles.tagNotReady,
    STATUS: styles.tagStatus,
    ACTION: styles.tagAction,
  }
  return <span className={`${styles.logTag} ${map[status]}`}>{logTagLabel[status]}</span>
}

function IndicatorDot({ color }: { color: "green" | "yellow" | "red" | "gray" }) {
  return <span className={`${styles.indicatorDot} ${styles[`dot--${color}`]}`} aria-hidden="true" />
}

function CompactStatusList({ title, rows }: { title: string; rows: DashboardIntegrationStatusView[] }) {
  if (rows.length === 0) return null
  return (
    <div className={styles.compactSection}>
      <h3 className={styles.readinessTitle}>{title}</h3>
      <ul className={styles.compactList}>
        {rows.map((row) => (
          <li key={`${row.provider}-${row.status}`} className={styles.compactItem}>
            <div className={styles.compactTitle}>{row.provider}: {row.status}</div>
            <div className={styles.compactMeta}>{row.detail}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function CompactAuditList({ title, rows }: { title: string; rows: DashboardAuditLogView[] }) {
  if (rows.length === 0) return null
  return (
    <div className={styles.compactSection}>
      <h3 className={styles.readinessTitle}>{title}</h3>
      <ul className={styles.compactList}>
        {rows.map((row) => (
          <li key={row.id} className={styles.compactItem}>
            <div className={styles.compactTitle}>{row.title}</div>
            <div className={styles.compactMeta}>{row.timestamp}{row.summary ? ` | ${row.summary}` : ""}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── Safe error mapping ──────────────────────────────────────────

function mapSafePreviewError(serverError: string): string {
  const normalized = (serverError ?? "").toLowerCase()
  if (normalized.includes("unauthorized") || normalized.includes("login") || normalized.includes("401")) {
    return "Unauthorized. Sign in or enable valid session."
  }
  if (normalized.includes("forbidden") || normalized.includes("permission") || normalized.includes("403")) {
    return "You do not have permission to create action previews."
  }
  if (normalized.includes("rate") || normalized.includes("429")) {
    return "Rate limit reached. Please wait before trying again."
  }
  if (normalized.includes("invalid") || normalized.includes("400")) {
    return "Preview request was invalid. Check the WorkUnit data."
  }
  if (normalized.includes("integration") || normalized.includes("503")) {
    return "Preview service is temporarily unavailable."
  }
  return "Preview creation failed. Please try again."
}

// ─── Safe approval error mapping ──────────────────────────────────

function mapSafeApprovalError(serverError: string): string {
  const normalized = (serverError ?? "").toLowerCase()
  if (normalized.includes("unauthorized") || normalized.includes("login") || normalized.includes("401")) {
    return "Unauthorized. Sign in or enable a valid session."
  }
  if (normalized.includes("forbidden") || normalized.includes("permission") || normalized.includes("403")) {
    return "You do not have permission to approve this preview."
  }
  if (normalized.includes("rate") || normalized.includes("429")) {
    return "Rate limit reached. Please wait before trying again."
  }
  if (normalized.includes("invalid") || normalized.includes("400")) {
    return "Approval request was invalid."
  }
  if (normalized.includes("expired")) {
    return "This preview or approval has expired. Create a new preview."
  }
  if (normalized.includes("used")) {
    return "This approval has already been consumed."
  }
  return "Approval update failed. Please try again."
}
