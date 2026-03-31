import EventCard from "@/components/inbox/EventCard"
import { styles } from "@/styles/layoutStyles"
import type { InboxEvent } from "@/types/inbox"

interface InboxColumnProps {
  events: InboxEvent[]
  selectedEventId: string
  onSelectEvent: (id: string) => void
}

export default function InboxColumn({
  events,
  selectedEventId,
  onSelectEvent,
}: InboxColumnProps) {
  return (
    <section
      style={{ ...styles.column, ...styles.colInbox }}
      className="ai-editor-column ai-editor-column--inbox"
    >
      <div style={styles.colHeader}>
        <span style={styles.colIcon}>◎</span>
        <span style={styles.colTitle}>SIGNAL</span>
        <span style={styles.badge}>{events.length}</span>
      </div>

      <div style={styles.eventList}>
        {events.length === 0 ? (
          <div style={styles.inboxEmpty}>
            <div>
              <div style={styles.emptyStateTitle}>No signals yet</div>
              <div style={styles.emptyStateBody}>
                Start with Gmail connection, then generate your first WorkUnit.
              </div>
              <div style={styles.inboxGuide} aria-label="Getting started">
                <div style={styles.inboxGuideStep}>
                  <span style={styles.inboxGuideNum}>1</span> Connect Gmail
                </div>
                <div style={styles.inboxGuideStep}>
                  <span style={styles.inboxGuideNum}>2</span> Generate first WorkUnit
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
            />
          ))
        )}
      </div>
    </section>
  )
}
