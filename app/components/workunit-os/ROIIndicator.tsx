import { calcROI } from "@/lib/roi"
import type { WorkUnit } from "@/types/workunit"

export function ROIIndicator({ workUnit }: { workUnit: WorkUnit }) {
  const roi = calcROI(workUnit)

  return (
    <div className="flex items-baseline gap-3">
      <div className="text-[44px] leading-none font-semibold tracking-tight text-[var(--ai-accent)] tabular-nums">
        {roi.toFixed(1)}
      </div>
      <div className="text-[11px] tracking-[0.2em] text-[var(--ai-text-muted)]">
        ROI
      </div>
    </div>
  )
}

