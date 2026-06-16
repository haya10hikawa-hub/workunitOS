"use client"

import { CheckSquare, Square, ArrowLeft } from "lucide-react"
import type { AdoptedDashboardViewModel, DashboardAuditLogView, DashboardIntegrationStatusView } from "@/lib/application/dashboard/adoptedDashboardViewModel"
import type { ExecutionResultViewerModel } from "@/lib/application/dashboard/executionResultViewerModel"
import type { ToolRequirementSummary } from "@/lib/application/actionField/toolRequirementModel"
import type { ActionDraftSet, ActionDraft } from "@/lib/application/actionField/actionDraftModel"
import styles from "./AdoptedWorkUnitDashboard.module.css"

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
  readonly detailOpen: boolean
  readonly onOpenDetail: () => void
  readonly onCloseDetail: () => void
  readonly onCreatePreview: () => void | Promise<void>
  readonly onApprove: () => void | Promise<void>
  readonly onReject: () => void | Promise<void>
  readonly onDryRun: () => void | Promise<void>
  readonly onClearDryRun: () => void
  readonly toolRequirements?: ToolRequirementSummary | null
  readonly actionDrafts?: ActionDraftSet | null
  readonly draftFieldOverrides?: Record<string, string>
  readonly onDraftFieldChange?: (draftId: string, fieldKey: string, value: string) => void
  readonly onResetDrafts?: () => void
}

export function AdoptedActionFieldPanel(props: AdoptedActionFieldPanelProps) {
  const {
    viewModel, executionViewer, previewStatus, previewMessage,
    approvalAction, submitMessage, dryRunStatus, previewRefCount,
    showApproveReject, detailOpen, onOpenDetail, onCloseDetail,
    onCreatePreview, onApprove, onReject, onDryRun, onClearDryRun,
    toolRequirements, actionDrafts, draftFieldOverrides,
    onDraftFieldChange, onResetDrafts,
  } = props

  return (
    <aside className={styles.rightPanel}>
      <div className={styles.actionFieldViewport}>
        <div className={`${styles.actionFieldSlider} ${detailOpen ? styles.actionFieldSliderOpen : ""}`}>
          {/* ─── Entry Pane ─────────────────────────────── */}
          <section className={styles.actionFieldPane}>
            <EntryPane
              viewModel={viewModel}
              executionViewer={executionViewer}
              previewStatus={previewStatus}
              previewMessage={previewMessage}
              approvalAction={approvalAction}
              submitMessage={submitMessage}
              dryRunStatus={dryRunStatus}
              previewRefCount={previewRefCount}
              showApproveReject={showApproveReject}
              onOpenDetail={onOpenDetail}
              onCreatePreview={onCreatePreview}
              onApprove={onApprove}
              onReject={onReject}
              onDryRun={onDryRun}
              onClearDryRun={onClearDryRun}
              toolRequirements={toolRequirements}
              actionDrafts={actionDrafts}
            />
          </section>

          {/* ─── Detail Pane ────────────────────────────── */}
          <section className={styles.actionFieldPane}>
            <DetailPane
              viewModel={viewModel}
              executionViewer={executionViewer}
              previewStatus={previewStatus}
              approvalAction={approvalAction}
              dryRunStatus={dryRunStatus}
              previewRefCount={previewRefCount}
              showApproveReject={showApproveReject}
              onCloseDetail={onCloseDetail}
              onApprove={onApprove}
              onReject={onReject}
              onDryRun={onDryRun}
              onClearDryRun={onClearDryRun}
              toolRequirements={toolRequirements}
              actionDrafts={actionDrafts}
              draftFieldOverrides={draftFieldOverrides}
              onDraftFieldChange={onDraftFieldChange}
              onResetDrafts={onResetDrafts}
            />
          </section>
        </div>
      </div>
    </aside>
  )
}

// ─── Entry Pane ─────────────────────────────────────────────────

