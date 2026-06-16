"use client"

import type { ActionPlanModel, ActionPlanStep } from "@/lib/application/actionField/actionPlanModel"
import styles from "./AdoptedWorkUnitDashboard.module.css"

type AdoptedActionApprovalDrawerProps = {
  readonly open: boolean
  readonly actionPlan: ActionPlanModel | null
  readonly previewStatus: "idle" | "creating" | "created" | "failed"
  readonly approvalAction: "idle" | "submitting" | "approved" | "rejected" | "failed"
  readonly dryRunStatus: "idle" | "running" | "verified" | "blocked" | "not_ready" | "failed"
  readonly onClose: () => void
  readonly onApprove: () => void | Promise<void>
  readonly onReject: () => void | Promise<void>
  readonly onDryRun?: () => void | Promise<void>
}

export function AdoptedActionApprovalDrawer(props: AdoptedActionApprovalDrawerProps) {
  const {
    open, actionPlan, previewStatus, approvalAction, dryRunStatus,
    onClose, onApprove, onReject, onDryRun,
  } = props

  if (!open || !actionPlan) return null

  return (
    <div className={styles.drawerOverlay} onClick={onClose}>
      <aside className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        <header className={styles.drawerHeader}>
          <div>
            <h2 className={styles.drawerTitle}>{actionPlan.title}</h2>
            <p className={styles.drawerSubtitle}>{actionPlan.subtitle}</p>
          </div>
          <div className={styles.drawerHeaderRight}>
            <span className={styles.drawerStatusBadge}>
              {previewStatus === "created" ? "Pending Approval" : "Preview needed"}
            </span>
            <button type="button" onClick={onClose} className={styles.drawerCloseBtn} aria-label="Close">×</button>
          </div>
        </header>

        <div className={styles.drawerSourceRow}>
          <span className={styles.drawerSourceLabel}>Context:</span>
          <span className={styles.drawerSourceValue}>{actionPlan.contextSummary}</span>
        </div>

        {actionPlan.recommendedDecision ? (
          <div className={styles.drawerSourceRow} style={{ borderBottom: "none" }}>
            <span className={styles.drawerSourceLabel}>Recommended:</span>
            <span className={styles.drawerSourceValue}>{actionPlan.recommendedDecision}</span>
          </div>
        ) : null}

        <div className={styles.drawerBody}>
          <h3 className={styles.drawerSectionTitle}>ACTION PLAN STEPS</h3>
          {actionPlan.steps.map((step, i) => (
            <StepCard key={step.id} step={step} index={i + 1} />
          ))}
        </div>

        <div className={styles.drawerSafetySection}>
          <h4 className={styles.drawerSafetyTitle}>SAFETY CHECKS</h4>
          {actionPlan.safetyChecks.map((check, i) => (
            <div key={i} className={styles.drawerSafetyRow}>
              <span className={styles.checkPass}>✓</span> {check}
            </div>
          ))}
        </div>

        {actionPlan.warnings.length > 0 ? (
          <div className={styles.drawerWarning}>
            {actionPlan.warnings.join(" ")}
          </div>
        ) : null}

        <footer className={styles.drawerFooter}>
          <button
            type="button"
            className={styles.drawerBtnApprove}
            onClick={onApprove}
            disabled={!actionPlan.canApprovePlan || approvalAction === "submitting"}
          >
            {approvalAction === "submitting" ? "Submitting..." : "Approve Action Plan"}
          </button>
          <button type="button" className={styles.drawerBtnEdit} disabled title="Edit is not available in this release.">
            Edit Draft
          </button>
          <button type="button" className={styles.drawerBtnCancel} onClick={onReject}
            disabled={approvalAction === "submitting" || !actionPlan.canApprovePlan}>
            Reject
          </button>
          <button type="button" className={styles.drawerBtnCancel} onClick={onClose}>
            Cancel
          </button>
          {onDryRun && actionPlan.canApprovePlan ? (
            <button
              type="button"
              className={styles.drawerBtnApprove}
              onClick={onDryRun}
              disabled={dryRunStatus === "running"}
              style={{ flex: "0 0 auto", fontSize: 12 }}
            >
              {dryRunStatus === "running" ? "Verifying..." : "Verify Execution"}
            </button>
          ) : null}
        </footer>
      </aside>
    </div>
  )
}

function StepCard({ step, index }: { step: ActionPlanStep; index: number }) {
  const riskColor = step.riskLevel === "high" ? "var(--color-error)"
    : step.riskLevel === "medium" ? "var(--color-warning, #ffb454)"
    : "var(--color-success)"
  const accent = step.kind === "slack_reply" ? "#69ff47"
    : step.kind === "github_issue" ? "#5aa7f7"
    : step.kind === "calendar_block" ? "#ff6b6b"
    : step.kind === "email_send" ? "#ffb454"
    : step.kind === "database_update" ? "#b8ff9b"
    : "#d0d0d0"

  return (
    <div className={styles.drawerActionBlock}>
      <div className={styles.drawerActionHeader} style={{ borderColor: accent }}>
        <span className={styles.drawerActionIcon} style={{ borderColor: accent, color: accent }}>
          {index}
        </span>
        <span className={styles.drawerActionLabel} style={{ color: accent }}>
          {step.title}
        </span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: riskColor, fontWeight: 600 }}>
          {step.riskLevel.toUpperCase()}
        </span>
      </div>
      <ActionFieldRow label="Target" value={step.targetLabel} />
      <ActionFieldRow label="Kind" value={step.kind} />
      {step.previewText ? (
        <div className={styles.drawerBodySection}>
          <span className={styles.drawerBodyLabel}>Preview</span>
          <div className={styles.drawerBodyBox}>{step.previewText}</div>
        </div>
      ) : null}
    </div>
  )
}

function ActionFieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.drawerFieldRow}>
      <span className={styles.drawerFieldLabel}>{label}</span>
      <span className={styles.drawerFieldValue}>{value}</span>
    </div>
  )
}
