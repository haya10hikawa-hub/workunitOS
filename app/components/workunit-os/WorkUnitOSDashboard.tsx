"use client"

import Image from "next/image"
import { useState } from "react"

type SourceItem = {
  id: string
  tool: string
  title: string
  roi: number
  selected?: boolean
}

type PushCandidate = {
  id: number
  icon: string
  task: string
  summary: string
  status: "READY" | "NEEDS REVIEW" | "NEEDS OWNER" | "NOT READY"
}

const sourceItems: SourceItem[] = [
  { id: "slack", tool: "Slack", title: "エンタープライズ更新レスポンスパック", roi: 92.0, selected: true },
  { id: "email", tool: "Email", title: "クライアント X - プロジェクトデルタフィードバック", roi: 88.5 },
  { id: "jira", tool: "Jira", title: "BUG-1045 - 認証失敗", roi: 84.0 },
  { id: "calendar", tool: "Calendar", title: "四半期ビジネスレビュー", roi: 79.0 },
  { id: "news", tool: "News", title: "競合他社の製品発表", roi: 78.5 },
  { id: "salesforce", tool: "Salesforce", title: "新規リード対応", roi: 72.0 },
]

const pushCandidates: PushCandidate[] = [
  { id: 1, icon: "◎", task: "情報源の検証", summary: "Source verified", status: "READY" },
  { id: 2, icon: "◇", task: "オーナー確認", summary: "PM assigned", status: "READY" },
  { id: 3, icon: "⚖", task: "受け入れ可否の判断", summary: "Needs user decision", status: "NEEDS REVIEW" },
  { id: 4, icon: "↗", task: "外部アクション準備", summary: "Slack reply draft ready", status: "NOT READY" },
]

const priorityQueue = [
  { title: "プロンプトトークンコスト削減", roi: 147.0 },
  { title: "Slack MCP権限境界レビュー", roi: 126.0 },
  { title: "PoC導入先のセキュリティ回答期限", roi: 96.0 },
  { title: "PWUP アーキテクチャレビュー", roi: 85.8 },
]

const integrations = [
  { label: "Jira統合", value: "SYNCED", tone: "good" },
  { label: "Slack統合", value: "ACTIVE", tone: "good" },
  { label: "Email統合", value: "PENDING", tone: "warn" },
  { label: "Salesforce統合", value: "ERROR - Retry in 5m", tone: "bad" },
] as const

type ActionType = "database_update" | "email_send" | "slack_reply" | "github_issue" | "calendar_block"
type RiskLevel = "low" | "medium" | "high"
type DraftStatus = "draft_ready" | "draft_saved" | "ready_for_review" | "approved" | "executed"
type SafetyStatus = "pass" | "warning" | "blocked"

type SafetyCheck = {
  label: string
  status: SafetyStatus
}

type ActionItem = {
  id: string
  type: ActionType
  tool: string
  title: string
  status: DraftStatus
  risk: RiskLevel
  fields: Record<string, string | string[]>
}

type ActionGroup = {
  id: string
  title: string
  approvalTitle: string
  workUnitId: string
  workUnitTitle: string
  source: string
  risk: RiskLevel
  status: DraftStatus
  actions: ActionItem[]
  safetyChecks: SafetyCheck[]
}

