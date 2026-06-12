/**
 * Calendar Normalized Event Types
 *
 * Safe, normalized Calendar-like input types for WorkUnit Inbox.
 * These are NOT raw Calendar API responses.
 */

// ─── Event Types ────────────────────────────────────────────────

export type CalendarNormalizedEventType =
  | "deadline_approaching"
  | "meeting_preparation_needed"

// ─── Event ─────────────────────────────────────────────────────

export type CalendarNormalizedEvent = {
  id: string
  tenantId: string
  eventType: CalendarNormalizedEventType
  title: string
  summary: string
  calendarName?: string
  url?: string
  actor?: string
  assignee?: string
  dueAt: string
  updatedAt: string
}
