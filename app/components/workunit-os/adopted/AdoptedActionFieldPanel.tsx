"use client"

import { CheckSquare, Square } from "lucide-react"
import type { AdoptedDashboardViewModel, DashboardAuditLogView, DashboardIntegrationStatusView } from "@/lib/application/dashboard/adoptedDashboardViewModel"
import type { ExecutionResultViewerModel } from "@/lib/application/dashboard/executionResultViewerModel"
import type { ToolRequirementSummary } from "@/lib/application/actionField/toolRequirementModel"
import type { ActionDraftSet, ActionDraft } from "@/lib/application/actionField/actionDraftModel"
import { deriveActionFieldViewerVariant, type ActionFieldViewerVariant } from "@/lib/application/actionField/adoptedApprovalDrawerModel"
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
    onDraftFieldChange,
  } = props

  const viewerVariant = toolRequirements
    ? deriveActionFieldViewerVariant({ toolRequirements })
    : "fallback"

  const TITLES: Record<ActionFieldViewerVariant, string> = {
    slack: "Slack返信 承認ドロワー詳細",
    email: "Email送信 承認ドロワー詳細",
    database: "Database更新 承認ドロワー詳細",
    slack_github: "Slack/GitHub連携 承認ドロワー詳細",
    calendar_email: "Calendar/Email連携 承認ドロワー詳細",
    db_email: "DB/Email連携 承認ドロワー詳細",
    fallback: "Action Field Viewer",
  }
  const LABELS: Record<ActionFieldViewerVariant, string> = {
    slack: "External Action Approval: Slack Reply",
    email: "External Action Approval: Email Send",
    database: "External Action Approval: Database Update",
    slack_github: "External Action Approval: Slack Reply & GitHub Issue",
    calendar_email: "External Action Approval: Calendar Block & Email Notification",
    db_email: "External Action Approval: Database & Email",
    fallback: "External Action Approval",
  }
  const viewerTitle = TITLES[viewerVariant]
  const viewerLabel = LABELS[viewerVariant]

  return (
    <>
      {/* ─── Compact right panel (always visible) ──────────── */}
      <aside className={styles.rightPanel}>
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
      </aside>

      {/* ─── Expanded Action Field Focus Layer ────────────── */}
      {detailOpen ? (
        <div className={styles.actionFieldFocusLayer}>
          <button
            type="button"
            className={styles.actionFieldFocusBackdrop}
            aria-label="Close action field detail"
            onClick={onCloseDetail}
          />
          <section className={styles.actionFieldViewerPanel}>
            <header className={styles.actionFieldViewerHeader}>
              <div>
                <h2 className={styles.actionFieldViewerTitle}>{viewerTitle}</h2>
                <p className={styles.actionFieldViewerSubtitle}>AI-powered decision engine &ldquo;WorkUnit OS&rdquo;</p>
              </div>
              <button type="button" className={styles.actionFieldViewerCloseBtn} onClick={onCloseDetail}>&times;</button>
            </header>
            <div className={styles.actionFieldViewerBody}>
              <h3 className={styles.approvalViewerMainLabel}>{viewerLabel}</h3>

              {viewerVariant === "db_email" ? (
                <DbEmailApprovalVariant actionDrafts={actionDrafts} draftFieldOverrides={draftFieldOverrides} onDraftFieldChange={onDraftFieldChange} />
              ) : null}
              {viewerVariant === "calendar_email" ? (
                <CalendarEmailApprovalVariant actionDrafts={actionDrafts} draftFieldOverrides={draftFieldOverrides} onDraftFieldChange={onDraftFieldChange} />
              ) : null}
              {viewerVariant === "slack" ? (
                <SlackVariantContent actionDrafts={actionDrafts} draftFieldOverrides={draftFieldOverrides} onDraftFieldChange={onDraftFieldChange} />
              ) : null}
              {viewerVariant === "email" ? (
                <EmailApprovalVariant actionDrafts={actionDrafts} draftFieldOverrides={draftFieldOverrides} onDraftFieldChange={onDraftFieldChange} />
              ) : null}
              {viewerVariant === "database" ? (
                <DatabaseApprovalVariant />
              ) : null}
              {viewerVariant === "slack_github" ? (
                <SlackGithubApprovalVariant actionDrafts={actionDrafts} draftFieldOverrides={draftFieldOverrides} onDraftFieldChange={onDraftFieldChange} />
              ) : null}
              {viewerVariant === "fallback" ? (
                <div className={styles.actionFieldViewerPlaceholderCard}>No reviewable external action variant is available.</div>
              ) : null}

              <p style={{ fontSize: 11, color: "var(--color-warning, #ffb454)", padding: "8px 0" }}>&#9888; External Execution: BLOCKED</p>
            </div>
            <footer className={styles.actionFieldViewerFooter}>
              <button type="button" className={styles.actionFieldViewerBtnPrimary}
                onClick={onApprove} disabled={!showApproveReject || approvalAction === "submitting"}>
                {approvalAction === "submitting" ? "Submitting..." : "Approve Draft"}
              </button>
              <button type="button" className={styles.actionFieldViewerBtnSecondary} disabled>Edit</button>
              <button type="button" className={styles.actionFieldViewerBtnSecondary} onClick={onCloseDetail}>Cancel</button>
            </footer>
          </section>
        </div>
      ) : null}
    </>
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

// ─── Approval Viewer Primitives ────────────────────────────────

function ApprovalSectionCard(props: { icon?: string; iconColor?: string; title: string; children: React.ReactNode }) {
  return (
    <div className={styles.approvalSectionCard}>
      <div className={styles.approvalSectionCardHeader}>
        {props.icon ? <span className={styles.approvalCardIcon} style={{ background: props.iconColor ?? "rgba(255,255,255,0.1)" }}>{props.icon}</span> : null}
        <span className={styles.approvalCardTitle}>{props.title}</span>
      </div>
      {props.children}
    </div>
  )
}

function ApprovalFieldRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className={styles.approvalFieldRow}>
      <span className={styles.approvalFieldLabel}>{label}</span>
      {children ?? <span className={styles.approvalFieldValue}>{value ?? "—"}</span>}
    </div>
  )
}