function EntryPane(props: {
  readonly viewModel: AdoptedDashboardViewModel
  readonly executionViewer: ExecutionResultViewerModel
  readonly previewStatus: "idle" | "creating" | "created" | "failed"
  readonly previewMessage: string
  readonly approvalAction: "idle" | "submitting" | "approved" | "rejected" | "failed"
  readonly submitMessage: string
  readonly dryRunStatus: "idle" | "running" | "verified" | "blocked" | "not_ready" | "failed"
  readonly previewRefCount: number
  readonly showApproveReject: boolean
  readonly onOpenDetail: () => void
  readonly onCreatePreview: () => void | Promise<void>
  readonly onApprove: () => void | Promise<void>
  readonly onReject: () => void | Promise<void>
  readonly onDryRun: () => void | Promise<void>
  readonly onClearDryRun: () => void
  readonly toolRequirements?: ToolRequirementSummary | null
  readonly actionDrafts?: ActionDraftSet | null
}) {
  const { viewModel, executionViewer, previewStatus, previewMessage, approvalAction, submitMessage,
    dryRunStatus, previewRefCount, showApproveReject, onOpenDetail, onCreatePreview, onApprove, onReject, onDryRun, onClearDryRun,
    toolRequirements, actionDrafts } = props

  return (
    <>
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

      {toolRequirements ? <CompactTools toolRequirements={toolRequirements} /> : null}
      {actionDrafts ? <CompactDrafts drafts={actionDrafts.drafts} onOpenDetail={onOpenDetail} /> : null}

      <div className={styles.readinessSection}>
        <h3 className={styles.readinessTitle}>READINESS GATES</h3>
        <ul className={styles.gatesList}>
          {viewModel.readinessGates.map((gate) => (
            <li key={gate.label} className={styles.gateItem}>
              {gate.checked ? <CheckSquare size={14} className={styles.gateChecked} /> : <Square size={14} className={styles.gateUnchecked} />}
              <span className={`${styles.gateLabel} ${gate.checked ? styles.gateLabelChecked : ""}`}>{gate.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.ctaSection}>
        <h3 className={styles.ctaTitle}>CTA AREA</h3>
        <button type="button" className={styles.ctaButton} onClick={onCreatePreview}
          disabled={!viewModel.actionField.canCreatePreview || previewStatus === "creating"}>
          {previewStatus === "creating" ? "Creating Preview..." : "Create Action Preview"}
        </button>
        {showApproveReject ? (
          <div style={{ display: "flex", gap: "var(--sp-2)" }}>
            <button type="button" className={styles.ctaButton}
              style={{ backgroundColor: "rgba(76, 227, 43, 0.12)", borderColor: "rgba(76, 227, 43, 0.4)", color: "var(--color-primary-dim)", flex: 1 }}
              onClick={onApprove} disabled={approvalAction === "submitting"}>
              {approvalAction === "submitting" ? "Submitting..." : "Approve"}
            </button>
            <button type="button" className={styles.ctaButton}
              style={{ backgroundColor: "rgba(224, 82, 82, 0.12)", borderColor: "rgba(224, 82, 82, 0.4)", color: "var(--color-error)", flex: 1 }}
              onClick={onReject} disabled={approvalAction === "submitting"}>
              {approvalAction === "submitting" ? "Submitting..." : "Reject"}
            </button>
          </div>
        ) : null}
        <div className={styles.ctaBlocked}>
          External Execution: <span className={styles.ctaBlockedBadge}>BLOCKED</span><br />
          {viewModel.executionReadiness.reason}
        </div>
        {viewModel.executionReadiness.traceStatus === "execution_blocked" ? (
          <button type="button" className={styles.ctaButton} disabled style={{ opacity: 0.5, cursor: "not-allowed" }}
            title="Execution is ready but external execution is disabled in this release.">
            Execute (disabled)
          </button>
        ) : null}
        {viewModel.executionReadiness.traceStatus === "execution_blocked" ? (
          <div className={styles.ctaBlocked}><span className={styles.ctaBlockedBadge}>COMMAND ENVELOPE</span><br />
            Mode: {viewModel.executionCommandPreview.mode}{viewModel.executionCommandPreview.reason ? ` — ${viewModel.executionCommandPreview.reason}` : ""}<br />
            Preview refs: {viewModel.executionCommandPreview.previewRefCount} | Action: {viewModel.executionCommandPreview.requestedActionType ?? "Not available"}
          </div>
        ) : null}
        {viewModel.executionReadiness.traceStatus === "execution_blocked" && previewRefCount > 0 ? (
          <button type="button" className={styles.ctaButton} onClick={onDryRun} disabled={dryRunStatus === "running"}
            style={{ opacity: dryRunStatus === "running" ? 0.5 : 1 }}>
            {dryRunStatus === "running" ? "Verifying..." : dryRunStatus !== "idle" ? "Re-run verification" : "Verify Execution"}
          </button>
        ) : null}
        {executionViewer.kind !== "idle" ? (
          <div className={styles.ctaBlocked}><span className={styles.ctaBlockedBadge}>{executionViewer.title}</span><br />
            Status: {executionViewer.statusLabel}<br />Reason: {executionViewer.reason}
            {executionViewer.kind !== "running" ? <><br />Actions checked: {executionViewer.actionCount}<br />Action type: {executionViewer.requestedActionTypeLabel}</> : null}
            {executionViewer.canClear ? <div style={{ marginTop: "var(--sp-2)" }}><button type="button" className={styles.ctaButton} onClick={onClearDryRun} style={{ fontSize: 12, padding: "6px var(--sp-3)" }}>Clear result</button></div> : null}
          </div>
        ) : null}
        {previewMessage ? <div className={styles.ctaMeta}>{previewMessage}</div> : null}
        {submitMessage ? <div className={styles.ctaMeta}>{submitMessage}</div> : null}
      </div>

      <CompactStatusList title="INTEGRATION STATUS" rows={viewModel.integrationStatuses} />
      <CompactAuditList title="RECENT AUDIT" rows={viewModel.auditLogs} />
    </>
  )
}

// ─── Detail Pane ─────────────────────────────────────────────────

function DetailPane(props: {
  readonly viewModel: AdoptedDashboardViewModel
  readonly executionViewer: ExecutionResultViewerModel
  readonly previewStatus: "idle" | "creating" | "created" | "failed"
  readonly approvalAction: "idle" | "submitting" | "approved" | "rejected" | "failed"
  readonly dryRunStatus: "idle" | "running" | "verified" | "blocked" | "not_ready" | "failed"
  readonly previewRefCount: number
  readonly showApproveReject: boolean
  readonly onCloseDetail: () => void
  readonly onApprove: () => void | Promise<void>
  readonly onReject: () => void | Promise<void>
  readonly onDryRun: () => void | Promise<void>
  readonly onClearDryRun: () => void
  readonly toolRequirements?: ToolRequirementSummary | null
  readonly actionDrafts?: ActionDraftSet | null
  readonly draftFieldOverrides?: Record<string, string>
  readonly onDraftFieldChange?: (draftId: string, fieldKey: string, value: string) => void
  readonly onResetDrafts?: () => void
}) {
  const { viewModel, executionViewer, approvalAction, dryRunStatus, previewRefCount,
    showApproveReject, onCloseDetail, onApprove, onReject, onDryRun, onClearDryRun,
    toolRequirements, actionDrafts, draftFieldOverrides, onDraftFieldChange, onResetDrafts } = props

  return (
    <>
      <header className={styles.detailHeader}>
        <button type="button" className={styles.detailBackButton} onClick={onCloseDetail}>
          <ArrowLeft size={14} /> Back
        </button>
        <h2 className={styles.rightPanelTitle}>Action Review</h2>
      </header>

      <div className={styles.detailWarningBand}>
        External Execution: <span className={styles.ctaBlockedBadge}>BLOCKED</span>
        <br /><span className={styles.detailNote}>Draft edits are local to this review workspace in the current release.</span>
      </div>

      <div className={styles.detailSection}>
        <h3 className={styles.readinessTitle}>WORKUNIT SUMMARY</h3>
        <p className={styles.detailSummary}>
          <strong>Recommended:</strong> {viewModel.actionField.recommendedAction}
        </p>
        <p className={styles.detailSummary}>
          <strong>Evidence:</strong> {viewModel.actionField.evidenceSummary}
        </p>
        <p className={styles.detailSummary}>
          <strong>Confidence:</strong> {viewModel.actionField.confidence}
        </p>
      </div>

      {toolRequirements ? (
        <div className={styles.detailSection}>
          <h3 className={styles.readinessTitle}>DETECTED TOOLS</h3>
          {toolRequirements.allTools.map((req) => (
            <div key={req.tool} className={styles.toolRequirementRow}>
              <span className={styles.toolReqLabel}>{req.tool}</span>
              <span className={styles.toolReqActionKind}>{req.actionKind}</span>
              <span className={styles[necessityClass(req.necessity)]}>{req.necessity}</span>
              <span className={styles.toolReqConfidence}>{req.confidence}</span>
            </div>
          ))}
        </div>
      ) : null}

      {actionDrafts && actionDrafts.drafts.length > 0 ? (
        <div className={styles.detailSection}>
          <div className={styles.draftSectionHeader}>
            <h3 className={styles.readinessTitle}>ACTION DRAFTS</h3>
            {onResetDrafts ? <button type="button" className={styles.resetDraftButton} onClick={onResetDrafts}>Reset Drafts</button> : null}
          </div>
          {actionDrafts.drafts.map((draft) => (
            <DraftCard key={draft.id} draft={draft} overrides={draftFieldOverrides} onChange={onDraftFieldChange} />
          ))}
        </div>
      ) : null}

      <div className={styles.detailSection}>
        <h3 className={styles.readinessTitle}>SAFETY / READINESS</h3>
        {viewModel.readinessGates.map((gate) => (
          <div key={gate.label} className={styles.detailSafetyRow}>
            <span className={gate.checked ? styles.checkPass : styles.checkFail}>
              {gate.checked ? "✓" : "○"}
            </span> {gate.label}
          </div>
        ))}
      </div>

      <div className={styles.ctaSection}>
        {showApproveReject ? (
          <div style={{ display: "flex", gap: "var(--sp-2)", marginBottom: 8 }}>
            <button type="button" className={styles.ctaButton}
              style={{ backgroundColor: "rgba(76, 227, 43, 0.12)", borderColor: "rgba(76, 227, 43, 0.4)", color: "var(--color-primary-dim)", flex: 1 }}
              onClick={onApprove} disabled={approvalAction === "submitting"}>
              {approvalAction === "submitting" ? "Submitting..." : "Approve"}
            </button>
            <button type="button" className={styles.ctaButton}
              style={{ backgroundColor: "rgba(224, 82, 82, 0.12)", borderColor: "rgba(224, 82, 82, 0.4)", color: "var(--color-error)", flex: 1 }}
              onClick={onReject} disabled={approvalAction === "submitting"}>
              {approvalAction === "submitting" ? "Submitting..." : "Reject"}
            </button>
          </div>
        ) : null}
        {viewModel.executionReadiness.traceStatus === "execution_blocked" && previewRefCount > 0 ? (
          <button type="button" className={styles.ctaButton} onClick={onDryRun} disabled={dryRunStatus === "running"}
            style={{ opacity: dryRunStatus === "running" ? 0.5 : 1, marginBottom: 8 }}>
            {dryRunStatus === "running" ? "Verifying..." : dryRunStatus !== "idle" ? "Re-run verification" : "Verify Execution"}
          </button>
        ) : null}
        {executionViewer.kind !== "idle" ? (
          <div className={styles.ctaBlocked}><span className={styles.ctaBlockedBadge}>{executionViewer.title}</span><br />
            Status: {executionViewer.statusLabel}<br />Reason: {executionViewer.reason}
            {executionViewer.canClear ? <div style={{ marginTop: "var(--sp-2)" }}><button type="button" className={styles.ctaButton} onClick={onClearDryRun} style={{ fontSize: 12, padding: "6px var(--sp-3)" }}>Clear result</button></div> : null}
          </div>
        ) : null}
      </div>
    </>
  )
}

// ─── Shared sub-components ──────────────────────────────────────

function CompactTools({ toolRequirements }: { toolRequirements: ToolRequirementSummary }) {
  return (
    <div className={styles.detectedTools}>
      <h3 className={styles.readinessTitle}>DETECTED TOOLS</h3>
      {toolRequirements.allTools.map((req) => (
        <div key={req.tool} className={styles.toolRequirementRow}>
          <span className={styles.toolReqLabel}>{req.tool}</span>
          <span className={styles.toolReqActionKind}>{req.actionKind}</span>
          <span className={styles[necessityClass(req.necessity)]}>{req.necessity}</span>
          <span className={styles.toolReqConfidence}>{req.confidence}</span>
        </div>
      ))}
    </div>
  )
}

function CompactDrafts({ drafts, onOpenDetail }: { drafts: readonly ActionDraft[]; onOpenDetail: () => void }) {
  const first = drafts[0]
  if (!first) return null
  return (
    <div className={styles.compactDrafts}>
      <div className={styles.draftSectionHeader}>
        <h3 className={styles.readinessTitle}>ACTION DRAFTS</h3>
        <button type="button" className={styles.ctaButton} onClick={onOpenDetail} style={{ fontSize: 11, padding: "4px 10px" }}>Review External Action</button>
      </div>
      <div className={styles.actionDraftCard}>
        <div className={styles.draftHeader}>
          <span className={styles.draftTitle}>{first.title}</span>
          <span className={styles[necessityClass(first.necessity)]}>{first.necessity}</span>
        </div>
        {first.editableFields.slice(0, 2).map((f) => (
          <div key={f.key} className={styles.draftField}>
            <span className={styles.draftFieldLabel}>{f.label}</span>
            <span className={styles.draftPreviewValue}>{f.value || "—"}</span>
          </div>
        ))}
        {drafts.length > 1 ? <p className={styles.detailSummary}>+{drafts.length - 1} more draft(s)</p> : null}
      </div>
    </div>
  )
}

function DraftCard({ draft, overrides, onChange }: { draft: ActionDraft; overrides?: Record<string, string>; onChange?: (draftId: string, fieldKey: string, value: string) => void }) {
  const isDirty = draft.editableFields.some((f) => {
    const key = `${draft.id}:${f.key}`
    return overrides?.[key] !== undefined && overrides[key] !== f.value
  })
  return (
    <div className={styles.actionDraftCard}>
      <div className={styles.draftHeader}>
        <span className={styles.draftTitle}>{draft.title}</span>
        <span className={styles[necessityClass(draft.necessity)]}>{draft.necessity}</span>
        {isDirty ? <span className={styles.draftDirty}>edited</span> : null}
      </div>
      {draft.editableFields.map((f) => {
        const key = `${draft.id}:${f.key}`
        const value = overrides?.[key] ?? f.value
        return (
          <div key={f.key} className={styles.draftField}>
            <span className={styles.draftFieldLabel}>{f.label}</span>
            {f.kind === "textarea" || f.kind === "code" ? (
              <textarea className={styles.draftTextarea} value={value} onChange={(e) => onChange?.(draft.id, f.key, e.target.value)} rows={3} />
            ) : (
              <input className={styles.draftInput} type="text" value={value} onChange={(e) => onChange?.(draft.id, f.key, e.target.value)} />
            )}
          </div>
        )
      })}
      {draft.safetyNotes.length > 0 ? <div className={styles.draftSafetyNote}>{draft.safetyNotes.join(" ")}</div> : null}
      {draft.contextUsed.length > 0 ? <div className={styles.draftContext}>Context: {draft.contextUsed.join(" | ")}</div> : null}
    </div>
  )
}

function necessityClass(n: string): string {
  switch (n) {
    case "required": return styles.toolBadgeRequired
    case "recommended": return styles.toolBadgeRecommended
    case "optional": return styles.toolBadgeOptional
    case "not_needed": return styles.toolBadgeNotNeeded
    case "blocked": return styles.toolBadgeBlocked
    default: return ""
  }
}

function CompactStatusList({ title, rows }: { title: string; rows: DashboardIntegrationStatusView[] }) {
  if (rows.length === 0) return null
  return (
    <div className={styles.compactSection}><h3 className={styles.readinessTitle}>{title}</h3><ul className={styles.compactList}>
      {rows.map((row) => (<li key={`${row.provider}-${row.status}`} className={styles.compactItem}><div className={styles.compactTitle}>{row.provider}: {row.status}</div><div className={styles.compactMeta}>{row.detail}</div></li>))}
    </ul></div>
  )
}
function CompactAuditList({ title, rows }: { title: string; rows: DashboardAuditLogView[] }) {
  if (rows.length === 0) return null
  return (
    <div className={styles.compactSection}><h3 className={styles.readinessTitle}>{title}</h3><ul className={styles.compactList}>
      {rows.map((row) => (<li key={row.id} className={styles.compactItem}><div className={styles.compactTitle}>{row.title}</div><div className={styles.compactMeta}>{row.timestamp}{row.summary ? ` | ${row.summary}` : ""}</div></li>))}
    </ul></div>
  )
}
