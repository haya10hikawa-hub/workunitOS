import { NextResponse } from "next/server"
import { requireSession } from "../../../lib/security/session.ts"
import { safeError } from "../../../lib/security/safeErrors.ts"
import { MOCK_SIGNALS } from "../../../lib/workunitInbox/mockSignals.ts"
import { transformSignalsToInboxWorkUnits } from "../../../lib/workunitInbox/transform.ts"
import { resolveGitHubClient } from "../../../lib/workunitInbox/sources/github/resolveGitHubSource.ts"
import { githubEventsToNormalizedToolSignals } from "../../../lib/workunitInbox/sources/github/toNormalizedToolSignal.ts"
import { fetchFakeSlackNormalizedEvents } from "../../../lib/workunitInbox/sources/slack/fakeSlackSource.ts"
import { slackEventsToNormalizedToolSignals } from "../../../lib/workunitInbox/sources/slack/toNormalizedToolSignal.ts"
import { fetchFakeCalendarNormalizedEvents } from "../../../lib/workunitInbox/sources/calendar/fakeCalendarSource.ts"
import { calendarEventsToNormalizedToolSignals } from "../../../lib/workunitInbox/sources/calendar/toNormalizedToolSignal.ts"
import type { NormalizedToolSignal } from "../../../lib/workunitInbox/types.ts"

const VALID_SOURCES = new Set(["mock", "github", "slack", "calendar", "all"])

// ─── GET /api/workunit/inbox ────────────────────────────────────

export async function GET(request: Request): Promise<NextResponse> {
  const sessionResult = requireSession(request)
  if (!sessionResult.ok) {
    return NextResponse.json(
      safeError("inbox-na", "unauthorized" as Parameters<typeof safeError>[1]),
      { status: 401 },
    )
  }

  const tenantId = sessionResult.session.tenantId
  const { searchParams } = new URL(request.url)
  const source = searchParams.get("source") ?? "mock"

  if (!VALID_SOURCES.has(source)) {
    return NextResponse.json(
      safeError("inbox-na", "invalid_request" as Parameters<typeof safeError>[1]),
      { status: 400 },
    )
  }

  const signals = await resolveSignals(source, tenantId)
  const workUnits = transformSignalsToInboxWorkUnits(signals)
  return NextResponse.json({ workUnits })
}

// ─── Signal Resolution ──────────────────────────────────────────

async function resolveSignals(
  source: string,
  tenantId: string,
): Promise<NormalizedToolSignal[]> {
  switch (source) {
    case "github": {
      const { client, token } = resolveGitHubClient()
      const events = await client.fetchNormalizedEvents({ tenantId, token })
      return githubEventsToNormalizedToolSignals(events)
    }
    case "slack": {
      const events = await fetchFakeSlackNormalizedEvents({ tenantId })
      return slackEventsToNormalizedToolSignals(events)
    }
    case "calendar": {
      const events = await fetchFakeCalendarNormalizedEvents({ tenantId })
      return calendarEventsToNormalizedToolSignals(events)
    }
    case "all": {
      const { client, token } = resolveGitHubClient()
      const [github, slack, cal] = await Promise.all([
        client.fetchNormalizedEvents({ tenantId, token }),
        fetchFakeSlackNormalizedEvents({ tenantId }),
        fetchFakeCalendarNormalizedEvents({ tenantId }),
      ])
      return [
        ...githubEventsToNormalizedToolSignals(github),
        ...slackEventsToNormalizedToolSignals(slack),
        ...calendarEventsToNormalizedToolSignals(cal),
      ]
    }
    case "mock":
    default: {
      return MOCK_SIGNALS.filter((s) => s.tenantId === tenantId)
    }
  }
}
