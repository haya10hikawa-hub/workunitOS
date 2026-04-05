import { styles } from "@/styles/layoutStyles"
import { colors } from "@/styles/theme"
import type { InboxEvent, InboxSeverity } from "@/types/inbox"
import type { AppLanguage } from "@/types/ui"

interface EventCardProps {
  event: InboxEvent
  selected: boolean
  onSelect: (id: string) => void
  language: AppLanguage
}

const severityColorMap = {
  critical: "#FF6A6A",
  high: "#FFB454",
  medium: colors.accent,
} as const

const severityLabelMap: Record<AppLanguage, Record<InboxSeverity, string>> = {
  en: {
    critical: "Blocker",
    high: "Risk",
    medium: "Info",
  },
  ja: {
    critical: "重要",
    high: "注意",
    medium: "情報",
  },
}

export default function EventCard({
  event,
  selected,
  onSelect,
  language,
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
        {severityLabelMap[language][event.severity]}
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