const actionGroups: ActionGroup[] = [
  {
    id: "ag-slack-github",
    title: "Slack/GitHub連携 承認ドロワー詳細",
    approvalTitle: "Slack Reply & GitHub Issue",
    workUnitId: "WU-20250608-001",
    workUnitTitle: "エンタープライズ更新レスポンスパック",
    source: "Slack / #enterprise-updates",
    risk: "medium",
    status: "draft_ready",
    actions: [
      {
        id: "action-slack-1",
        type: "slack_reply",
        tool: "slack",
        title: "Slack返信",
        status: "draft_ready",
        risk: "medium",
        fields: {
          target: "#enterprise-updates / thread reply",
          messagePreview: "ご連絡ありがとうございます。該当の件について、GitHubに調査用のIssueを作成しました。進捗があり次第、こちらのスレッドで共有いたします。",
          messageBody: "エンタープライズ更新レスポンスパックについて、現在の状況と次の対応方針を共有します。セキュリティレビューIssueを作成し、レビュー時間を確保します。",
          mentionCheck: "No direct mentions",
          contextUsed: "WorkUnit summary, source Slack thread, decision result",
        },
      },
      {
        id: "action-github-1",
        type: "github_issue",
        tool: "github",
        title: "GitHub Issue作成",
        status: "draft_ready",
        risk: "medium",
        fields: {
          repository: "acme/workunit-os",
          issueTitle: "Security review for enterprise update response pack",
          issueBody: "## Context\nEnterprise update response pack requires security review before customer-facing communication.\n\n## Tasks\n- Review response content\n- Confirm security boundary\n- Approve customer-facing messaging",
          labels: ["security-review", "priority-high"],
          assignee: "security-reviewer",
        },
      },
    ],
    safetyChecks: [
      { label: "Destination verified", status: "pass" },
      { label: "Message body reviewed", status: "warning" },
      { label: "No sensitive data leak detected", status: "pass" },
      { label: "Human approval required", status: "pass" },
      { label: "No external action before approval", status: "pass" },
    ],
  },
  {
    id: "ag-db-email",
    title: "DB/Email連携 承認ドロワー詳細",
    approvalTitle: "Database & Email",
    workUnitId: "WU-20250608-002",
    workUnitTitle: "クライアントX - プロジェクトデルタフィードバック",
    source: "Email / customers@acmecorp.com",
    risk: "high",
    status: "draft_ready",
    actions: [
      {
        id: "action-db-1",
        type: "database_update",
        tool: "database",
        title: "Database更新",
        status: "draft_ready",
        risk: "high",
        fields: {
          mutationPreview: "-- Database Mutation Preview\nUPDATE customer_records\nSET account_status = 'active',\n    last_contact_date = NOW()\nWHERE subscription_id = 'SUBS-773-0912'\n  AND status_flag = 'pending_approval';",
          affectedRowsEstimate: "15 records (approx.)",
          targetTable: "customer_records",
          safetyCheck: "Warning: This operation modifies sensitive customer data. Please verify subscription IDs carefully.",
          rollbackUndo: "Transaction rollback available before external send.",
        },
      },
      {
        id: "action-email-1",
        type: "email_send",
        tool: "email",
        title: "Email送信",
        status: "draft_ready",
        risk: "high",
        fields: {
          recipients: ["customers@acmecorp.com", "billing@acmecorp.com"],
          subject: "Important Account Update - Action Required",
          body: "Dear Customer,\n\nYour account status has been successfully updated. Please review the changes in your dashboard.\n\nRegards,\nThe WorkUnit Team.",
          customerFacingWarning: "Customer-facing Communication",
          attachmentCheck: "添付ファイルなし",
          safetyCheck: "外部送信内容を確認済み",
        },
      },
    ],
    safetyChecks: [
      { label: "Destination verified", status: "pass" },
      { label: "Customer-facing communication", status: "warning" },
      { label: "Sensitive data handling review", status: "blocked" },
      { label: "No external action before approval", status: "pass" },
    ],
  },
  {
    id: "ag-calendar-email",
    title: "Calendar/Email連携 承認ドロワー詳細",
    approvalTitle: "Calendar Block & Email Notification",
    workUnitId: "WU-20250608-003",
    workUnitTitle: "四半期ビジネスレビュー",
    source: "Calendar / QBR",
    risk: "medium",
    status: "draft_ready",
    actions: [
      {
        id: "action-calendar-1",
        type: "calendar_block",
        tool: "calendar",
        title: "Calendar予定作成",
        status: "draft_ready",
        risk: "medium",
        fields: {
          attendees: ["yamada@acmecorp.com", "suzuki@acmecorp.com"],
          startTime: "2025-06-08T16:00:00+09:00",
          endTime: "2025-06-08T17:00:00+09:00",
          duration: "60分",
          purpose: "Security review block",
          description: "エンタープライズ更新レスポンスパックのセキュリティレビュー時間を確保します。",
          conflictCheck: "No conflicts detected",
        },
      },
      {
        id: "action-email-2",
        type: "email_send",
        tool: "email",
        title: "Email通知",
        status: "draft_ready",
        risk: "medium",
        fields: {
          recipients: ["yamada@acmecorp.com", "suzuki@acmecorp.com"],
          subject: "【ミーティング招請】セキュリティレビュー対応について",
          body: "お疲れ様です。\nセキュリティレビュー対応に関するミーティングを下記の通り設定しました。\nご確認をお願いいたします。",
          customerFacingWarning: "社内向け通知",
          attachmentCheck: "添付ファイルなし",
          safetyCheck: "送信先と本文を確認済み",
        },
      },
    ],
    safetyChecks: [
      { label: "Calendar conflict checked", status: "pass" },
      { label: "Destination verified", status: "pass" },
      { label: "Message body reviewed", status: "warning" },
      { label: "No external action before approval", status: "pass" },
    ],
  },
  {
    id: "ag-slack",
    title: "Slack返信 承認ドロワー詳細",
    approvalTitle: "Slack Reply",
    workUnitId: "WU-20250608-004",
    workUnitTitle: "Slack MCP権限境界レビュー",
    source: "Slack / #enterprise-updates",
    risk: "medium",
    status: "draft_ready",
    actions: [
      {
        id: "action-slack-single",
        type: "slack_reply",
        tool: "slack",
        title: "Slack返信",
        status: "draft_ready",
        risk: "medium",
        fields: {
          target: "#enterprise-updates / thread reply",
          messagePreview: "ご連絡ありがとうございます。該当の件について確認し、対応を進めます。進捗があり次第こちらで共有します。",
          messageBody: "ご連絡ありがとうございます。該当の件について確認し、対応を進めます。進捗があり次第こちらで共有します。",
          mentionCheck: "なし",
          contextUsed: "WorkUnit要約、関連ドキュメント",
        },
      },
    ],
    safetyChecks: [
      { label: "Destination verified", status: "pass" },
      { label: "Message body reviewed", status: "warning" },
      { label: "No external action before approval", status: "pass" },
    ],
  },
  {
    id: "ag-db",
    title: "Database更新 承認ドロワー詳細",
    approvalTitle: "Database Update",
    workUnitId: "WU-20250608-005",
    workUnitTitle: "顧客設定の同期",
    source: "DB / user_preferences",
    risk: "high",
    status: "draft_ready",
    actions: [
      {
        id: "action-db-single",
        type: "database_update",
        tool: "database",
        title: "Database更新",
        status: "draft_ready",
        risk: "high",
        fields: {
          mutationPreview: "-- Database Mutation Preview\nUPDATE user_preferences\nSET email_notifications = true,\n    updated_at = NOW()\nWHERE user_id = 'USR-88921';",
          affectedRowsEstimate: "1 record (approx.)",
          targetTable: "user_preferences",
          safetyCheck: "Warning: This operation updates user preferences. No sensitive data modification.",
          rollbackUndo: "可能（トランザクション内で実行）",
        },
      },
    ],
    safetyChecks: [
      { label: "Mutation preview verified", status: "warning" },
      { label: "Rollback available", status: "pass" },
      { label: "No external action before approval", status: "pass" },
    ],
  },
  {
    id: "ag-email",
    title: "Email送信 承認ドロワー詳細",
    approvalTitle: "Email Send",
    workUnitId: "WU-20250608-006",
    workUnitTitle: "サポートチケット返信",
    source: "Email / support@acmecorp.com",
    risk: "high",
    status: "draft_ready",
    actions: [
      {
        id: "action-email-single",
        type: "email_send",
        tool: "email",
        title: "Email送信",
        status: "draft_ready",
        risk: "high",
        fields: {
          recipients: ["support@acmecorp.com"],
          subject: "【対応完了のご連絡】サポートチケット #12345",
          body: "いつもお世話になっております。\n\nご連絡いただいた件につきまして、対応が完了しましたのでご報告いたします。\n詳細は添付資料をご確認ください。\n\n今後ともよろしくお願いいたします。",
          customerFacingWarning: "顧客向けではない",
          attachmentCheck: "添付ファイルなし",
          safetyCheck: "外部送信内容を確認済み",
        },
      },
    ],
    safetyChecks: [
      { label: "Destination verified", status: "pass" },
      { label: "Customer-facing warning reviewed", status: "warning" },
      { label: "No sensitive data leak detected", status: "pass" },
      { label: "No external action before approval", status: "pass" },
    ],
  },
]

export function WorkUnitOSDashboard() {
  const [selectedSourceId, setSelectedSourceId] = useState("slack")
  const [selectedDecision, setSelectedDecision] = useState("今日中に返信する")
  const [isActionDrawerOpen, setIsActionDrawerOpen] = useState(false)

  return (
    <div className="hidden h-screen overflow-hidden bg-[var(--ai-bg)] text-[var(--ai-text)] md:flex md:flex-col">
      <HeaderBar />

      <main className="grid min-h-0 flex-1 grid-cols-[minmax(300px,28%)_minmax(560px,1fr)_minmax(300px,26%)] overflow-hidden border-t border-[var(--ai-divider)]">
        <SourceInbox
          items={sourceItems}
          selectedId={selectedSourceId}
          onSelect={setSelectedSourceId}
        />
        <WorkUnitDecompositionPanel
          selectedDecision={selectedDecision}
          onDecisionChange={setSelectedDecision}
          onOpenActionField={() => setIsActionDrawerOpen(true)}
        />
        <RightQueuePanel />
      </main>

      <ActionFieldDrawer
        open={isActionDrawerOpen}
        onClose={() => setIsActionDrawerOpen(false)}
      />
    </div>
  )
}