function ApprovalCodePreview({ label, code }: { label: string; code: string }) {
  return (
    <div className={styles.approvalCodePreview}>
      <div className={styles.approvalCodeHeader}>
        <span>{label}</span>
        <div className={styles.approvalCodeHeaderActions}>
          <button type="button" title="Copy">📋</button>
          <button type="button" title="Edit">✏️</button>
        </div>
      </div>
      <div className={styles.approvalCodeContent}>{code}</div>
    </div>
  )
}

function ApprovalWarningRow({ text }: { text: string }) {
  return <div className={styles.approvalWarningRow}>⚠ {text}</div>
}

function ApprovalSuccessRow({ text }: { text: string }) {
  return <div className={styles.approvalSuccessRow}>✓ {text}</div>
}

// ─── Slack Variant ────────────────────────────────────────────

function SlackVariantContent(props: {
  readonly actionDrafts?: ActionDraftSet | null
  readonly draftFieldOverrides?: Record<string, string>
  readonly onDraftFieldChange?: (draftId: string, fieldKey: string, value: string) => void
}) {
  const { actionDrafts, draftFieldOverrides, onDraftFieldChange } = props
  const slackDraft = actionDrafts?.drafts.find((d) => d.tool === "slack")
  const DEFAULT_MSG = "ご連絡ありがとうございます。該当の件について確認し、対応を進めます。\n進捗があり次第こちらで共有します。"
  const msgFieldKey = slackDraft?.editableFields.find((f) => f.kind === "textarea" || f.key === "message")?.key
  const generatedMsg = slackDraft?.editableFields.find((f) => f.key === msgFieldKey)?.value ?? DEFAULT_MSG
  const overrideKey = slackDraft && msgFieldKey ? `${slackDraft.id}:${msgFieldKey}` : null
  const currentMsg = overrideKey && draftFieldOverrides?.[overrideKey] !== undefined ? draftFieldOverrides[overrideKey] : generatedMsg
  const isDirty = !!(overrideKey && draftFieldOverrides?.[overrideKey] !== undefined && draftFieldOverrides[overrideKey] !== generatedMsg)

  return (
    <ApprovalSectionCard icon="SL" iconColor="#69ff47" title="Slack Action">
      <ApprovalFieldRow label="Channel / Thread" value="#enterprise-updates / スレッド返信" />
      <ApprovalFieldRow label="Message Preview" value={generatedMsg} />
      <ApprovalFieldRow label="Editable Message">
        {isDirty ? <span className={styles.draftDirty} style={{ marginBottom: 4, display: "inline-block" }}>edited</span> : null}
        <textarea className={styles.approvalTextareaBox} rows={4} value={currentMsg}
          onChange={(e) => { if (slackDraft && msgFieldKey && onDraftFieldChange) onDraftFieldChange(slackDraft.id, msgFieldKey, e.target.value) }} />
      </ApprovalFieldRow>
      <ApprovalFieldRow label="Mention Check" value="なし" />
      <ApprovalFieldRow label="Context Used" value="WorkUnit要約、関連ドキュメント" />
    </ApprovalSectionCard>
  )
}

