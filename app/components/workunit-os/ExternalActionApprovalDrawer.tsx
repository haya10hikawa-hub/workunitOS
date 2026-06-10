import type { ReactNode } from "react"
import type { WorkUnit } from "@/types/workunit"

export type ExternalActionKind = "github" | "slack" | "notion" | "email" | "db"

const actionConfig: Record<
  ExternalActionKind,
  {
    label: string
    icon: string
    accent: string
    destinationLabel: string
    destination: string
    primaryField: string
    tags: string[]
  }
> = {
  github: {
    label: "GitHub Issue Creation",
    icon: "GH",
    accent: "#5aa7f7",
    destinationLabel: "Repository",
    destination: "WorkUnit/Core-Platform",
    primaryField: "Issue Title",
    tags: ["workunit", "bug", "high-priority"],
  },
  slack: {
    label: "Slack Thread Reply",
    icon: "SL",
    accent: "#69ff47",
    destinationLabel: "Channel / Thread",
    destination: "#mcp-review · thread 1717820000.000",
    primaryField: "Reply Preview",
    tags: ["reply", "owner-confirm", "visible-to-channel"],
  },
  notion: {
    label: "Notion Task Page Upsert",
    icon: "NO",
    accent: "#d0d0d0",
    destinationLabel: "Database",
    destination: "WorkUnit OS / Execution Backlog",
    primaryField: "Page Title",
    tags: ["database", "task-page", "sync"],
  },
  email: {
    label: "Email Draft Send",
    icon: "EM",
    accent: "#ffb454",
    destinationLabel: "Recipients",
    destination: "sales-lead@example.com, security-review@example.com",
    primaryField: "Subject",
    tags: ["customer-facing", "reply", "approval-required"],
  },
  db: {
    label: "DB Mutation",
    icon: "DB",
    accent: "#b8ff9b",
    destinationLabel: "Connection / Table",
    destination: "D1: workunit_os · work_units",
    primaryField: "Mutation",
    tags: ["write", "audit-log", "rollback-ready"],
  },
}