function HeaderBar() {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between bg-[var(--ai-surface)] px-6">
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="h-6 w-2 rotate-[-18deg] rounded-full bg-[var(--ai-accent)]" />
            <span className="h-6 w-2 rotate-[-18deg] rounded-full bg-[var(--ai-accent)]/70" />
            <span className="h-6 w-2 rotate-[-18deg] rounded-full bg-[var(--ai-accent)]/40" />
          </div>
          <div className="text-[20px] font-bold tracking-[0.04em] text-[var(--ai-text-strong)]">
            WORKUNIT OS
          </div>
        </div>
        <div className="border-l border-[var(--ai-divider)] pl-5">
          <div className="text-[13px] text-[var(--ai-text-strong)]">WorkUnit OS デスクトップ</div>
          <div className="mt-1 text-[11px] text-[var(--ai-text-muted)]">統合ビュー</div>
        </div>
      </div>

      <div className="relative w-[38vw] max-w-[525px]">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-[var(--ai-text-muted)]">
          ⌕
        </span>
        <input
          aria-label="WorkUnit search"
          placeholder="WorkUnitを検索..."
          className="h-10 w-full rounded-[7px] border border-[var(--ai-border-2)] bg-black pl-9 pr-4 text-[12px] text-[var(--ai-text-strong)] outline-none placeholder:text-[var(--ai-text-muted)] focus:border-[var(--ai-accent-border)]"
        />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-[var(--ai-text-strong)]">
          <button type="button" aria-label="Account" className="grid h-8 w-8 place-items-center rounded-full border border-[var(--ai-border-2)] hover:border-[var(--ai-accent-border)]">
            <span className="grid place-items-center">
              <span className="h-3 w-3 rounded-full border border-[var(--ai-text-strong)]" />
              <span className="mt-0.5 h-2 w-4 rounded-t-full border border-b-0 border-[var(--ai-text-strong)]" />
            </span>
          </button>
          <button type="button" aria-label="Apps" className="grid h-8 w-8 place-items-center rounded-[6px] border border-transparent hover:border-[var(--ai-border-2)]">
            <span className="grid grid-cols-2 gap-1">
              <span className="h-1.5 w-1.5 rounded-sm border border-[var(--ai-text-strong)]" />
              <span className="h-1.5 w-1.5 rounded-sm border border-[var(--ai-text-strong)]" />
              <span className="h-1.5 w-1.5 rounded-sm border border-[var(--ai-text-strong)]" />
              <span className="h-1.5 w-1.5 rounded-sm border border-[var(--ai-text-strong)]" />
            </span>
          </button>
          <button type="button" aria-label="Notifications" className="relative grid h-8 w-8 place-items-center rounded-[6px] border border-transparent hover:border-[var(--ai-border-2)]">
            <span className="relative h-4 w-3 rounded-t-full border border-[var(--ai-text-strong)] after:absolute after:-bottom-1 after:left-1/2 after:h-1 after:w-2 after:-translate-x-1/2 after:rounded-b-full after:border after:border-t-0 after:border-[var(--ai-text-strong)]" />
            <span className="absolute right-1.5 top-1 h-2 w-2 rounded-full bg-[var(--ai-danger)]" />
          </button>
        </div>
        <div className="border-l border-[var(--ai-divider)] pl-4 text-right">
          <div className="flex items-center justify-end gap-2 text-[12px] font-semibold text-[var(--ai-accent)]">
            <span className="h-2 w-2 rounded-full bg-[var(--ai-accent)] shadow-[0_0_10px_rgba(105,255,71,0.6)]" />
            バックグラウンドAI 稼働中
          </div>
          <div className="mt-1 text-[10px] text-[var(--ai-text-muted)]">監視ソース: 12 ｜ 最終スキャン: 10:40 AM</div>
        </div>
      </div>
    </header>
  )
}