// ─── Email Variant ────────────────────────────────────────────

function EmailApprovalVariant(props: {
  readonly actionDrafts?: ActionDraftSet | null
  readonly draftFieldOverrides?: Record<string, string>
  readonly onDraftFieldChange?: (draftId: string, fieldKey: string, value: string) => void
}) {
  const { actionDrafts, draftFieldOverrides, onDraftFieldChange } = props
  const emailDraft = actionDrafts?.drafts.find((d) => d.tool === "email")
  const def = { recipients: "support@acmecorp.com", subject: "[対応完了のご連絡] サポートチケット #12345", body: "いつもお世話になっております。\n\nご連絡いただいた件につきまして、対応が完了しましたのでご報告いたします。\n詳細は添付資料をご確認ください。\n\n今後ともよろしくお願いいたします。" }
  const get = (key: string, fallback: string) => {
    const f = emailDraft?.editableFields.find((f) => f.key === key)
    const gen = f?.value ?? fallback
    const ok = emailDraft && draftFieldOverrides?.[`${emailDraft.id}:${key}`]
    return { value: ok !== undefined ? ok : gen, dirty: ok !== undefined && ok !== gen }
  }
  const recp = get("recipients", def.recipients)
  const subj = get("subject", def.subject)
  const body = get("body", def.body)

  return (
    <ApprovalSectionCard icon="@" iconColor="#ffb454" title="Email Action">
      <ApprovalFieldRow label="Recipients">
        {recp.dirty ? <span className={styles.draftDirty} style={{ marginBottom: 2, display: "inline-block" }}>edited</span> : null}
        <input className={styles.approvalInputBox} value={recp.value}
          onChange={(e) => emailDraft && onDraftFieldChange?.(emailDraft.id, "recipients", e.target.value)} />
      </ApprovalFieldRow>
      <ApprovalFieldRow label="Subject">
        {subj.dirty ? <span className={styles.draftDirty} style={{ marginBottom: 2, display: "inline-block" }}>edited</span> : null}
        <input className={styles.approvalInputBox} value={subj.value}
          onChange={(e) => emailDraft && onDraftFieldChange?.(emailDraft.id, "subject", e.target.value)} />
      </ApprovalFieldRow>
      <ApprovalFieldRow label="Body Preview">
        {body.dirty ? <span className={styles.draftDirty} style={{ marginBottom: 2, display: "inline-block" }}>edited</span> : null}
        <textarea className={styles.approvalTextareaBox} rows={5} value={body.value}
          onChange={(e) => emailDraft && onDraftFieldChange?.(emailDraft.id, "body", e.target.value)} />
      </ApprovalFieldRow>
      <ApprovalSuccessRow text="顧客向けではない" />
      <ApprovalSuccessRow text="添付ファイルなし" />
      <ApprovalSuccessRow text="外部送信内容を確認済み" />
    </ApprovalSectionCard>
  )
}

// ─── Database Variant ──────────────────────────────────────────

function DatabaseApprovalVariant() {
  return (
    <ApprovalSectionCard icon="DB" iconColor="#b8ff9b" title="Database Action">
      <ApprovalCodePreview label="Mutation Preview" code={`-- Database Mutation Preview
UPDATE user_preferences
SET email_notifications = true,
    updated_at = NOW()
WHERE user_id = 'USR-88921';`} />
      <ApprovalFieldRow label="Affected Rows Estimate" value="1 record (approx.)" />
      <ApprovalFieldRow label="Target Table" value="user_preferences" />
      <ApprovalWarningRow text="Warning: This operation updates user preferences. No sensitive data modification." />
      <ApprovalSuccessRow text="可能（トランザクション内で実行）" />
      <p style={{ fontSize: 11, color: "var(--color-warning, #ffb454)", padding: "6px 0" }}>
        &#9888; Database execution remains blocked in this release.
      </p>
    </ApprovalSectionCard>
  )
}

