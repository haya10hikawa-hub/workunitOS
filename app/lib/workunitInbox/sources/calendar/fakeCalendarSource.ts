/**
 * Fake Calendar Source
 *
 * Returns CalendarNormalizedEvent fixtures.
 * No network calls. No tokens. No real Calendar API.
 */

import type { CalendarNormalizedEvent } from "./types.ts"

const NOW = new Date("2026-07-01T10:00:00Z")

export async function fetchFakeCalendarNormalizedEvents(input: {
  tenantId: string
}): Promise<CalendarNormalizedEvent[]> {
  return [
    {
      id: "cal:evt:deadline:1",
      tenantId: input.tenantId,
      eventType: "deadline_approaching",
      title: "Quarterly review presentation",
      summary: "Your quarterly review presentation is due in 2 days.",
      calendarName: "Work",
      dueAt: new Date(NOW.getTime() + 2 * 86400_000).toISOString(),
      updatedAt: NOW.toISOString(),
    },
    {
      id: "cal:evt:meeting:1",
      tenantId: input.tenantId,
      eventType: "meeting_preparation_needed",
      title: "Sprint planning — prepare backlog items",
      summary: "You have sprint planning tomorrow. Backlog needs grooming.",
      calendarName: "Work",
      actor: "alice",
      dueAt: new Date(NOW.getTime() + 86400_000).toISOString(),
      updatedAt: NOW.toISOString(),
    },
  ]
}