function SourceInbox({
  items,
  selectedId,
  onSelect,
}: {
  items: SourceItem[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  return (
    <aside className="min-h-0 border-r border-[var(--ai-divider)] bg-[var(--ai-bg)] px-5 py-5">
      <h2 className="mb-4 text-[16px] font-semibold text-[var(--ai-text-strong)]">PushされたWorkUnit</h2>
      <div className="space-y-2">
        {items.map((item) => (
          <SourceCard
            key={item.id}
            item={item}
            selected={item.id === selectedId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </aside>
  )
}

function SourceCard({
  item,
  selected,
  onSelect,
}: {
  item: SourceItem
  selected: boolean
  onSelect: (id: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      className={[
        "relative flex min-h-[112px] w-full gap-3 rounded-[8px] border p-3 text-left",
        "bg-[linear-gradient(180deg,var(--ai-surface),#070707)]",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
        selected
          ? "border-[var(--ai-accent)] bg-[radial-gradient(circle_at_18%_20%,rgba(105,255,71,0.22),rgba(13,26,13,0.72)_36%,#080808_78%)] shadow-[0_0_0_1px_rgba(105,255,71,0.24),inset_0_1px_0_rgba(255,255,255,0.04)]"
          : "border-[var(--ai-border)] hover:border-[var(--ai-border-2)]",
      ].join(" ")}
    >
      <ToolIcon toolId={item.id} />
      <span className="min-w-0 flex-1">
        <span className="inline-flex rounded-[4px] border border-[var(--ai-border)] bg-[var(--ai-panel)] px-2 py-0.5 text-[10px] text-[var(--ai-text)]">
          {item.tool}
        </span>
        <span className="mt-3 block text-[13px] font-semibold leading-snug text-[var(--ai-text-strong)]">
          {item.title}
        </span>
        <span className="mt-2 block text-[12px] text-[var(--ai-text)]">(ROI: {item.roi.toFixed(1)})</span>
      </span>
      <span
        className={[
          "absolute right-3 top-3 h-2.5 w-2.5 rounded-full",
          selected ? "bg-[var(--ai-accent)]" : "bg-[var(--ai-text-faint)]",
        ].join(" ")}
      />
    </button>
  )
}

function ToolIcon({ toolId }: { toolId: string }) {
  const asset = toolIconAssets[toolId]
  if (asset && toolId !== "salesforce") {
    return (
      <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-[7px]">
        <Image
          src={asset.src}
          alt={asset.alt}
          width={32}
          height={32}
          className="h-8 w-8 object-contain"
          priority={toolId === "slack"}
        />
      </span>
    )
  }

  if (toolId === "salesforce") {
    return (
      <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-[7px] bg-white">
        <span
          aria-label="Salesforce"
          className="block h-8 w-8 bg-no-repeat"
          style={{
            backgroundImage: "url('/Photos/icon/salesforce.jpeg')",
            backgroundPosition: "center",
            backgroundSize: "210%",
          }}
        />
      </span>
    )
  }

  if (toolId === "slack") {
    return (
      <span className="relative h-8 w-8 shrink-0">
        <span className="absolute left-[13px] top-[2px] h-3 w-1.5 rounded-full bg-[#36C5F0]" />
        <span className="absolute left-[18px] top-[8px] h-1.5 w-3 rounded-full bg-[#2EB67D]" />
        <span className="absolute left-[13px] top-[18px] h-3 w-1.5 rounded-full bg-[#2EB67D]" />
        <span className="absolute left-[3px] top-[14px] h-1.5 w-3 rounded-full bg-[#E01E5A]" />
        <span className="absolute left-[8px] top-[3px] h-3 w-1.5 rounded-full bg-[#E01E5A]" />
        <span className="absolute left-[3px] top-[8px] h-1.5 w-3 rounded-full bg-[#ECB22E]" />
        <span className="absolute left-[18px] top-[14px] h-1.5 w-3 rounded-full bg-[#36C5F0]" />
        <span className="absolute left-[8px] top-[18px] h-3 w-1.5 rounded-full bg-[#ECB22E]" />
      </span>
    )
  }
  if (toolId === "email") {
    return (
      <span className="relative h-8 w-8 shrink-0">
        <span className="absolute inset-x-[3px] top-[7px] h-[18px] rounded-[4px] bg-white" />
        <span className="absolute left-[3px] top-[7px] h-[18px] w-[6px] rounded-l-[4px] bg-[#4285F4]" />
        <span className="absolute right-[3px] top-[7px] h-[18px] w-[6px] rounded-r-[4px] bg-[#34A853]" />
        <span className="absolute left-[8px] top-[8px] h-[18px] w-[5px] rotate-[-38deg] bg-[#EA4335]" />
        <span className="absolute right-[8px] top-[8px] h-[18px] w-[5px] rotate-[38deg] bg-[#FBBC04]" />
      </span>
    )
  }
  if (toolId === "jira") {
    return (
      <span className="relative h-8 w-8 shrink-0">
        <span className="absolute left-[5px] top-[5px] h-5 w-5 rotate-45 rounded-[4px] bg-[#0C66E4]" />
        <span className="absolute left-[12px] top-[12px] h-2 w-2 rotate-45 rounded-[2px] bg-[#8FB8FF]" />
      </span>
    )
  }
  if (toolId === "calendar") {
    return (
      <span className="relative h-8 w-8 shrink-0">
        <span className="absolute left-[3px] top-[5px] h-[23px] w-[24px] rounded-[4px] bg-white" />
        <span className="absolute left-[3px] top-[5px] h-[6px] w-[24px] rounded-t-[4px] bg-[#4285F4]" />
        <span className="absolute left-[5px] top-[12px] h-[13px] w-[5px] bg-[#34A853]" />
        <span className="absolute left-[10px] top-[12px] h-[13px] w-[5px] bg-[#FBBC04]" />
        <span className="absolute left-[15px] top-[12px] h-[13px] w-[5px] bg-[#EA4335]" />
        <span className="absolute left-[20px] top-[12px] h-[13px] w-[5px] bg-[#4285F4]" />
      </span>
    )
  }
  if (toolId === "news") {
    return (
      <span className="relative h-8 w-8 shrink-0">
        <span className="absolute left-[4px] top-[5px] h-[22px] w-[22px] rounded-[3px] border border-[#d0d0d0] bg-[#151515]" />
        <span className="absolute left-[8px] top-[9px] h-[5px] w-[7px] rounded-[1px] border border-[#d0d0d0]" />
        <span className="absolute left-[17px] top-[9px] h-px w-[6px] bg-[#d0d0d0]" />
        <span className="absolute left-[17px] top-[13px] h-px w-[6px] bg-[#888]" />
        <span className="absolute left-[8px] top-[18px] h-px w-[15px] bg-[#d0d0d0]" />
        <span className="absolute left-[8px] top-[22px] h-px w-[13px] bg-[#777]" />
      </span>
    )
  }
  return (
    <span className="relative h-8 w-8 shrink-0">
      <span className="absolute left-[3px] top-[10px] h-[14px] w-[25px] rounded-full bg-[#00A1E0]" />
      <span className="absolute left-[8px] top-[7px] h-[10px] w-[14px] rounded-full bg-[#00A1E0]" />
      <span className="absolute left-[15px] top-[6px] h-[12px] w-[12px] rounded-full bg-[#00A1E0]" />
      <span className="absolute left-[8px] top-[15px] text-[6px] font-bold text-white">SF</span>
    </span>
  )
}

const toolIconAssets: Record<string, { src: string; alt: string }> = {
  slack: { src: "/Photos/icon/slack.png", alt: "Slack" },
  email: { src: "/Photos/icon/gmail.png", alt: "Gmail" },
  calendar: { src: "/Photos/icon/google-calendar.png", alt: "Google Calendar" },
  salesforce: { src: "/Photos/icon/salesforce.jpeg", alt: "Salesforce" },
}

function WorkUnitDecompositionPanel({
  selectedDecision,
  onDecisionChange,
  onOpenActionField,
}: {
  selectedDecision: string
  onDecisionChange: (decision: string) => void
  onOpenActionField: () => void
}) {
  return (
    <section className="no-scrollbar min-h-0 overflow-auto border-r border-[var(--ai-divider)] bg-[var(--ai-bg)] px-5 py-4">
      <div className="rounded-[8px] border border-[var(--ai-border)] bg-[var(--ai-panel)] p-4">
        <div>
          <div className="text-[11px] tracking-[0.12em] text-[var(--ai-text-muted)]">WORKUNIT JUDGMENT CONSOLE</div>
          <h1 className="mt-2 text-[22px] font-semibold text-[var(--ai-text-strong)]">エンタープライズ更新レスポンスパック</h1>
          <div className="mt-1 text-[13px] text-[var(--ai-text-muted)]">Source: Slack / #enterprise-updates</div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-[var(--ai-text)] md:max-w-[320px]">
          <span className="rounded-[5px] border border-[var(--ai-border)] bg-black px-3 py-2">Captured: 2025-06-08 10:38</span>
          <span className="rounded-[5px] border border-[var(--ai-accent-border)] bg-[var(--ai-success-bg)] px-3 py-2 text-[var(--ai-accent)]">Status: Push準備中</span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <InfoCard label="SITUATION">
          WorkUnit OS ロードマップからのシグナルを受信しました。
        </InfoCard>
        <InfoCard label="PROBLEM / WHY NOW">
          フェーズ1-3<br />実装台帳の作成が進行中。
        </InfoCard>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <MetaCard label="ACTORS" value="Owner: PM / Reviewer: Security / Related: Legal" />
        <MetaCard label="DEADLINE" value="今週中 (2026-06-14)" />
      </div>

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_220px] gap-3">
        <DecisionRequired selectedDecision={selectedDecision} onDecisionChange={onDecisionChange} />
        <PriorityScoreCard />
      </div>

      <DecomposedPushCandidates />
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_188px] gap-3">
        <PushReadiness />
        <CorrectionPanel />
      </div>
      <div className="mt-3">
        <ActionFieldEntryButton onOpen={onOpenActionField} />
      </div>
    </section>
  )
}

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-h-[88px] rounded-[8px] border border-[var(--ai-border)] bg-[var(--ai-panel)] p-4">
      <div className="mb-2 text-[11px] tracking-[0.12em] text-[var(--ai-text-muted)]">{label}</div>
      <div className="text-[12px] leading-relaxed text-[var(--ai-text-strong)]">{children}</div>
    </div>
  )
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] border border-[var(--ai-border)] bg-[rgba(17,17,17,0.78)] px-4 py-3">
      <div className="text-[10px] tracking-[0.12em] text-[var(--ai-text-muted)]">{label}</div>
      <div className="mt-2 text-[11px] leading-relaxed text-[var(--ai-text)]">{value}</div>
    </div>
  )
}

function DecisionRequired({
  selectedDecision,
  onDecisionChange,
}: {
  selectedDecision: string
  onDecisionChange: (decision: string) => void
}) {
  const decisions = ["今日中に返信する", "保留する", "担当者に確認する", "却下する"]

  return (
    <div className="rounded-[8px] border border-[var(--ai-accent-border)] bg-[radial-gradient(circle_at_top_left,rgba(105,255,71,0.12),rgba(17,17,17,0.96)_42%)] p-4 shadow-[0_0_0_1px_rgba(105,255,71,0.08)]">
      <div className="text-[11px] tracking-[0.12em] text-[var(--ai-text-muted)]">DECISION REQUIRED</div>
      <div className="mt-2 text-[12px] text-[var(--ai-text)]">このWorkUnitに対する次の判断を選択してください。</div>
      <div className="mt-3 flex flex-wrap gap-2.5">
        {decisions.map((decision) => {
          const active = decision === selectedDecision
          const rejected = decision === "却下する"
          return (
            <button
              key={decision}
              type="button"
              onClick={() => onDecisionChange(decision)}
              className={[
                "rounded-[6px] border px-3 py-2 text-[12px] font-semibold",
                active
                  ? "border-[var(--ai-accent)] bg-[var(--ai-accent)] text-black"
                  : rejected
                    ? "border-[#7a2929] bg-[#130909] text-[var(--ai-danger)] hover:border-[#a33c3c]"
                    : "border-[var(--ai-border-2)] bg-black text-[var(--ai-text)] hover:border-[var(--ai-accent-border)]",
              ].join(" ")}
            >
              {decision}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PriorityScoreCard() {
  return (
    <div className="rounded-[8px] border border-[var(--ai-border)] bg-[var(--ai-panel)] p-4">
      <div className="text-[11px] tracking-[0.12em] text-[var(--ai-text-muted)]">PRIORITY SCORE (ROI)</div>
      <div className="mt-4 text-[36px] font-bold leading-none text-[var(--ai-accent)]">240.0</div>
      <div className="mt-3 text-[11px] leading-relaxed text-[var(--ai-text)]">Impact 10 × Urgency 9 × Importance 8 ÷ Effort 3</div>
    </div>
  )
}

function DecomposedPushCandidates() {
  return (
    <div className="mt-3 rounded-[8px] border border-[var(--ai-border)] bg-[var(--ai-panel)] p-4">
      <div className="mb-3 text-[11px] tracking-[0.12em] text-[var(--ai-text-muted)]">
        DECOMPOSED PUSH CANDIDATES（分解候補）
      </div>
      <div className="overflow-hidden rounded-[7px] border border-[var(--ai-border)]">
        {pushCandidates.map((candidate) => (
          <PushCandidateRow key={candidate.id} candidate={candidate} />
        ))}
      </div>
    </div>
  )
}

function PushCandidateRow({ candidate }: { candidate: PushCandidate }) {
  return (
    <button
      type="button"
      className="flex w-full items-start gap-3 border-b border-[var(--ai-border)] bg-black px-3 py-3 text-left last:border-b-0 hover:bg-[var(--ai-surface)]"
    >
      <span className="grid h-8 w-8 place-items-center rounded-[6px] border border-[var(--ai-accent-border)] text-[15px] font-semibold text-[var(--ai-accent)]">
        {candidate.id}
      </span>
      <span className="mt-0.5 text-[18px] text-[var(--ai-text-strong)]">{candidate.icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold text-[var(--ai-text-strong)]">{candidate.task}</span>
        <span className="mt-1 block text-[11px] text-[var(--ai-text-muted)]">{candidate.summary}</span>
      </span>
      <span className={["mt-0.5 rounded-[5px] border px-3 py-1 text-[11px] font-semibold", statusStyle(candidate.status)].join(" ")}>
        {candidate.status}
      </span>
    </button>
  )
}

function statusStyle(status: PushCandidate["status"]) {
  if (status === "READY") return "border-[var(--ai-accent-border)] text-[var(--ai-accent)] bg-[var(--ai-success-bg)]"
  if (status === "NEEDS REVIEW") return "border-[#8a6322] text-[#ffcc66] bg-[#211707]"
  if (status === "NEEDS OWNER") return "border-[#5c5c5c] text-[#d4d4d4] bg-[#161616]"
  return "border-[var(--ai-border-2)] text-[var(--ai-text-muted)] bg-[var(--ai-panel)]"
}

function PushReadiness() {
  return (
    <div className="rounded-[8px] border border-[var(--ai-border)] bg-[var(--ai-panel)] p-4">
      <div className="mb-3 text-[11px] tracking-[0.12em] text-[var(--ai-text-muted)]">
        PUSH READINESS（承認プッシュ準備度）
      </div>
      <div className="flex items-center justify-between rounded-[7px] border border-[var(--ai-border)] bg-black px-3 py-2">
        <div className="text-[13px] font-semibold text-[var(--ai-text-strong)]">82% ready</div>
        <div className="text-[11px] text-[var(--ai-text-muted)]">Action Field review required</div>
      </div>
      <div className="mt-3 space-y-2">
        <ReadinessRow tone="good" text="Source verified" />
        <ReadinessRow tone="good" text="Owner confirmed" />
        <ReadinessRow tone="good" text="Deadline clear" />
        <ReadinessRow tone="warn" text="External actions require review" />
      </div>
    </div>
  )
}

function CorrectionPanel() {
  return (
    <div className="rounded-[8px] border border-[var(--ai-border)] bg-[var(--ai-panel)] p-4">
      <div className="text-[11px] tracking-[0.12em] text-[var(--ai-text-muted)]">CORRECTION</div>
      <div className="mt-2 text-[11px] leading-relaxed text-[var(--ai-text)]">
        AIのWorkUnit化や分解結果が不正確な場合に修正します。
      </div>
      <div className="mt-4 space-y-2">
        <button type="button" className="w-full rounded-[6px] border border-[var(--ai-border-2)] bg-black px-3 py-2 text-[12px] font-semibold text-[var(--ai-text-strong)] hover:border-[var(--ai-accent-border)]">
          修正する
        </button>
        <button type="button" className="w-full rounded-[6px] border border-[var(--ai-accent-border)] bg-[var(--ai-accent-surface)] px-3 py-2 text-[12px] font-semibold text-[var(--ai-accent)] hover:bg-[rgba(105,255,71,0.14)]">
          THIS IS WRONG
        </button>
      </div>
    </div>
  )
}

function ReadinessRow({ tone, text }: { tone: "good" | "warn"; text: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className={tone === "good" ? "text-[var(--ai-accent)]" : "text-[#ffcc66]"}>{tone === "good" ? "✓" : "⚠"}</span>
      <span className="text-[var(--ai-text)]">{text}</span>
    </div>
  )
}

function RightQueuePanel() {
  return (
    <aside className="min-h-0 overflow-auto bg-[var(--ai-bg)] px-5 py-5">
      <h2 className="mb-4 text-[16px] font-semibold text-[var(--ai-text-strong)]">アクション候補</h2>
      <Panel title="優先順位キュー">
        <div className="space-y-3">
          {priorityQueue.map((item) => (
            <div key={item.title} className="flex items-center justify-between gap-3 text-[13px]">
              <span className="min-w-0 truncate text-[var(--ai-text-strong)]">{item.title}</span>
              <span className="shrink-0 text-[var(--ai-text)]">({item.roi.toFixed(1)})</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="実行ステータス" className="mt-4">
        <IntegrationStatus />
      </Panel>
    </aside>
  )
}

function IntegrationStatus() {
  return (
    <div className="space-y-3">
      {integrations.map((item) => (
        <div key={item.label} className="flex items-center justify-between gap-3 text-[13px]">
          <span className="text-[var(--ai-text)]">{item.label}</span>
          <span className={integrationTone(item.tone)}>{item.value}</span>
        </div>
      ))}
    </div>
  )
}

function integrationTone(tone: (typeof integrations)[number]["tone"]) {
  if (tone === "good") return "font-semibold text-[var(--ai-accent)]"
  if (tone === "warn") return "font-semibold text-[#ffcc66]"
  return "font-semibold text-[var(--ai-danger)]"
}

function ActionFieldEntryButton({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="rounded-[8px] border border-[var(--ai-border)] bg-[var(--ai-panel)] p-4">
      <div className="mb-3 rounded-[8px] border border-[var(--ai-border)] bg-[var(--ai-surface)] p-4">
        <div className="text-[12px] font-semibold text-[var(--ai-text-strong)]">Prepared Actions</div>
        <div className="mt-2 flex items-center gap-2 text-[13px] text-[var(--ai-text)]">
          <Image
            src="/Photos/icon/slack.png"
            alt="Slack"
            width={18}
            height={18}
            className="h-[18px] w-[18px] object-contain"
          />
          Slack Reply ready
        </div>
        <div className="mt-1 text-[11px] text-[var(--ai-text-muted)]">Review required before execution</div>
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="w-full rounded-[8px] border border-[var(--ai-accent-border)] bg-[var(--ai-accent)] px-5 py-4 text-[14px] font-bold text-black shadow-[0_0_24px_rgba(105,255,71,0.18)] hover:brightness-110"
      >
        アクションフィールドを開く
      </button>
      <div className="mt-3 rounded-[7px] border border-[var(--ai-border)] bg-black px-4 py-3 text-center text-[12px] text-[var(--ai-text)]">
        1件の問題
      </div>
    </div>
  )
}

function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={["rounded-[8px] border border-[var(--ai-border)] bg-[var(--ai-surface)] p-4", className].join(" ")}>
      <div className="mb-4 text-[14px] font-semibold text-[var(--ai-text-strong)]">{title}</div>
      {children}
    </section>
  )
}

function ActionFieldDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [draftActionGroup, setDraftActionGroup] = useState<ActionGroup>(actionGroups[0])
  const [dirtyActionIds, setDirtyActionIds] = useState<string[]>([])
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const blockedChecks = draftActionGroup.safetyChecks.filter((check) => check.status === "blocked").length
  const warningChecks = draftActionGroup.safetyChecks.filter((check) => check.status === "warning").length
  const hasUnsavedChanges = dirtyActionIds.length > 0

  if (!open) return null

  const handleSelectGroup = (group: ActionGroup) => {
    if (hasUnsavedChanges && !window.confirm("未保存の変更があります。破棄して切り替えますか？")) return
    setDraftActionGroup(group)
    setDirtyActionIds([])
    setLastSavedAt(null)
  }

  const markDirty = (actionId: string) => {
    setDirtyActionIds((current) => (current.includes(actionId) ? current : [...current, actionId]))
  }

  const updateActionField = (actionId: string, key: string, value: string | string[]) => {
    setDraftActionGroup((current) => ({
      ...current,
      status: "draft_ready",
      actions: current.actions.map((action) =>
        action.id === actionId
          ? { ...action, status: "draft_ready", fields: { ...action.fields, [key]: value } }
          : action,
      ),
    }))
    markDirty(actionId)
  }

  const handleSaveDraft = () => {
    const savedAt = new Date()
    setDraftActionGroup((current) => ({ ...current, status: "draft_saved" }))
    setDirtyActionIds([])
    setLastSavedAt(savedAt)
    console.log("save draft", draftActionGroup)
  }

  const handleClose = () => {
    if (hasUnsavedChanges && !window.confirm("未保存の変更があります。破棄して閉じますか？")) return
    onClose()
  }

  const handleApprove = () => {
    if (blockedChecks > 0) return
    const approved = { ...draftActionGroup, status: "approved" as const }
    setDraftActionGroup(approved)
    setDirtyActionIds([])
    console.log("approve and execute", approved)
  }

  return (
    <div className="fixed inset-0 z-[10000] bg-black/72 backdrop-blur-[1px]">
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-[620px] flex-col border-l border-[var(--ai-border-2)] bg-[linear-gradient(180deg,var(--ai-surface),#080808)] shadow-[-24px_0_70px_rgba(0,0,0,0.6)]">
        <ActionFieldHeader
          actionGroup={draftActionGroup}
          dirtyCount={dirtyActionIds.length}
          lastSavedAt={lastSavedAt}
          onClose={handleClose}
        />

        <div className="no-scrollbar min-h-0 flex-1 overflow-auto px-5 py-4">
          <div className="mb-4 grid grid-cols-3 gap-2">
            {actionGroups.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => handleSelectGroup(group)}
                className={[
                  "min-h-[42px] rounded-[6px] border px-2 py-2 text-left text-[10px] leading-snug",
                  group.id === draftActionGroup.id
                    ? "border-[var(--ai-accent)] bg-[var(--ai-success-bg)] text-[var(--ai-accent)]"
                    : "border-[var(--ai-border)] bg-black text-[var(--ai-text-muted)] hover:border-[var(--ai-border-2)]",
                ].join(" ")}
              >
                {group.approvalTitle}
              </button>
            ))}
          </div>

          <ExternalActionApprovalCard actionGroup={draftActionGroup} />
          <ActionSummary actionGroup={draftActionGroup} dirtyCount={dirtyActionIds.length} />
          <SafetyCheckPanel safetyChecks={draftActionGroup.safetyChecks} />

          <div className="mt-4 space-y-3 pb-4">
            {draftActionGroup.actions.map((action) => (
              <DynamicActionSection key={action.id} action={action} onUpdateField={updateActionField} onSaveDraft={handleSaveDraft} />
            ))}
          </div>
        </div>

        <ActionFieldFooter
          blockedChecks={blockedChecks}
          warningChecks={warningChecks}
          hasUnsavedChanges={hasUnsavedChanges}
          onApprove={handleApprove}
          onSaveDraft={handleSaveDraft}
          onCancel={handleClose}
        />
      </aside>
    </div>
  )
}

function ActionFieldHeader({
  actionGroup,
  dirtyCount,
  lastSavedAt,
  onClose,
}: {
  actionGroup: ActionGroup
  dirtyCount: number
  lastSavedAt: Date | null
  onClose: () => void
}) {
  return (
    <header className="shrink-0 border-b border-[var(--ai-divider)] px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="truncate text-[18px] font-semibold text-[var(--ai-text-strong)]">Action Field</div>
          <div className="mt-1 text-[10px] text-[var(--ai-text-muted)]">{actionGroup.title}</div>
          <div className="mt-3 grid gap-1 text-[11px] text-[var(--ai-text)]">
            <span>WorkUnit: <strong className="text-[var(--ai-text-strong)]">{actionGroup.workUnitTitle}</strong></span>
            <span>Source: {actionGroup.source}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Action Field"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-[6px] text-[24px] text-[var(--ai-text-muted)] hover:bg-[var(--ai-panel)] hover:text-[var(--ai-text-strong)]"
        >
          ×
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <RiskBadge risk={actionGroup.risk} />
        <StatusBadge status={actionGroup.status} />
        <DirtyStateBadge dirtyCount={dirtyCount} />
        {lastSavedAt ? (
          <span className="rounded-[5px] border border-[var(--ai-border)] bg-black px-2 py-1 text-[10px] text-[var(--ai-text-muted)]">
            Last saved: {lastSavedAt.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
          </span>
        ) : null}
      </div>
    </header>
  )
}

function ExternalActionApprovalCard({ actionGroup }: { actionGroup: ActionGroup }) {
  return (
    <section className="rounded-[8px] border border-[var(--ai-border)] bg-[var(--ai-panel)] p-4">
      <div className="text-[12px] font-semibold text-[var(--ai-text-strong)]">
        Preview: {actionGroup.approvalTitle}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {actionGroup.actions.map((action) => (
          <span key={action.id} className="rounded-[5px] border border-[var(--ai-border-2)] bg-black px-2 py-1 text-[10px] text-[var(--ai-text)]">
            {action.title}
          </span>
        ))}
      </div>
    </section>
  )
}

function ActionSummary({ actionGroup, dirtyCount }: { actionGroup: ActionGroup; dirtyCount: number }) {
  return (
    <section className="mt-4 rounded-[8px] border border-[var(--ai-border)] bg-[var(--ai-panel)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[12px] font-semibold text-[var(--ai-text-strong)]">Preview Status</div>
        <span className="text-[11px] text-[var(--ai-text-muted)]">{actionGroup.actions.length} actions</span>
      </div>
      <div className="mt-2 text-[11px] text-[var(--ai-text)]">
        {dirtyCount > 0 ? `Unsaved changes: ${dirtyCount}` : "Draft ready for review"}
      </div>
    </section>
  )
}

function DynamicActionSection({
  action,
  onUpdateField,
  onSaveDraft,
}: {
  action: ActionItem
  onUpdateField: (actionId: string, key: string, value: string | string[]) => void
  onSaveDraft: () => void
}) {
  if (action.type === "database_update") return <DatabaseActionSection action={action} />
  if (action.type === "email_send") return <EmailActionSection action={action} onUpdateField={onUpdateField} onSaveDraft={onSaveDraft} />
  if (action.type === "slack_reply") return <SlackActionSection action={action} onUpdateField={onUpdateField} onSaveDraft={onSaveDraft} />
  if (action.type === "github_issue") return <GitHubActionSection action={action} onUpdateField={onUpdateField} onSaveDraft={onSaveDraft} />
  if (action.type === "calendar_block") return <CalendarActionSection action={action} onUpdateField={onUpdateField} onSaveDraft={onSaveDraft} />
  return null
}

function DatabaseActionSection({ action }: { action: ActionItem }) {
  return (
    <ActionSection title="Database Action" risk={action.risk}>
      <div className="flex items-center justify-between gap-3">
        <FieldLabel>Mutation Preview</FieldLabel>
        <button
          type="button"
          onClick={() => console.log("Database mutation editing is disabled in prerelease.")}
          className="rounded-[5px] border border-[#7a2929] bg-[#1a0b0b] px-2 py-1 text-[10px] font-semibold text-[var(--ai-danger)]"
        >
          Edit Disabled
        </button>
      </div>
      <CodePreview value={stringField(action, "mutationPreview")} />
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Field label="Affected Rows Estimate" value={stringField(action, "affectedRowsEstimate")} />
        <Field label="Target Table" value={stringField(action, "targetTable")} />
      </div>
      <SafetyCheckRow tone="warn" label="Safety Check" value={stringField(action, "safetyCheck")} />
      <SafetyCheckRow tone="good" label="Rollback / Undo" value={stringField(action, "rollbackUndo")} />
    </ActionSection>
  )
}

function EmailActionSection({
  action,
  onUpdateField,
  onSaveDraft,
}: {
  action: ActionItem
  onUpdateField: (actionId: string, key: string, value: string | string[]) => void
  onSaveDraft: () => void
}) {
  return (
    <ActionSection title="Email Action" risk={action.risk}>
      <div className="grid grid-cols-2 gap-3">
        <EditableTextField label="Recipients" value={arrayField(action, "recipients").join(", ")} onChange={(value) => onUpdateField(action.id, "recipients", splitCsv(value))} />
        <EditableTextField label="Subject" value={stringField(action, "subject")} onChange={(value) => onUpdateField(action.id, "subject", value)} />
      </div>
      <ActionTextEditor
        label="Body Editor"
        value={stringField(action, "body")}
        onChange={(value) => onUpdateField(action.id, "body", value)}
        onSaveDraft={onSaveDraft}
        minRows={7}
        toolbar
        helperText="Cmd/Ctrl + S で下書き保存"
      />
      <SafetyCheckRow tone="danger" label="Customer-facing Warning" value={stringField(action, "customerFacingWarning")} />
      <SafetyCheckRow tone="good" label="Attachment Check" value={stringField(action, "attachmentCheck")} />
      <SafetyCheckRow tone="good" label="Safety Check" value={stringField(action, "safetyCheck")} />
    </ActionSection>
  )
}

function SlackActionSection({
  action,
  onUpdateField,
  onSaveDraft,
}: {
  action: ActionItem
  onUpdateField: (actionId: string, key: string, value: string | string[]) => void
  onSaveDraft: () => void
}) {
  return (
    <ActionSection title="Slack Action" risk={action.risk}>
      <Field label="Target Channel / Thread" value={stringField(action, "target")} />
      <ActionTextEditor
        label="Message Preview"
        value={stringField(action, "messagePreview")}
        onChange={() => {}}
        disabled
        minRows={4}
      />
      <ActionTextEditor
        label="Editable Message"
        value={stringField(action, "messageBody")}
        onChange={(value) => onUpdateField(action.id, "messageBody", value)}
        onSaveDraft={onSaveDraft}
        minRows={5}
        toolbar
        helperText="Draft ready / 編集後は未保存状態になります"
      />
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Field label="Mention Check" value={stringField(action, "mentionCheck")} />
        <Field label="Context Used" value={stringField(action, "contextUsed")} />
      </div>
    </ActionSection>
  )
}

function GitHubActionSection({
  action,
  onUpdateField,
  onSaveDraft,
}: {
  action: ActionItem
  onUpdateField: (actionId: string, key: string, value: string | string[]) => void
  onSaveDraft: () => void
}) {
  return (
    <ActionSection title="GitHub Action" risk={action.risk}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Repository" value={stringField(action, "repository")} />
        <EditableTextField label="Issue Title" value={stringField(action, "issueTitle")} onChange={(value) => onUpdateField(action.id, "issueTitle", value)} />
      </div>
      <ActionTextEditor
        label="Issue Body Editor"
        value={stringField(action, "issueBody")}
        onChange={(value) => onUpdateField(action.id, "issueBody", value)}
        onSaveDraft={onSaveDraft}
        minRows={8}
        toolbar
        monospace
      />
      <div className="mt-3 grid grid-cols-[1fr_160px] gap-3">
        <EditableTextField label="Labels" value={arrayField(action, "labels").join(", ")} onChange={(value) => onUpdateField(action.id, "labels", splitCsv(value))} />
        <EditableTextField label="Assignee" value={stringField(action, "assignee")} onChange={(value) => onUpdateField(action.id, "assignee", value)} />
      </div>
    </ActionSection>
  )
}

function CalendarActionSection({
  action,
  onUpdateField,
  onSaveDraft,
}: {
  action: ActionItem
  onUpdateField: (actionId: string, key: string, value: string | string[]) => void
  onSaveDraft: () => void
}) {
  return (
    <ActionSection title="Calendar Action" risk={action.risk}>
      <div className="grid grid-cols-2 gap-3">
        <EditableTextField label="Attendees" value={arrayField(action, "attendees").join(", ")} onChange={(value) => onUpdateField(action.id, "attendees", splitCsv(value))} />
        <EditableTextField label="Start Time" value={stringField(action, "startTime")} onChange={(value) => onUpdateField(action.id, "startTime", value)} />
        <EditableTextField label="End Time" value={stringField(action, "endTime")} onChange={(value) => onUpdateField(action.id, "endTime", value)} />
        <Field label="Duration" value={stringField(action, "duration")} />
        <EditableTextField label="Purpose" value={stringField(action, "purpose")} onChange={(value) => onUpdateField(action.id, "purpose", value)} />
      </div>
      <ActionTextEditor
        label="Description Editor"
        value={stringField(action, "description")}
        onChange={(value) => onUpdateField(action.id, "description", value)}
        onSaveDraft={onSaveDraft}
        minRows={6}
        toolbar
      />
      <SafetyCheckRow tone="good" label="Conflict Check" value={stringField(action, "conflictCheck")} />
    </ActionSection>
  )
}

function ActionFieldFooter({
  blockedChecks,
  warningChecks,
  hasUnsavedChanges,
  onApprove,
  onSaveDraft,
  onCancel,
}: {
  blockedChecks: number
  warningChecks: number
  hasUnsavedChanges: boolean
  onApprove: () => void
  onSaveDraft: () => void
  onCancel: () => void
}) {
  return (
    <footer className="shrink-0 border-t border-[var(--ai-divider)] bg-[var(--ai-surface)] px-5 py-4">
      <div className="mb-3 text-[11px] text-[var(--ai-text-muted)]">
        {blockedChecks > 0
          ? "解決が必要な安全チェックがあります"
          : warningChecks > 0
            ? "警告があります。内容を確認してください"
            : hasUnsavedChanges
              ? "Unsaved changes"
              : "Draft saved"}
      </div>
      <div className="grid grid-cols-[1fr_112px_112px] gap-3">
      <button
        type="button"
        onClick={onApprove}
        disabled={blockedChecks > 0}
        className="rounded-[6px] border border-[var(--ai-accent-border)] bg-[var(--ai-accent)] px-4 py-3 text-[12px] font-bold text-black hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
      >
        承認して実行
      </button>
      <button
        type="button"
        onClick={onSaveDraft}
        className={[
          "rounded-[6px] border px-4 py-3 text-[12px] font-semibold hover:border-[var(--ai-accent-border)]",
          hasUnsavedChanges
            ? "border-[var(--ai-accent-border)] bg-[var(--ai-accent-surface)] text-[var(--ai-accent)]"
            : "border-[var(--ai-border)] bg-black text-[var(--ai-accent)]",
        ].join(" ")}
      >
        下書き保存
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-[6px] border border-[var(--ai-border)] bg-[var(--ai-panel)] px-4 py-3 text-[12px] font-semibold text-[var(--ai-text)] hover:text-[var(--ai-text-strong)]"
      >
        キャンセル
      </button>
      </div>
    </footer>
  )
}

function ActionSection({ title, risk, children }: { title: string; risk: RiskLevel; children: React.ReactNode }) {
  return (
    <section className="rounded-[8px] border border-[var(--ai-border)] bg-[var(--ai-panel)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-[var(--ai-text-strong)]">{title}</h3>
        <RiskBadge risk={risk} />
      </div>
      {children}
    </section>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <div className="mt-1 min-h-[30px] rounded-[5px] border border-[var(--ai-border)] bg-black px-2 py-2 text-[11px] text-[var(--ai-text)]">
        {value}
      </div>
    </label>
  )
}

function EditableTextField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-[34px] w-full rounded-[5px] border border-[var(--ai-border)] bg-black px-2 py-2 text-[11px] text-[var(--ai-text)] outline-none transition focus:border-[var(--ai-accent-border)] focus:shadow-[0_0_0_1px_rgba(105,255,71,0.18)]"
      />
    </label>
  )
}

function FieldLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={["text-[10px] font-semibold text-[var(--ai-text-muted)]", className].join(" ")}>{children}</div>
}

function ActionTextEditor({
  label,
  value,
  onChange,
  onSaveDraft,
  placeholder,
  minRows = 4,
  maxRows,
  disabled,
  helperText,
  warning,
  toolbar,
  monospace,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  onSaveDraft?: () => void
  placeholder?: string
  minRows?: number
  maxRows?: number
  disabled?: boolean
  helperText?: string
  warning?: string
  toolbar?: boolean
  monospace?: boolean
}) {
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between gap-3">
        <FieldLabel>{label}</FieldLabel>
        <span className="text-[10px] text-[var(--ai-text-muted)]">{value.length} chars</span>
      </div>
      <div className={["mt-1 overflow-hidden rounded-[6px] border bg-black", disabled ? "border-[var(--ai-border)]" : "border-[var(--ai-border-2)] shadow-[0_0_0_1px_rgba(105,255,71,0.06)]"].join(" ")}>
        {toolbar ? (
          <div className="flex items-center gap-2 border-b border-[var(--ai-border)] bg-[var(--ai-panel)] px-3 py-2 text-[10px] text-[var(--ai-text)]">
            {["Bold", "Italic", "List", "Link", "Regenerate", "Copy"].map((item) => (
              <button key={item} type="button" onClick={() => console.log("editor toolbar", item)} className="rounded-[4px] border border-[var(--ai-border)] px-2 py-1 hover:border-[var(--ai-accent-border)]">
                {item}
              </button>
            ))}
          </div>
        ) : null}
        <textarea
          value={value}
          disabled={disabled}
          rows={minRows}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
              event.preventDefault()
              onSaveDraft?.()
            }
          }}
          className={[
            "w-full resize-none bg-black px-3 py-2 text-[11px] leading-relaxed text-[var(--ai-text)] outline-none transition",
            disabled ? "cursor-default opacity-80" : "focus:bg-[#050505] focus:shadow-[inset_0_0_0_1px_rgba(105,255,71,0.18)]",
            monospace ? "font-mono" : "",
          ].join(" ")}
          style={maxRows ? { maxHeight: `${maxRows * 24}px` } : undefined}
        />
      </div>
      {warning ? <div className="mt-1 text-[10px] text-[#ffcc66]">{warning}</div> : null}
      {helperText ? <div className="mt-1 text-[10px] text-[var(--ai-text-muted)]">{helperText}</div> : null}
    </div>
  )
}

function RiskBadge({ risk }: { risk: RiskLevel }) {
  const className =
    risk === "high"
      ? "border-[#7a2929] bg-[#260d0d] text-[var(--ai-danger)]"
      : risk === "medium"
        ? "border-[#72521c] bg-[#211707] text-[#ffcc66]"
        : "border-[var(--ai-accent-border)] bg-[var(--ai-success-bg)] text-[var(--ai-accent)]"

  return (
    <span className={["rounded-[5px] border px-2 py-1 text-[10px] font-semibold uppercase", className].join(" ")}>
      Risk: {risk}
    </span>
  )
}

function StatusBadge({ status }: { status: ActionGroup["status"] }) {
  const tone =
    status === "approved" || status === "executed"
      ? "border-[var(--ai-accent-border)] bg-[var(--ai-success-bg)] text-[var(--ai-accent)]"
      : status === "draft_saved"
        ? "border-[var(--ai-border-2)] bg-black text-[var(--ai-text)]"
        : "border-[#72521c] bg-[#211707] text-[#ffcc66]"
  return (
    <span className={["rounded-[5px] border px-2 py-1 text-[10px] font-semibold", tone].join(" ")}>
      Status: {status.replaceAll("_", " ")}
    </span>
  )
}

function DirtyStateBadge({ dirtyCount }: { dirtyCount: number }) {
  if (dirtyCount === 0) return null
  return (
    <span className="rounded-[5px] border border-[#72521c] bg-[#211707] px-2 py-1 text-[10px] font-semibold text-[#ffcc66]">
      Unsaved changes: {dirtyCount}
    </span>
  )
}

function SafetyCheckRow({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: "good" | "warn" | "danger"
}) {
  const color = tone === "good" ? "text-[var(--ai-accent)]" : tone === "danger" ? "text-[var(--ai-danger)]" : "text-[#ffcc66]"
  return (
    <div className="mt-3 flex items-start gap-2 border-t border-[var(--ai-border)] pt-3 text-[11px]">
      <span className={color}>
        {tone === "good" ? "✓" : tone === "danger" ? "●" : "⚠"}
      </span>
      <div>
        <div className="font-semibold text-[var(--ai-text-strong)]">{label}</div>
        <div className="mt-1 text-[var(--ai-text)]">{value}</div>
      </div>
    </div>
  )
}

function CodePreview({ value }: { value: string }) {
  return (
    <pre className="max-h-[150px] overflow-auto rounded-[5px] border border-[var(--ai-border)] bg-black px-3 py-2 font-mono text-[11px] leading-relaxed text-[var(--ai-text)]">
      <code>{value}</code>
    </pre>
  )
}

function SafetyCheckPanel({ safetyChecks }: { safetyChecks: SafetyCheck[] }) {
  return (
    <section className="mt-4 rounded-[8px] border border-[var(--ai-border)] bg-[var(--ai-panel)] p-4">
      <div className="text-[12px] font-semibold text-[var(--ai-text-strong)]">Safety Check</div>
      <div className="mt-3 space-y-2">
        {safetyChecks.map((check) => (
          <div key={check.label} className="flex items-center justify-between gap-3 rounded-[5px] border border-[var(--ai-border)] bg-black px-3 py-2 text-[11px]">
            <span className="text-[var(--ai-text)]">{check.label}</span>
            <span className={safetyStatusTone(check.status)}>{check.status}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function stringField(action: ActionItem, key: string): string {
  const value = action.fields[key]
  return Array.isArray(value) ? value.join(", ") : value ?? ""
}

function arrayField(action: ActionItem, key: string): string[] {
  const value = action.fields[key]
  return Array.isArray(value) ? value : value ? [value] : []
}

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

function safetyStatusTone(status: SafetyStatus) {
  if (status === "pass") return "font-semibold uppercase text-[var(--ai-accent)]"
  if (status === "warning") return "font-semibold uppercase text-[#ffcc66]"
  return "font-semibold uppercase text-[var(--ai-danger)]"
}