// ─── Slack + GitHub Variant ────────────────────────────────────

function SlackGithubApprovalVariant(props: {
  readonly actionDrafts?: ActionDraftSet | null
  readonly draftFieldOverrides?: Record<string, string>
  readonly onDraftFieldChange?: (draftId: string, fieldKey: string, value: string) => void
}) {
  const { actionDrafts, draftFieldOverrides, onDraftFieldChange } = props
  const slackDraft = actionDrafts?.drafts.find((d) => d.tool === "slack")
  const ghDraft = actionDrafts?.drafts.find((d) => d.tool === "github")
  const fv = (draft: ActionDraft | undefined, key: string, fallback: string) => {
    const f = draft?.editableFields.find((f) => f.key === key)
    const gen = f?.value ?? fallback
    const ok = draft && draftFieldOverrides?.[`${draft.id}:${key}`]
    return { value: ok !== undefined ? ok : gen, dirty: !!(ok !== undefined && ok !== gen) }
  }
  const slackMsg = fv(slackDraft, "message", "ご連絡ありがとうございます。該当の問題について、GitHubに調査用のIssueを作成しました。\n進捗があり次第、こちらのスレッドで共有いたします。")
  const ghTitle = fv(ghDraft, "issue_title", "認証モジュールのタイムアウトエラー調査")
  const ghBody = fv(ghDraft, "issue_body", "認証モジュールでタイムアウトエラーが発生している問題の調査を行います。\n\n環境: Production\n影響範囲: 一部ユーザーのログイン遅延\n再現手順: 添付ログを参照")

  return (<>
    <ApprovalSectionCard icon="SL" iconColor="#69ff47" title="Slack Action">
      <ApprovalFieldRow label="Channel / Thread" value="#enterprise-updates / スレッド返信" />
      <ApprovalFieldRow label="Message Preview">
        {slackMsg.dirty ? <span className={styles.draftDirty} style={{ marginBottom: 2, display: "inline-block" }}>edited</span> : null}
        <textarea className={styles.approvalTextareaBox} rows={3} value={slackMsg.value}
          onChange={(e) => slackDraft && onDraftFieldChange?.(slackDraft.id, "message", e.target.value)} />
      </ApprovalFieldRow>
      <ApprovalFieldRow label="Mention Check" value="@team-dev, @ops-alerts" />
      <ApprovalFieldRow label="Context Used" value="WorkUnit要約、関連ドキュメント、過去の類似対応履歴" />
    </ApprovalSectionCard>
    <ApprovalSectionCard icon="GH" iconColor="#5aa7f7" title="GitHub Action">
      <ApprovalFieldRow label="Repository" value="acme/workunit-os" />
      <ApprovalFieldRow label="Issue Title">
        {ghTitle.dirty ? <span className={styles.draftDirty} style={{ marginBottom: 2, display: "inline-block" }}>edited</span> : null}
        <input className={styles.approvalInputBox} value={ghTitle.value}
          onChange={(e) => ghDraft && onDraftFieldChange?.(ghDraft.id, "issue_title", e.target.value)} />
      </ApprovalFieldRow>
      <ApprovalFieldRow label="Issue Body Preview">
        {ghBody.dirty ? <span className={styles.draftDirty} style={{ marginBottom: 2, display: "inline-block" }}>edited</span> : null}
        <textarea className={styles.approvalTextareaBox} rows={4} value={ghBody.value}
          onChange={(e) => ghDraft && onDraftFieldChange?.(ghDraft.id, "issue_body", e.target.value)} />
      </ApprovalFieldRow>
      <ApprovalFieldRow label="Labels">
        <span className={`${styles.approvalChip} ${styles.approvalChipBlue}`}>bug</span>
        <span className={`${styles.approvalChip} ${styles.approvalChipBlue}`}>investigation</span>
        <span className={`${styles.approvalChip} ${styles.approvalChipRed}`}>priority:high</span>
      </ApprovalFieldRow>
      <ApprovalFieldRow label="Assignee" value="@dev-team" />
    </ApprovalSectionCard>
  </>)
}

// ─── Calendar + Email Variant ──────────────────────────────────

