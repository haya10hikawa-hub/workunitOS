"use client"

import type { ApprovalDrawerVariantInfo, ApprovalDrawerActionInfo } from "@/lib/application/actionField/adoptedApprovalDrawerModel"
import styles from "./AdoptedWorkUnitDashboard.module.css"

// ─── Props ─────────────────────────────────────────────────────

type AdoptedActionApprovalDrawerProps = {
  readonly open: boolean
  readonly variantInfo: ApprovalDrawerVariantInfo | null
  readonly workUnitTitle: string
  readonly sourceProvider: string
  readonly previewRefCount: number
  readonly previewStatus: "idle" | "creating" | "created" | "failed"
  readonly approvalAction: "idle" | "submitting" | "approved" | "rejected" | "failed"
  readonly canApprove: boolean
  readonly onClose: () => void
  readonly onApprove: () => void | Promise<void>
  readonly onReject: () => void | Promise<void>
}

// ─── Component ─────────────────────────────────────────────────

export function AdoptedActionApprovalDrawer(props: AdoptedActionApprovalDrawerProps) {
  const {
    open,
    variantInfo,
    workUnitTitle,
    sourceProvider,
    previewRefCount,
    previewStatus,
    approvalAction,
    canApprove,
    onClose,
    onApprove,
    onReject,
  } = props

  if (!open || !variantInfo) return null

  return (
    <div className={styles.drawerOverlay} onClick={onClose}>
      <aside className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <header className={styles.drawerHeader}>
          <div>
            <h2 className={styles.drawerTitle}>{variantInfo.title}</h2>
            <p className={styles.drawerSubtitle}>AI-powered decision engine &ldquo;WorkUnit OS&rdquo;</p>
          </div>
          <div className={styles.drawerHeaderRight}>
            <span className={styles.drawerStatusBadge}>
              {previewStatus === "created" ? "Pending Approval" : "Preview needed"}
            </span>
            <button type="button" onClick={onClose} className={styles.drawerCloseBtn} aria-label="Close">×</button>
          </div>
        </header>

        {/* Source info */}
        <div className={styles.drawerSourceRow}>
          <span className={styles.drawerSourceLabel}>Source:</span>
          <span className={styles.drawerSourceValue}>{sourceProvider}</span>
          <span className={styles.drawerSourceLabel}>WorkUnit:</span>
          <span className={styles.drawerSourceValue}>{workUnitTitle}</span>
          <span className={styles.drawerSourceLabel}>Previews:</span>
          <span className={styles.drawerSourceValue}>{previewRefCount}</span>
        </div>

        {/* Actions */}
        <div className={styles.drawerBody}>
          {variantInfo.actions.map((action, i) => (
            <div key={i} className={styles.drawerActionBlock}>
              <ActionHeader action={action} />
              <ActionFieldRow label={action.destinationLabel} value={action.destination} />
              <ActionFieldRow label={action.primaryField} value={workUnitTitle} />
              <ActionTags tags={action.tags} />
              <ActionBodyBox label="Body Preview" content={action.bodyPreview} />
            </div>
          ))}
        </div>

        {/* Safety checks */}
        <div className={styles.drawerSafetySection}>
          <h4 className={styles.drawerSafetyTitle}>Safety Checks</h4>
          <div className={styles.drawerSafetyRow}>
            <span className={styles.checkPass}>✓</span> RBAC enforced
          </div>
          <div className={styles.drawerSafetyRow}>
            <span className={styles.checkPass}>✓</span> Preview hash verified
          </div>
          <div className={styles.drawerSafetyRow}>
            <span className={styles.checkPass}>✓</span> Tenant isolation active
          </div>
        </div>

        {/* Warning */}
        <div className={styles.drawerWarning}>
          ⚠ External execution remains disabled in this release.
        </div>

        {/* Footer */}
        <footer className={styles.drawerFooter}>
          <button
            type="button"
            className={styles.drawerBtnApprove}
            onClick={onApprove}
            disabled={!canApprove || approvalAction === "submitting" || previewStatus !== "created"}
          >
            {approvalAction === "submitting" ? "Submitting..." : "Approve and Send/Execute"}
          </button>
          <button
            type="button"
            className={styles.drawerBtnEdit}
            disabled
            title="Edit is not available in this release."
          >
            Edit
          </button>
          <button
            type="button"
            className={styles.drawerBtnReject}
            onClick={onReject}
            disabled={approvalAction === "submitting" || previewStatus !== "created"}
          >
            Reject
          </button>
          <button
            type="button"
            className={styles.drawerBtnCancel}
            onClick={onClose}
          >
            Cancel
          </button>
        </footer>
      </aside>
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────

function ActionHeader({ action }: { action: ApprovalDrawerActionInfo }) {
  return (
    <div className={styles.drawerActionHeader} style={{ borderColor: action.accent }}>
      <span className={styles.drawerActionIcon} style={{ borderColor: action.accent, color: action.accent }}>
        {action.icon}
      </span>
      <span className={styles.drawerActionLabel} style={{ color: action.accent }}>
        Action: {action.label}
      </span>
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

function ActionTags({ tags }: { tags: string[] }) {
  return (
    <div className={styles.drawerTagsRow}>
      {tags.map((tag) => (
        <span key={tag} className={styles.drawerTag}>{tag}</span>
      ))}
    </div>
  )
}

function ActionBodyBox({ label, content }: { label: string; content: string }) {
  return (
    <div className={styles.drawerBodySection}>
      <span className={styles.drawerBodyLabel}>{label}</span>
      <div className={styles.drawerBodyBox}>{content}</div>
    </div>
  )
}