export function ExternalActionApprovalDrawer({
  open,
  workUnit,
  actionKind,
  onClose,
  onApprove,
  onReject,
}: {
  open: boolean
  workUnit: WorkUnit | null
  actionKind: ExternalActionKind
  onClose: () => void
  onApprove: () => void
  onReject: () => void
}) {
  if (!open || !workUnit) return null

  const config = actionConfig[actionKind]

  return (
    <div className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-[1px]">
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-[540px] flex-col border-l border-[var(--ai-border-2)] bg-[linear-gradient(180deg,var(--ai-surface),#080808)] shadow-[-24px_0_70px_rgba(0,0,0,0.55)]">
        <header className="flex items-center justify-between border-b border-[var(--ai-divider)] px-6 py-4">
          <div className="min-w-0">
            <h2 className="text-[18px] font-semibold text-[var(--ai-text-strong)]">External Action Approval</h2>
            <div className="mt-1 text-[11px] tracking-[0.14em] text-[var(--ai-text-muted)]">PM APPROVAL REQUIRED BEFORE EXTERNAL WRITE</div>
          </div>
          <div className="flex items-center gap-4">
            <span className="rounded-[5px] border border-[#6c4216] bg-[#201408] px-3 py-1 text-[11px] font-semibold text-[#ffb454]">
              Pending Approval
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close approval drawer"
              className="grid h-8 w-8 place-items-center rounded-[6px] text-[24px] leading-none text-[var(--ai-text-muted)] hover:bg-[var(--ai-panel)] hover:text-[var(--ai-text-strong)]"
            >
              ×
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
          <div
            className="rounded-[6px] border px-3 py-3 text-[16px] font-semibold text-[var(--ai-text-strong)]"
            style={{ borderColor: config.accent, background: "rgba(255,255,255,0.035)" }}
          >
            <span
              className="mr-3 inline-grid h-7 w-7 place-items-center rounded-[5px] border text-[11px] font-bold"
              style={{ borderColor: config.accent, color: config.accent }}
            >
              {config.icon}
            </span>
            <span style={{ color: config.accent }}>Action:</span> {config.label}
          </div>

          <ApprovalField label={config.destinationLabel}>
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-[var(--ai-text-strong)]">{config.destination}</span>
              <span className="text-[18px] text-[var(--ai-text-muted)]">↗</span>
            </div>
          </ApprovalField>

          <ApprovalField label={config.primaryField}>
            <span>{actionKind === "db" ? `UPSERT WorkUnit ${workUnit.id}` : workUnit.title}</span>
          </ApprovalField>

          <div className="mt-4">
            <div className="mb-2 text-[13px] font-semibold text-[var(--ai-text-strong)]">{bodyLabel(actionKind)}</div>
            <textarea
              readOnly
              value={bodyFor(actionKind, workUnit)}
              className="min-h-[188px] w-full resize-none rounded-[6px] border border-[var(--ai-border)] bg-black px-3 py-3 text-[12px] leading-relaxed text-[var(--ai-text)] outline-none"
            />
          </div>

          <div className="mt-4">
            <div className="mb-2 text-[13px] font-semibold text-[var(--ai-text-strong)]">Labels / Safety Tags</div>
            <div className="flex min-h-[42px] flex-wrap items-center gap-2 rounded-[6px] border border-[var(--ai-border)] bg-black px-3 py-2">
              {config.tags.map((label) => (
                <span key={label} className="rounded-full border border-[var(--ai-border-2)] bg-[var(--ai-panel)] px-3 py-1 text-[12px] text-[var(--ai-text)]">
                  {label} <span className="ml-1 text-[var(--ai-text-muted)]">×</span>
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <ApprovalField label="Approval Scope" compact>
              <div className="text-[12px] text-[var(--ai-text)]">{approvalScope(actionKind)}</div>
            </ApprovalField>
            <ApprovalField label="Rollback / Audit" compact>
              <div className="text-[12px] text-[var(--ai-text)]">{rollbackPolicy(actionKind)}</div>
            </ApprovalField>
          </div>

          <div className="mt-4">
            <div className="mb-2 text-[13px] font-semibold text-[var(--ai-text-strong)]">Execution Log</div>
            <div className="space-y-1 rounded-[6px] border border-[var(--ai-border)] bg-black px-3 py-3 text-[12px] text-[var(--ai-text)]">
              <div>2026/06/09 10:15 - Draft regenerated after PM correction</div>
              <div>2026/06/08 16:30 - Draft created from WorkUnit decomposition</div>
            </div>
          </div>
        </div>

        <footer className="grid grid-cols-[1fr_auto_auto] gap-3 border-t border-[var(--ai-divider)] px-6 py-4">
          <button
            type="button"
            onClick={onApprove}
            className="rounded-[8px] border border-[var(--ai-accent-border)] bg-[var(--ai-accent)] px-6 py-3 text-[13px] font-bold text-black shadow-[0_0_22px_rgba(105,255,71,0.18)] hover:brightness-110"
          >
            Approve and Execute
          </button>
          <button
            type="button"
            className="rounded-[8px] border border-[var(--ai-border-2)] bg-[var(--ai-panel)] px-5 py-3 text-[13px] font-semibold text-[var(--ai-text)] hover:text-[var(--ai-text-strong)]"
          >
            Edit Draft
          </button>
          <button
            type="button"
            onClick={onReject}
            className="rounded-[8px] border border-[#ff8d86]/30 bg-[#3a1010] px-5 py-3 text-[13px] font-semibold text-[#ff8d86] hover:bg-[#4a1414]"
          >
            Reject
          </button>
        </footer>
      </aside>
    </div>
  )
}

function bodyLabel(actionKind: ExternalActionKind): string {
  if (actionKind === "db") return "Mutation Preview"
  if (actionKind === "notion") return "Properties / Page Body"
  if (actionKind === "slack") return "Message"
  if (actionKind === "email") return "Email Body"
  return "Issue Body"
}

function bodyFor(actionKind: ExternalActionKind, workUnit: WorkUnit): string {
  if (actionKind === "slack") {
    return [
      `確認しました: ${workUnit.title}`,
      `状況: ${workUnit.situation}`,
      `次に進めるTo do: ${workUnit.tasks.filter((task) => !task.done).map((task) => task.label).join(" / ")}`,
      `期限: ${workUnit.deadline}`,
    ].join("\n")
  }
  if (actionKind === "notion") {
    return [
      `Status: ${workUnit.status}`,
      `Priority: ${workUnit.priority ?? "Normal"}`,
      `Actors: ${workUnit.actors.join(", ")}`,
      `Deadline: ${workUnit.deadline}`,
      "",
      workUnit.tasks.map((task) => `- [${task.done ? "x" : " "}] ${task.label}`).join("\n"),
    ].join("\n")
  }
  if (actionKind === "email") {
    return [
      "Hi team,",
      "",
      `We need to move on ${workUnit.title}.`,
      workUnit.problem,
      "",
      `Requested next steps: ${workUnit.tasks.map((task) => task.label).join("; ")}`,
      `Deadline: ${workUnit.deadline}`,
    ].join("\n")
  }
  if (actionKind === "db") {
    return [
      "BEGIN TRANSACTION;",
      `UPSERT INTO work_units (id, title, status, priority) VALUES ('${workUnit.id}', '${workUnit.title}', '${workUnit.status}', '${workUnit.priority ?? "Normal"}');`,
      `INSERT INTO execution_audit (work_unit_id, action, approved_by) VALUES ('${workUnit.id}', 'external_push', 'PM');`,
      "COMMIT;",
    ].join("\n")
  }
  return [
    `Description: ${workUnit.problem}`,
    "",
    "Context:",
    workUnit.situation,
    "",
    "Push To do:",
    workUnit.tasks.map((task, index) => `${index + 1}. ${task.label}`).join("\n"),
    "",
    `Impact: ${workUnit.impact}, Urgency: ${workUnit.urgency}, Deadline: ${workUnit.deadline}`,
  ].join("\n")
}

function approvalScope(actionKind: ExternalActionKind): string {
  if (actionKind === "db") return "Single transaction write"
  if (actionKind === "notion") return "Create/update one page"
  if (actionKind === "email") return "Send one outbound email"
  if (actionKind === "slack") return "Post one thread reply"
  return "Create one issue"
}

function rollbackPolicy(actionKind: ExternalActionKind): string {
  if (actionKind === "db") return "Audit row + rollback SQL"
  if (actionKind === "notion") return "Keep previous page version"
  if (actionKind === "email") return "No recall; draft review required"
  if (actionKind === "slack") return "Delete/update message by ts"
  return "Close/edit issue if wrong"
}

function ApprovalField({
  label,
  children,
  compact = false,
}: {
  label: string
  children: ReactNode
  compact?: boolean
}) {
  return (
    <div className={compact ? "" : "mt-4"}>
      <div className="mb-2 text-[13px] font-semibold text-[var(--ai-text-strong)]">{label}</div>
      <div className="rounded-[6px] border border-[var(--ai-border)] bg-black px-3 py-3 text-[12px] text-[var(--ai-text)]">
        {children}
      </div>
    </div>
  )
}