function CalendarEmailApprovalVariant(props: {
  readonly actionDrafts?: ActionDraftSet | null
  readonly draftFieldOverrides?: Record<string, string>
  readonly onDraftFieldChange?: (draftId: string, fieldKey: string, value: string) => void
}) {
  const { actionDrafts, draftFieldOverrides, onDraftFieldChange } = props
  const calDraft = actionDrafts?.drafts.find((d) => d.tool === "calendar")
  const emailDraft = actionDrafts?.drafts.find((d) => d.tool === "email")
  const fv = (draft: ActionDraft | undefined, key: string, fallback: string) => {
    const f = draft?.editableFields.find((f) => f.key === key)
    const gen = f?.value ?? fallback
    const ok = draft && draftFieldOverrides?.[`${draft.id}:${key}`]
    return { value: ok !== undefined ? ok : gen, dirty: !!(ok !== undefined && ok !== gen) }
  }
  const attendees = fv(calDraft, "attendees", "yamada@acmecorp.com, suzuki@acmecorp.com")
  const dateTime = fv(calDraft, "due_date", "2025-06-09 (月) 14:00 - 15:00 (JST)")
  const duration = fv(calDraft, "duration", "60分")
  const purpose = fv(calDraft, "event_title", "セキュリティレビュー対応ミーティング")
  const desc = fv(calDraft, "description", "セキュリティレビュー指摘事項の対応方針決定ミーティングです。\n事前に資料の確認をお願いいたします。")
  const emailRecipients = fv(emailDraft, "recipients", "yamada@acmecorp.com, suzuki@acmecorp.com")
  const emailSubject = fv(emailDraft, "subject", "[ミーティング招集] セキュリティレビュー対応について")
  const emailBody = fv(emailDraft, "body", "お疲れ様です。\nセキュリティレビュー対応に関するミーティングを下記の通り設定しました。\nご確認ください。")

  return (<>
    <ApprovalSectionCard icon="📅" iconColor="#ff6b6b" title="Calendar Action">
      <ApprovalFieldRow label="Attendees">
        {attendees.dirty ? <span className={styles.draftDirty} style={{ marginBottom: 2, display: "inline-block" }}>edited</span> : null}
        <input className={styles.approvalInputBox} value={attendees.value}
          onChange={(e) => calDraft && onDraftFieldChange?.(calDraft.id, "attendees", e.target.value)} />
      </ApprovalFieldRow>
      <ApprovalFieldRow label="Date / Time">
        {dateTime.dirty ? <span className={styles.draftDirty} style={{ marginBottom: 2, display: "inline-block" }}>edited</span> : null}
        <input className={styles.approvalInputBox} value={dateTime.value}
          onChange={(e) => calDraft && onDraftFieldChange?.(calDraft.id, "due_date", e.target.value)} />
      </ApprovalFieldRow>
      <ApprovalFieldRow label="Duration">{duration.value}</ApprovalFieldRow>
      <ApprovalFieldRow label="Purpose">
        {purpose.dirty ? <span className={styles.draftDirty} style={{ marginBottom: 2, display: "inline-block" }}>edited</span> : null}
        <input className={styles.approvalInputBox} value={purpose.value}
          onChange={(e) => calDraft && onDraftFieldChange?.(calDraft.id, "event_title", e.target.value)} />
      </ApprovalFieldRow>
      <ApprovalFieldRow label="Description">
        {desc.dirty ? <span className={styles.draftDirty} style={{ marginBottom: 2, display: "inline-block" }}>edited</span> : null}
        <textarea className={styles.approvalTextareaBox} rows={3} value={desc.value}
          onChange={(e) => calDraft && onDraftFieldChange?.(calDraft.id, "description", e.target.value)} />
      </ApprovalFieldRow>
      <ApprovalSuccessRow text="参加者全員の予定を確認済み" />
    </ApprovalSectionCard>
    <ApprovalSectionCard icon="@" iconColor="#ffb454" title="Email Action">
      <ApprovalFieldRow label="Recipients">
        {emailRecipients.dirty ? <span className={styles.draftDirty} style={{ marginBottom: 2, display: "inline-block" }}>edited</span> : null}
        <input className={styles.approvalInputBox} value={emailRecipients.value}
          onChange={(e) => emailDraft && onDraftFieldChange?.(emailDraft.id, "recipients", e.target.value)} />
      </ApprovalFieldRow>
      <ApprovalFieldRow label="Subject">
        {emailSubject.dirty ? <span className={styles.draftDirty} style={{ marginBottom: 2, display: "inline-block" }}>edited</span> : null}
        <input className={styles.approvalInputBox} value={emailSubject.value}
          onChange={(e) => emailDraft && onDraftFieldChange?.(emailDraft.id, "subject", e.target.value)} />
      </ApprovalFieldRow>
      <ApprovalFieldRow label="Body Preview">
        {emailBody.dirty ? <span className={styles.draftDirty} style={{ marginBottom: 2, display: "inline-block" }}>edited</span> : null}
        <textarea className={styles.approvalTextareaBox} rows={3} value={emailBody.value}
          onChange={(e) => emailDraft && onDraftFieldChange?.(emailDraft.id, "body", e.target.value)} />
      </ApprovalFieldRow>
    </ApprovalSectionCard>
  </>)
}

