import { useMemo, useState } from "react"
import { ROIIndicator } from "@/components/workunit-os/ROIIndicator"
import type { WorkUnit } from "@/types/workunit"

function parseActorList(value: string) {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

export function WorkUnitDetail({
  workUnit,
  onUpdate,
  onMarkDone,
  onDefer,
  onThisIsWrong,
}: {
  workUnit: WorkUnit | null
  onUpdate: (id: string, patch: Partial<WorkUnit>) => void
  onMarkDone: (id: string) => void
  onDefer: (id: string) => void
  onThisIsWrong: () => void
}) {
  const [editing, setEditing] = useState(false)

  const actorText = useMemo(() => (workUnit ? workUnit.actors.join(", ") : ""), [workUnit])

  if (!workUnit) {
    return (
      <section className="h-full bg-[var(--ai-bg)] flex flex-col">
        <div className="sticky top-0 z-10 border-b border-[var(--ai-divider)] bg-[var(--ai-surface)] px-4 py-3">
          <div className="text-[11px] tracking-[0.22em] text-[var(--ai-text-strong)]">
            FOCUS
          </div>
          <div className="mt-1 text-[10px] tracking-[0.18em] text-[var(--ai-text-muted)]">
            SELECT A WORKUNIT
          </div>
        </div>
        <div className="flex-1 grid place-items-center text-[12px] text-[var(--ai-text-muted)]">
          One WorkUnit at a time.
        </div>
      </section>
    )
  }

  const inputBase =
    "w-full border border-[var(--ai-border)] bg-[var(--ai-panel)] px-3 py-2 text-[12px] text-[var(--ai-text)] focus:outline-none focus:ring-1 focus:ring-[var(--ai-accent)]"

  const label = "text-[10px] tracking-[0.18em] text-[var(--ai-text-muted)]"

  return (
    <section className="h-full bg-[var(--ai-bg)] flex flex-col">
      <div className="sticky top-0 z-10 border-b border-[var(--ai-divider)] bg-[var(--ai-surface)] px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] tracking-[0.22em] text-[var(--ai-text-strong)]">
              FOCUS
            </div>
            <div className="mt-2 text-[14px] font-semibold text-[var(--ai-text-strong)] truncate">
              {workUnit.title}
            </div>
          </div>

          <div className="shrink-0 text-right">
            <ROIIndicator workUnit={workUnit} />
            <div className="mt-2 text-[9px] tracking-[0.18em] text-[var(--ai-text-faint)]">
              IMPACT × URGENCY × ACTOR ÷ EFFORT
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setEditing((p) => !p)}
            className="px-3 py-2 text-[10px] tracking-[0.18em] border border-[var(--ai-border-2)] text-[var(--ai-text-muted)]"
          >
            {editing ? "DONE EDITING" : "EDIT"}
          </button>
          <button
            type="button"
            onClick={onThisIsWrong}
            className="px-3 py-2 text-[10px] tracking-[0.18em] border border-[var(--ai-accent-border)] text-[var(--ai-accent)]"
          >
            THIS IS WRONG
          </button>
          <button
            type="button"
            onClick={() => onMarkDone(workUnit.id)}
            className="px-3 py-2 text-[10px] tracking-[0.18em] border border-[var(--ai-border-2)] text-[var(--ai-text-muted)]"
          >
            MARK AS DONE
          </button>
          <button
            type="button"
            onClick={() => onDefer(workUnit.id)}
            className="px-3 py-2 text-[10px] tracking-[0.18em] border border-[var(--ai-border-2)] text-[var(--ai-text-muted)]"
          >
            DEFER
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="grid gap-2">
          <div className={label}>SITUATION</div>
          {editing ? (
            <textarea
              value={workUnit.situation}
              onChange={(e) => onUpdate(workUnit.id, { situation: e.target.value })}
              className={[inputBase, "min-h-[80px] resize-none leading-relaxed"].join(" ")}
            />
          ) : (
            <div className="text-[12px] leading-relaxed text-[var(--ai-text)] bg-[var(--ai-panel)] border border-[var(--ai-border)] p-3">
              {workUnit.situation}
            </div>
          )}
        </div>

        <div className="grid gap-2">
          <div className={label}>PROBLEM</div>
          {editing ? (
            <input
              value={workUnit.problem}
              onChange={(e) => onUpdate(workUnit.id, { problem: e.target.value })}
              className={inputBase}
            />
          ) : (
            <div className="text-[12px] text-[var(--ai-text)] bg-[var(--ai-panel)] border border-[var(--ai-border)] p-3">
              {workUnit.problem}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <div className={label}>ACTORS</div>
            {editing ? (
              <input
                defaultValue={actorText}
                onBlur={(e) => onUpdate(workUnit.id, { actors: parseActorList(e.target.value) })}
                className={inputBase}
              />
            ) : (
              <div className="text-[12px] text-[var(--ai-text)] bg-[var(--ai-panel)] border border-[var(--ai-border)] p-3">
                {workUnit.actors.join(", ")}
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <div className={label}>DEADLINE</div>
            {editing ? (
              <input
                value={workUnit.deadline}
                onChange={(e) => onUpdate(workUnit.id, { deadline: e.target.value })}
                className={inputBase}
              />
            ) : (
              <div className="text-[12px] text-[var(--ai-text)] bg-[var(--ai-panel)] border border-[var(--ai-border)] p-3">
                {workUnit.deadline}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { key: "impact", label: "IMPACT", value: workUnit.impact },
            { key: "urgency", label: "URGENCY", value: workUnit.urgency },
            { key: "actorWeight", label: "ACTOR", value: workUnit.actorWeight },
            { key: "effort", label: "EFFORT", value: workUnit.effort },
          ].map((field) => (
            <div key={field.key} className="border border-[var(--ai-border)] bg-[var(--ai-panel)] p-3">
              <div className="text-[9px] tracking-[0.2em] text-[var(--ai-text-muted)]">
                {field.label}
              </div>
              {editing ? (
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={field.value}
                  onChange={(e) =>
                    onUpdate(workUnit.id, { [field.key]: Number(e.target.value) } as Partial<WorkUnit>)
                  }
                  className={[
                    "mt-2 w-full",
                    "border border-[var(--ai-border-2)] bg-[var(--ai-surface)]",
                    "px-2 py-1 text-[12px] text-[var(--ai-text-strong)]",
                    "focus:outline-none focus:ring-1 focus:ring-[var(--ai-accent)]",
                  ].join(" ")}
                />
              ) : (
                <div className="mt-2 text-[20px] font-semibold tabular-nums text-[var(--ai-text-strong)]">
                  {field.value}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

