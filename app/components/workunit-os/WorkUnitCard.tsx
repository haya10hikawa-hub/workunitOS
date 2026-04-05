import { calcROI } from "@/lib/roi"
import type { WorkUnit, WorkUnitPriority } from "@/types/workunit"

function priorityStyles(priority: WorkUnitPriority | undefined) {
  if (priority === "Critical") {
    return "border-[var(--ai-danger)] text-[var(--ai-danger)]"
  }
  if (priority === "High") {
    return "border-[#FFB454] text-[#FFB454]"
  }
  return "border-[var(--ai-border-2)] text-[var(--ai-text-muted)]"
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

  return (
    <button
      type="button"
      onClick={() => onSelect(workUnit.id)}
      className={[
        "w-full text-left",
        "px-3 py-2",
        "bg-[var(--ai-panel)]",
        "border",
        selected ? "border-[var(--ai-accent)]" : "border-[var(--ai-border)]",
        "hover:border-[var(--ai-border-2)]",
        "focus:outline-none focus:ring-1 focus:ring-[var(--ai-accent)]",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[12px] text-[var(--ai-text-strong)] font-semibold truncate">
            {workUnit.problem}
          </div>
          <div className="mt-1 flex items-center gap-2 text-[10px] text-[var(--ai-text-muted)]">
            {variant === "inbox" ? (
              <>
                <span className="truncate">{workUnit.inboxSource ?? "Source"}</span>
                <span className="text-[var(--ai-text-faint)]">·</span>
                <span className="shrink-0">{workUnit.receivedAt ?? "—"}</span>
              </>
            ) : (
              <>
                <span className="truncate">{workUnit.title}</span>
                <span className="text-[var(--ai-text-faint)]">·</span>
                <span className="shrink-0">{workUnit.status}</span>
              </>
            )}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-[16px] font-semibold tabular-nums text-[var(--ai-accent)] leading-none">
            {roi.toFixed(1)}
          </div>
          <div className="mt-1 text-[9px] tracking-[0.2em] text-[var(--ai-text-faint)]">
            ROI
          </div>
        </div>
      </div>

      {variant === "inbox" ? (
        <div className="mt-2 flex items-center justify-between">
          <span
            className={[
              "inline-flex items-center",
              "px-2 py-[2px]",
              "text-[9px] font-semibold tracking-[0.12em]",
              "border",
              priorityStyles(workUnit.priority),
            ].join(" ")}
          >
            {(workUnit.priority ?? "Normal").toUpperCase()}
          </span>
          <span className="text-[9px] text-[var(--ai-text-faint)]">
            {workUnit.status}
          </span>
        </div>
      ) : null}
    </button>
  )
}

