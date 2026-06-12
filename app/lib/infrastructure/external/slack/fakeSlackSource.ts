/**
 * Fake Slack Source
 *
 * Returns SlackNormalizedEvent fixtures.
 * No network calls. No tokens. No real Slack API.
 */

import type { SlackNormalizedEvent } from "./types.ts"

const NOW = new Date("2026-07-01T10:00:00Z")
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3600_000).toISOString()

export async function fetchFakeSlackNormalizedEvents(input: {
  tenantId: string
}): Promise<SlackNormalizedEvent[]> {
  return [
    {
      id: "slack:evt:mention:1",
      tenantId: input.tenantId,
      eventType: "mention_request",
      channel: "C123",
      channelName: "ops",
      title: "@you review the deployment config?",
      summary: "Charlie asked if you can review the deployment config before today's release.",
      url: "https://acme.slack.com/archives/ops/p123456",
      actor: "charlie",
      mentionedAt: hoursAgo(3),
      updatedAt: hoursAgo(3),
    },
    {
      id: "slack:evt:decision:1",
      tenantId: input.tenantId,
      eventType: "decision_request",
      channel: "C456",
      channelName: "engineering",
      title: "Should we use Postgres or D1 for the audit log?",
      summary: "Alice and Bob need a decision on the audit log storage. Thread has been open for 2 days.",
      url: "https://acme.slack.com/archives/engineering/p789",
      actor: "alice",
      assignee: "user",
      mentionedAt: hoursAgo(24),
      updatedAt: hoursAgo(1),
    },
  ]
}
