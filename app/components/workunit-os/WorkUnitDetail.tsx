import { useMemo, useState } from "react"
import { ROIIndicator } from "@/components/workunit-os/ROIIndicator"
import type { ReactNode } from "react"
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
      <section className="flex h-full flex-col rounded-[8px] border border-[var(--ai-border)] bg-[var(--ai-surface)]">
        <div className="border-b border-[var(--ai-divider)] px-5 py-4">
          <div className="text-[12px] font-bold tracking-[0.14em] text-[var(--ai-text-strong)]">FOCUS WORKUNIT DETAIL</div>
          <div className="mt-1 text-[11px] text-[var(--ai-text-muted)]">Select a WorkUnit</div>
        </div>
        <div className="grid flex-1 place-items-center text-[12px] text-[var(--ai-text-muted)]">
          One WorkUnit at a time.
        </div>
      </section>
    )
  }

  const inputBase =
    "w-full rounded-[6px] border border-[var(--ai-border)] bg-black px-3 py-2 text-[12px] text-[var(--ai-text-strong)] focus:outline-none focus:ring-1 focus:ring-[var(--ai-accent)]"

  const toggleTask = (taskId: string) => {
    onUpdate(workUnit.id, {
      tasks: workUnit.tasks.map((task) => (task.id === taskId ? { ...task, done: !task.done } : task)),
    })
  }

  return (
    <section className="flex h-full min-h-0 flex-col rounded-[8px] border border-[var(--ai-border)] bg-[linear-gradient(180deg,var(--ai-surface),#090909)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_14px_40px_rgba(0,0,0,0.35)]">
      <div className="border-b border-[var(--ai-divider)] px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-bold text-[var(--ai-text-strong)]">
              FOCUS: {workUnit.title}
            </div>
            <div className="mt-1 text-[11px] tracking-[0.12em] text-[var(--ai-text-muted)]">SOURCE → JUDGE → PUSH TODO → EXECUTE</div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setEditing((p) => !p)}
              className="rounded-[6px] border border-[var(--ai-border-2)] bg-black px-3 py-2 text-[11px] font-semibold text-[var(--ai-text-muted)] hover:text-[var(--ai-text-strong)]"
            >
              {editing ? "DONE" : "EDIT"}
            </button>
            <button
              type="button"
              onClick={() => onDefer(workUnit.id)}
              className="rounded-[6px] border border-[var(--ai-border-2)] bg-black px-3 py-2 text-[11px] font-semibold text-[var(--ai-text-muted)] hover:text-[var(--ai-text-strong)]"
            >
              DEFER
            </button>
            <button
              type="button"
              onClick={() => onMarkDone(workUnit.id)}
              className="rounded-[6px] border border-[var(--ai-accent-border)] bg-[var(--ai-accent-surface)] px-3 py-2 text-[11px] font-bold text-[var(--ai-accent)] hover:bg-[var(--ai-success-bg-2)]"
            >
              MARK AS DONE
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-5">
        <div className="grid grid-cols-[minmax(0,1fr)_220px] gap-4">
          <Panel title="BASIC INFO">
            <div className="grid gap-3">
              <DetailBlock label="SITUATION">
                {editing ? (
                  <textarea
                    value={workUnit.situation}
                    onChange={(e) => onUpdate(workUnit.id, { situation: e.target.value })}
                    className={[inputBase, "min-h-[66px] resize-none leading-relaxed"].join(" ")}
                  />
                ) : (
                  <ReadValue>{workUnit.situation}</ReadValue>
                )}
              </DetailBlock>

              <DetailBlock label="PROBLEM">
                {editing ? (
                  <input
                    value={workUnit.problem}
                    onChange={(e) => onUpdate(workUnit.id, { problem: e.target.value })}
                    className={inputBase}
                  />
                ) : (
                  <ReadValue>{workUnit.problem}</ReadValue>
                )}
              </DetailBlock>

              <div className="grid grid-cols-2 gap-3">
                <DetailBlock label="ACTORS">
                  {editing ? (
                    <input
                      defaultValue={actorText}
                      onBlur={(e) => onUpdate(workUnit.id, { actors: parseActorList(e.target.value) })}
                      className={inputBase}
                    />
                  ) : (
                    <ReadValue>{workUnit.actors.join(", ")}</ReadValue>
                  )}
                </DetailBlock>
                <DetailBlock label="DEADLINE">
                  {editing ? (
                    <input
                      value={workUnit.deadline}
                      onChange={(e) => onUpdate(workUnit.id, { deadline: e.target.value })}
                      className={inputBase}
                    />
                  ) : (
                    <ReadValue>{workUnit.deadline}</ReadValue>
                  )}
                </DetailBlock>
              </div>
            </div>
          </Panel>

          <Panel title="ROI">
            <ROIIndicator workUnit={workUnit} />
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                ["IMPACT", workUnit.impact],
                ["URGENCY", workUnit.urgency],
                ["ACTOR", workUnit.actorWeight],
                ["EFFORT", workUnit.effort],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[6px] border border-[var(--ai-border)] bg-black p-2">
                  <div className="text-[9px] tracking-[0.14em] text-[var(--ai-text-muted)]">{label}</div>
                  <div className="mt-1 text-[18px] font-semibold text-[var(--ai-text-strong)]">{value}</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <Panel title="DECOMPOSED TO DO LIST / PUSH" className="mt-4">
          <div className="grid gap-2">
            {workUnit.tasks.map((task, index) => (
              <button
                key={task.id}
                type="button"
                onClick={() => toggleTask(task.id)}
                className={[
                  "flex w-full items-start gap-3 rounded-[6px] border px-3 py-3 text-left",
                  task.done
                    ? "border-[var(--ai-accent-border)] bg-[var(--ai-success-bg)]"
                    : "border-[var(--ai-border)] bg-black",
                ].join(" ")}
              >
                <span
                  className={[
                    "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-[4px] border text-[11px]",
                    task.done
                      ? "border-[var(--ai-accent)] text-[var(--ai-accent)]"
                      : "border-[var(--ai-border-2)] text-[var(--ai-text-faint)]",
                  ].join(" ")}
                >
                  {task.done ? "✓" : index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-semibold text-[var(--ai-text-strong)]">{task.label}</span>
                  <span className="mt-1 block text-[10px] tracking-[0.12em] text-[var(--ai-text-muted)]">
                    PUSH CANDIDATE · OWNER {workUnit.actors[index % Math.max(1, workUnit.actors.length)] ?? "PM"} · {workUnit.deadline}
                  </span>
                </span>
              </button>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between rounded-[6px] border border-[var(--ai-border)] bg-black px-3 py-3">
            <div>
              <div className="text-[11px] font-semibold text-[var(--ai-text-strong)]">Push readiness</div>
              <div className="mt-1 text-[10px] text-[var(--ai-text-muted)]">Ready when all required owners and execution targets are clear.</div>
            </div>
            <button
              type="button"
              onClick={onThisIsWrong}
              className="rounded-[6px] border border-[var(--ai-accent-border)] px-3 py-2 text-[11px] font-semibold text-[var(--ai-accent)] hover:bg-[var(--ai-accent-surface)]"
            >
              THIS IS WRONG
            </button>
          </div>
        </Panel>
      </div>
    </section>
  )
}

function Panel({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={["rounded-[8px] border border-[var(--ai-border)] bg-[var(--ai-panel)] p-4", className].join(" ")}>
      <div className="mb-3 text-[10px] font-bold tracking-[0.18em] text-[var(--ai-text-muted)]">{title}</div>
      {children}
    </div>
  )
}

function DetailBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <div className="text-[10px] font-semibold tracking-[0.16em] text-[var(--ai-text-muted)]">{label}</div>
      {children}
    </div>
  )
}

function ReadValue({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[6px] border border-[var(--ai-border)] bg-black px-3 py-3 text-[12px] leading-relaxed text-[var(--ai-text)]">
      {children}
    </div>
  )
}
