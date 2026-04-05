import EventCard from "@/components/inbox/EventCard"
import { styles } from "@/styles/layoutStyles"
import { colors } from "@/styles/theme"
import type { InboxEvent } from "@/types/inbox"
import type { AppLanguage } from "@/types/ui"

interface InboxColumnProps {
  events: InboxEvent[]
  selectedEventId: string
  onSelectEvent: (id: string) => void
  onRefreshSignals: () => void
  refreshing: boolean
  refreshStatus: "idle" | "success" | "error"
  language: AppLanguage
}

export default function InboxColumn({
  events,
  selectedEventId,
  onSelectEvent,
  onRefreshSignals,
  refreshing,
  refreshStatus,
  language,
}: InboxColumnProps) {
  const copy =
    language === "ja"
      ? {
          signal: "シグナル",
          emptyTitle: "シグナルがありません",
          emptyBody:
            "まず Gmail を接続し、最初の WorkUnit を生成してください。",
          step1: "Gmail を接続",
          step2: "最初の WorkUnit を生成",
          refresh: "再読み込み",
          syncing: "送信中",
          syncSuccess: "n8n 連携成功",
          syncError: "n8n 連携失敗",
        }
      : {
          signal: "SIGNAL",
          emptyTitle: "No signals yet",
          emptyBody:
            "Start with Gmail connection, then generate your first WorkUnit.",
          step1: "Connect Gmail",
          step2: "Generate first WorkUnit",
          refresh: "Reload",
          syncing: "Sending",
          syncSuccess: "n8n synced",
          syncError: "n8n failed",
        }

  const refreshTitle =
    refreshStatus === "success"
      ? copy.syncSuccess
      : refreshStatus === "error"
        ? copy.syncError
        : refreshing
          ? copy.syncing
          : copy.refresh

  return (
    <section
      style={{ ...styles.column, ...styles.colInbox }}
      className="ai-editor-column ai-editor-column--inbox"
    >
      <div style={styles.colHeader}>
        <span style={styles.colIcon}>◎</span>
        <span style={styles.colTitle}>{copy.signal}</span>
        <button
          type="button"
          onClick={onRefreshSignals}
          disabled={refreshing}
          aria-label={copy.refresh}
          title={refreshTitle}
          style={{
            ...styles.colHeaderAction,
            marginLeft: "auto",
            ...(refreshing ? { cursor: "progress", opacity: 0.65 } : {}),
            ...(refreshStatus === "success"
              ? { color: colors.accent, borderColor: colors.accentBorder }
              : {}),
            ...(refreshStatus === "error"
              ? { color: colors.danger, borderColor: colors.danger }
              : {}),
          }}
        >
          {refreshing ? "⟳" : "↻"}
        </button>
        <span style={{ ...styles.badge, marginLeft: "6px" }}>{events.length}</span>
      </div>

      <div style={styles.eventList}>
        {events.length === 0 ? (
          <div style={styles.inboxEmpty}>
            <div>
              <div style={styles.emptyStateTitle}>{copy.emptyTitle}</div>
              <div style={styles.emptyStateBody}>{copy.emptyBody}</div>
              <div style={styles.inboxGuide} aria-label="Getting started">
                <div style={styles.inboxGuideStep}>
                  <span style={styles.inboxGuideNum}>1</span> {copy.step1}
                </div>
                <div style={styles.inboxGuideStep}>
                  <span style={styles.inboxGuideNum}>2</span> {copy.step2}
                </div>
              </div>
            </div>
          </div>
        ) : (
          events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              selected={event.id === selectedEventId}
              onSelect={onSelectEvent}
              language={language}
            />
          ))
        )}
      </div>
    </section>
  )
}
