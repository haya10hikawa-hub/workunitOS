import { styles } from "@/styles/layoutStyles"
import type { InboxEvent } from "@/types/inbox"

interface SignalColumnProps {
  signals: InboxEvent[]
  selectedSignalId: string | null
  onSelectSignal: (id: string) => void
}

export function SignalColumn({
  signals,
  selectedSignalId,
  onSelectSignal,
}: SignalColumnProps) {
  const visibleSignals = signals.slice(0, 10)

  return (
    <section
      style={{ ...styles.column, ...styles.colInbox }}
      aria-label="Signal stream"
    >
      <div style={styles.colHeader}>
        <span style={styles.colIcon}>◎</span>
        <span style={styles.colTitle}>SIGNAL</span>
        <span style={styles.colSubtitle}>INPUT STREAM</span>
      </div>

      <div style={styles.eventList}>
        {visibleSignals.map((signal) => {
          const selected = signal.id === selectedSignalId
          const severityColor =
            signal.severity === "critical"
              ? "#FF6A6A"
              : signal.severity === "high"
                ? "#FFB454"
                : "#4DA3FF"

          return (
            <button
              key={signal.id}
              type="button"
              onClick={() => onSelectSignal(signal.id)}
              style={{
                ...styles.eventCard,
                ...(selected ? styles.eventCardActive : {}),
                padding: "8px 9px",
              }}
            >
              <span style={styles.eventIcon}>{signal.icon}</span>
              <div style={styles.eventBody}>
                <div style={styles.eventSignal}>{signal.signal}</div>
                <div style={styles.eventMeta}>
                  <span style={styles.eventSource}>{signal.source}</span>
                  <span style={styles.eventTime}>{signal.time}</span>
                </div>
              </div>
              <span
                style={{
                  ...styles.eventBadge,
                  borderColor: severityColor,
                  color: severityColor,
                }}
              >
                {signal.severity.toUpperCase()}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

