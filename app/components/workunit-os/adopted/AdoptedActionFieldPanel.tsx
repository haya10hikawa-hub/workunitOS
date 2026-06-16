"use client"

import { CheckSquare, Square } from "lucide-react"
import type { AdoptedDashboardViewModel, DashboardAuditLogView, DashboardIntegrationStatusView } from "@/lib/application/dashboard/adoptedDashboardViewModel"
import type { ExecutionResultViewerModel } from "@/lib/application/dashboard/executionResultViewerModel"
import styles from "./AdoptedWorkUnitDashboard.module.css"

// ─── Props ─────────────────────────────────────────────────────

type AdoptedActionFieldPanelProps = {
  readonly viewModel: AdoptedDashboardViewModel
  readonly executionViewer: ExecutionResultViewerModel

  readonly previewStatus: "idle" | "creating" | "created" | "failed"
  readonly previewMessage: string

  readonly approvalAction: "idle" | "submitting" | "approved" | "rejected" | "failed"
  readonly submitMessage: string

  readonly dryRunStatus: "idle" | "running" | "verified" | "blocked" | "not_ready" | "failed"

  readonly previewRefCount: number

  readonly showApproveReject: boolean

  readonly onCreatePreview: () => void | Promise<void>
  readonly onApprove: () => void | Promise<void>
  readonly onReject: () => void | Promise<void>
  readonly onDryRun: () => void | Promise<void>
  readonly onClearDryRun: () => void
}

// ─── Component ──────────────────────────────────────────────────

export function AdoptedActionFieldPanel(props: AdoptedActionFieldPanelProps) {
  const {
    viewModel,
    executionViewer,
    previewStatus,
    previewMessage,
    approvalAction,
    submitMessage,
    dryRunStatus,
    previewRefCount,
    showApproveReject,
    onCreatePreview,
    onApprove,
    onReject,
    onDryRun,
    onClearDryRun,
  } = props

  return (
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
          onClick={onCreatePreview}
          disabled={!viewModel.actionField.canCreatePreview || previewStatus === "creating"}
        >
          {previewStatus === "creating" ? "Creating Preview..." : "Create Action Preview"}
        </button>
        {showApproveReject ? (
          <div style={{ display: "flex", gap: "var(--sp-2)" }}>
            <button
              type="button"
              className={styles.ctaButton}
              style={{ backgroundColor: "rgba(76, 227, 43, 0.12)", borderColor: "rgba(76, 227, 43, 0.4)", color: "var(--color-primary-dim)", flex: 1 }}
              onClick={onApprove}
              disabled={approvalAction === "submitting"}
            >
              {approvalAction === "submitting" ? "Submitting..." : "Approve"}
            </button>
            <button
              type="button"
              className={styles.ctaButton}
              style={{ backgroundColor: "rgba(224, 82, 82, 0.12)", borderColor: "rgba(224, 82, 82, 0.4)", color: "var(--color-error)", flex: 1 }}
              onClick={onReject}
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
        {viewModel.executionReadiness.traceStatus === "execution_blocked" && previewRefCount > 0 ? (
          <button
            type="button"
            className={styles.ctaButton}
            onClick={onDryRun}
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
                  onClick={onClearDryRun}
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
  )
}

// ─── Helpers ────────────────────────────────────────────────────

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
