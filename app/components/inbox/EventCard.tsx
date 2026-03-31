import { styles } from "@/styles/layoutStyles"
import { colors } from "@/styles/theme"
import type { InboxEvent } from "@/types/inbox"

interface EventCardProps {
  event: InboxEvent
  selected: boolean
  onSelect: (id: string) => void
}

const severityColorMap = {
  critical: "#FF6A6A",
  high: "#FFB454",
  medium: colors.accent,
} as const

const severityLabelMap = {
  critical: "Blocker",
  high: "Risk",
  medium: "Info",
} as const

export default function EventCard({
  event,
  selected,
  onSelect,
}: EventCardProps) {
  const badgeColor = severityColorMap[event.severity]

  return (
    <button
      type="button"
      onClick={() => onSelect(event.id)}
      style={{
        ...styles.eventCard,
        ...(selected ? styles.eventCardActive : {}),
      }}
    >
      <span
        style={{
          ...styles.eventBadge,
          color: badgeColor,
          borderColor: badgeColor,
          background: `color-mix(in srgb, ${badgeColor} 12%, transparent)`,
        }}
      >
        {severityLabelMap[event.severity]}
      </span>

      <div style={styles.eventBody}>
        <div style={styles.eventSignal}>{event.signal}</div>
        <div style={styles.eventMeta}>
          <span style={styles.eventSource}>{event.source}</span>
          <span style={styles.eventTime}>{event.time}</span>
        </div>
      </div>
    </button>
  )
}
