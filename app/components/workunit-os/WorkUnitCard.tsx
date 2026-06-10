import { calcROI } from "@/lib/roi"
import type { WorkUnit, WorkUnitPriority } from "@/types/workunit"

function priorityStyles(priority: WorkUnitPriority | undefined) {
  if (priority === "Critical") {
    return "border-[#FFB454]/40 bg-[#2a1f12] text-[#FFB454]"
  }
  if (priority === "High") {
    return "border-[#FFB454]/35 bg-[#20180f] text-[#FFB454]"
  }
  return "border-[var(--ai-border-2)] bg-[var(--ai-panel)] text-[var(--ai-text-muted)]"
}

function sourceIcon(source: string | undefined) {
  const value = (source ?? "").toLowerCase()
  if (value.includes("slack")) return "S"
  if (value.includes("email") || value.includes("gmail")) return "M"
  if (value.includes("calendar")) return "C"
  if (value.includes("jira")) return "J"
  if (value.includes("github")) return "G"
  return "W"
}

export function WorkUnitCard({
  workUnit,
  selected,
  onSelect,
  variant,
}: {
  workUnit: WorkUnit
  selected: boolean
  onSelect: (id: string) => void
  variant: "inbox" | "queue"
}) {
  const roi = calcROI(workUnit)
  const source = workUnit.inboxSource ?? "Source"

  return (
    <button
      type="button"
      onClick={() => onSelect(workUnit.id)}
      className={[
        "w-full text-left",
        "rounded-[8px] border px-3 py-3",
        "bg-[linear-gradient(180deg,var(--ai-panel),#0c0c0c)]",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_10px_24px_rgba(0,0,0,0.28)]",
        selected ? "border-[var(--ai-accent)] ring-1 ring-[var(--ai-accent)]/25" : "border-[var(--ai-border)]",
        "hover:border-[var(--ai-accent)]/45",
        "focus:outline-none focus:ring-2 focus:ring-[var(--ai-accent)]/40",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {variant === "inbox" ? (
            <div className="mb-2 flex items-center justify-between gap-2 text-[10px] text-[var(--ai-text-muted)]">
              <div className="flex min-w-0 items-center gap-2">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-[5px] border border-[var(--ai-border-2)] bg-black text-[10px] font-bold text-[var(--ai-accent)]">
                  {sourceIcon(source)}
                </span>
                <span className="rounded-[5px] border border-[var(--ai-border-2)] bg-[var(--ai-panel-2)] px-1.5 py-0.5 text-[10px] text-[var(--ai-text-strong)]">
                  New
                </span>
              </div>
              <span className="shrink-0 tabular-nums">{workUnit.receivedAt?.slice(-5) ?? "12:45"}</span>
            </div>
          ) : null}

          <div className="line-clamp-2 text-[14px] font-semibold leading-snug text-[var(--ai-text-strong)]">
            {variant === "inbox" ? workUnit.title : workUnit.problem}
          </div>
          <div className="mt-1.5 flex items-center gap-2 text-[12px] leading-snug text-[var(--ai-text)]">
            {variant === "inbox" ? (
              <span className="line-clamp-2">{workUnit.problem}</span>
            ) : (
              <span className="truncate">{workUnit.title}</span>
            )}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-[18px] font-semibold tabular-nums leading-none text-[var(--ai-accent)]">
            {roi.toFixed(1)}
          </div>
          <div className="mt-1 text-[10px] text-[var(--ai-text-muted)]">
            ROI
          </div>
        </div>
      </div>

      {variant === "inbox" ? (
        <div className="mt-3 flex items-center justify-between">
          <span
            className={[
              "inline-flex items-center",
              "rounded-[5px] border px-2 py-1",
              "text-[10px] font-semibold",
              priorityStyles(workUnit.priority),
            ].join(" ")}
          >
            {(workUnit.priority ?? "Normal").toUpperCase()}
          </span>
          <span className="text-[10px] text-[var(--ai-text-muted)]">
            {workUnit.status}
          </span>
        </div>
      ) : null}
    </button>
  )
}
