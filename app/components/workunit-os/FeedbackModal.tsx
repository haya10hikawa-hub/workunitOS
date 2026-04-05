import { useMemo, useState } from "react"

type FeedbackReason =
  | "impact"
  | "deadline"
  | "actors"
  | "effort"
  | "irrelevant"
  | "other"

export function FeedbackModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (payload: { reason: FeedbackReason; details: string }) => void
}) {
  const [reason, setReason] = useState<FeedbackReason | null>(null)
  const [details, setDetails] = useState("")

  const options = useMemo(
    () =>
      [
        { id: "impact", label: "Impact is incorrect" },
        { id: "deadline", label: "Deadline is incorrect" },
        { id: "actors", label: "Wrong people involved" },
        { id: "effort", label: "Effort is underestimated/overestimated" },
        { id: "irrelevant", label: "Not important / irrelevant" },
        { id: "other", label: "Something else" },
      ] as const,
    []
  )

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[10000] bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-[520px] border border-[var(--ai-border-2)] bg-[var(--ai-surface)] p-4">
        <div className="text-[13px] font-semibold text-[var(--ai-text-strong)]">
          Why is this wrong?
        </div>

        <div className="mt-3 grid gap-2">
          {options.map((opt) => {
            const active = opt.id === reason
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setReason(opt.id)}
                className={[
                  "w-full text-left",
                  "px-3 py-2",
                  "border",
                  active
                    ? "border-[var(--ai-accent)] bg-[var(--ai-success-bg)]"
                    : "border-[var(--ai-border)] bg-[var(--ai-panel)]",
                  "hover:border-[var(--ai-border-2)]",
                ].join(" ")}
              >
                <div className="flex items-center gap-3">
                  <div className="w-4 text-[var(--ai-text-muted)]">
                    {active ? "●" : "○"}
                  </div>
                  <div className="text-[12px] text-[var(--ai-text)]">{opt.label}</div>
                </div>
              </button>
            )
          })}
        </div>

        <div className="mt-4">
          <div className="text-[10px] tracking-[0.18em] text-[var(--ai-text-muted)]">
            ADD DETAILS (OPTIONAL)
          </div>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            className={[
              "mt-2 w-full min-h-[90px]",
              "border border-[var(--ai-border)] bg-[var(--ai-panel)]",
              "px-3 py-2 text-[12px] leading-relaxed text-[var(--ai-text)]",
              "focus:outline-none focus:ring-1 focus:ring-[var(--ai-accent)]",
              "resize-none",
            ].join(" ")}
          />
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setReason(null)
              setDetails("")
              onClose()
            }}
            className="px-3 py-2 text-[10px] tracking-[0.18em] border border-[var(--ai-border-2)] text-[var(--ai-text-muted)]"
          >
            CANCEL
          </button>
          <button
            type="button"
            disabled={!reason}
            onClick={() => {
              if (!reason) return
              onSubmit({ reason, details })
              setReason(null)
              setDetails("")
              onClose()
            }}
            className={[
              "px-3 py-2 text-[10px] tracking-[0.18em] border",
              reason
                ? "border-[var(--ai-accent-border)] text-[var(--ai-accent)]"
                : "border-[var(--ai-border-2)] text-[var(--ai-text-faint)] opacity-60 cursor-not-allowed",
            ].join(" ")}
          >
            SUBMIT
          </button>
        </div>
      </div>
    </div>
  )
}