// ─── DB + Email Variant ────────────────────────────────────────

function DbEmailApprovalVariant(props: {
  readonly actionDrafts?: ActionDraftSet | null
  readonly draftFieldOverrides?: Record<string, string>
  readonly onDraftFieldChange?: (draftId: string, fieldKey: string, value: string) => void
}) {
  const { actionDrafts, draftFieldOverrides, onDraftFieldChange } = props
  const emailDraft = actionDrafts?.drafts.find((d) => d.tool === "email")
  const fv = (draft: ActionDraft | undefined, key: string, fallback: string) => {
    const f = draft?.editableFields.find((f) => f.key === key)
    const gen = f?.value ?? fallback
    const ok = draft && draftFieldOverrides?.[`${draft.id}:${key}`]
    return { value: ok !== undefined ? ok : gen, dirty: !!(ok !== undefined && ok !== gen) }
  }
  const recp = fv(emailDraft, "recipients", "customers@acmecorp.com, billing@acmecorp.com")
  const subj = fv(emailDraft, "subject", "Important Account Update - Action Required")
  const body = fv(emailDraft, "body", "Dear Customer,\n\nYour account status has been successfully updated. Please review the changes in your dashboard.\n\nRegards,\nThe WorkUnit Team.")

  return (<>
    <ApprovalSectionCard icon="DB" iconColor="#b8ff9b" title="Database Action">
      <ApprovalCodePreview label="Mutation Preview" code={`-- Database Mutation Preview
UPDATE customer_records
SET account_status = 'active',
    last_contact_date = NOW()
WHERE subscription_id = 'SUBS-773-8912'
  AND status_flag = 'pending_approval';`} />
      <ApprovalFieldRow label="Affected Rows Estimate" value="15 records (approx.)" />
      <ApprovalWarningRow text="Warning: This operation modifies sensitive customer data. Please verify subscription IDs carefully." />
      <ApprovalWarningRow text="Database execution remains blocked in this release." />
    </ApprovalSectionCard>
    <ApprovalSectionCard icon="@" iconColor="#ffb454" title="Email Action">
      <ApprovalFieldRow label="Recipients">
        {recp.dirty ? <span className={styles.draftDirty} style={{ marginBottom: 2, display: "inline-block" }}>edited</span> : null}
        <input className={styles.approvalInputBox} value={recp.value}
          onChange={(e) => emailDraft && onDraftFieldChange?.(emailDraft.id, "recipients", e.target.value)} />
      </ApprovalFieldRow>
      <ApprovalFieldRow label="Subject">
        {subj.dirty ? <span className={styles.draftDirty} style={{ marginBottom: 2, display: "inline-block" }}>edited</span> : null}
        <input className={styles.approvalInputBox} value={subj.value}
          onChange={(e) => emailDraft && onDraftFieldChange?.(emailDraft.id, "subject", e.target.value)} />
      </ApprovalFieldRow>
      <ApprovalFieldRow label="Body Preview">
        <span className={`${styles.approvalChip} ${styles.approvalChipRed}`} style={{ marginBottom: 6, display: "inline-block" }}>Customer-facing Communication</span>
        {body.dirty ? <span className={styles.draftDirty} style={{ marginBottom: 2, display: "inline-block" }}>edited</span> : null}
        <textarea className={styles.approvalTextareaBox} rows={5} value={body.value}
          onChange={(e) => emailDraft && onDraftFieldChange?.(emailDraft.id, "body", e.target.value)} />
      </ApprovalFieldRow>
    </ApprovalSectionCard>
  </>)
}
