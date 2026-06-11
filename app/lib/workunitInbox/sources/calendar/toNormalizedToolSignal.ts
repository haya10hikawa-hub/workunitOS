/**
 * Calendar Event → NormalizedToolSignal Mapper
 */

import type { NormalizedToolSignal } from "../../types.ts"
import type { CalendarNormalizedEvent } from "./types.ts"

const ONE_DAY_MS = 86400_000

// ─── Single Event ───────────────────────────────────────────────

export function calendarEventToNormalizedToolSignal(
  event: CalendarNormalizedEvent,
): NormalizedToolSignal {
  const priorityHint = defaultPriority(event)

  return {
    id: `signal:${event.id}`,
    tenantId: event.tenantId,
    provider: "calendar",
    signalType: "calendar_deadline",
    title: event.title,
    summary: event.summary,
    sourceUrl: event.url,
    actor: event.actor,
    assignee: event.assignee,
    priorityHint,
    createdAt: event.updatedAt,
    updatedAt: event.updatedAt,
    dueAt: event.dueAt,
  }
}

// ─── Batch ──────────────────────────────────────────────────────

export function calendarEventsToNormalizedToolSignals(
  events: CalendarNormalizedEvent[],
): NormalizedToolSignal[] {
  return events.map(calendarEventToNormalizedToolSignal)
}

// ─── Helpers ────────────────────────────────────────────────────

function defaultPriority(
  event: CalendarNormalizedEvent,
): NormalizedToolSignal["priorityHint"] {
  // High priority if due within 2 days
  const dueMs = new Date(event.dueAt).getTime()
  const nowMs = Date.now()
  if (dueMs - nowMs < 2 * ONE_DAY_MS) return "high"
  return "medium"
}
