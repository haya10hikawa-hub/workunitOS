import { statusColors } from "@/lib/constants"
import { calcROI } from "@/lib/roi"
import { styles } from "@/styles/layoutStyles"
import { colors } from "@/styles/theme"
import type { WorkUnit } from "@/types/workunit"

interface Props {
  wu: WorkUnit
  selected: boolean
  onSelect: (id: string) => void
}

export default function WorkUnitCard({
  wu,
  selected,
  onSelect,
}: Props) {
  const roi = calcROI(wu)
  const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
  const toPct = (value: number) => `${Math.round(clamp01(value) * 100)}%`

  const impactPct = toPct(wu.impact / 10)
  const urgencyPct = toPct(wu.urgency / 10)
  const effortPct = toPct((10 - wu.effort) / 10)

  return (
    <button
      type="button"
      onClick={() => onSelect(wu.id)}
      style={{
        ...styles.wuCard,
        ...(selected ? styles.wuCardSelected : {}),
      }}
    >
      <div style={styles.wuRoi}>
        <span style={styles.wuRoiNum}>{roi.toFixed(0)}</span>
        <span style={styles.wuRoiLabel}>ROI</span>
        <span style={styles.wuRank}>#{wu.rank}</span>
        <div style={styles.wuRoiMini} aria-label="ROI breakdown">
          <div style={styles.wuRoiMiniBars}>
            <div style={styles.wuMiniBar} title={`Impact ${wu.impact}`}>
              <div style={{ ...styles.wuMiniFill, width: impactPct }} />
            </div>
            <div style={styles.wuMiniBar} title={`Urgency ${wu.urgency}`}>
              <div style={{ ...styles.wuMiniFill, width: urgencyPct }} />
            </div>
            <div style={styles.wuMiniBar} title={`Effort ${wu.effort}`}>
              <div
                style={{
                  ...styles.wuMiniFill,
                  width: effortPct,
                  background: `color-mix(in srgb, ${colors.textMuted} 70%, ${colors.accent})`,
                }}
              />
            </div>
          </div>
          <div style={styles.wuRoiMiniText}>
            I{wu.impact}×U{wu.urgency}÷E{wu.effort}
          </div>
        </div>
      </div>

      <div style={styles.wuInfo}>
        <div style={styles.wuTitleRow}>
          <span style={styles.wuTitle}>{wu.title}</span>
          <span
            style={{
              ...styles.wuStatus,
              color: statusColors[wu.status],
              borderColor: statusColors[wu.status],
              background: `${statusColors[wu.status]}14`,
            }}
          >
            {wu.status}
          </span>
        </div>

        <div style={styles.wuProblem}>{wu.problem}</div>

        <div style={styles.wuMeta}>
          <span>{wu.deadline}</span>
          <span>{wu.actors.length} actors</span>
          <span>{wu.tasks.filter((task) => task.done).length}/{wu.tasks.length} tasks</span>
        </div>
      </div>
    </button>
  )
}
