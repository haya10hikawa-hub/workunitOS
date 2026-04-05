import { calcROI } from "@/lib/roi"
import { styles } from "@/styles/layoutStyles"
import type { WorkUnit } from "@/types/workunit"

interface DecisionColumnProps {
  workUnits: WorkUnit[]
  selectedWorkUnitId: string | null
  onSelectWorkUnit: (id: string) => void
}

export function DecisionColumn({
  workUnits,
  selectedWorkUnitId,
  onSelectWorkUnit,
}: DecisionColumnProps) {
  const ranked = workUnits
    .slice()
    .sort((left, right) => calcROI(right) - calcROI(left) || left.rank - right.rank)

  return (
    <section
      style={{ ...styles.column, ...styles.colPriority }}
      aria-label="Decision board"
    >
      <div style={styles.colHeader}>
        <span style={styles.colIcon}>▤</span>
        <span style={styles.colTitle}>DECISION</span>
        <span style={styles.colSubtitle}>RANKED WORKUNITS</span>
      </div>

      <div style={styles.wuList}>
        {ranked.map((wu, index) => {
          const selected = wu.id === selectedWorkUnitId
          const roi = calcROI(wu)
          const isTopThree = index < 3

          return (
            <button
              key={wu.id}
              type="button"
              onClick={() => onSelectWorkUnit(wu.id)}
              style={{
                ...styles.wuCard,
                ...(selected ? styles.wuCardSelected : {}),
                ...(isTopThree
                  ? {
                      borderColor: "#FFB454",
                    }
                  : {}),
              }}
            >
              <div style={styles.wuRoi}>
                <div style={styles.wuRoiNum}>{roi.toFixed(1)}</div>
                <div style={styles.wuRoiLabel}>ROI</div>
                <div style={styles.wuRank}>#{index + 1}</div>
              </div>
              <div style={styles.wuInfo}>
                <div style={styles.wuTitleRow}>
                  <div style={styles.wuTitle}>{wu.title}</div>
                  <span style={styles.wuStatus}>{wu.status}</span>
                </div>
                <div
                  style={{
                    ...styles.wuProblem,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {wu.problem}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

