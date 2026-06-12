/**
 * Mock Normalized Signals
 *
 * Provides realistic mocked signals for the WorkUnit Inbox MVP.
 * Replaces real GitHub / Slack / Calendar API calls.
 */

import type { NormalizedToolSignal } from "./types.ts"

export const MOCK_TENANT_ID = "dev-tenant"

const NOW = new Date("2026-07-01T10:00:00Z")
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3600_000).toISOString()

export const MOCK_SIGNALS: NormalizedToolSignal[] = [
  {
    id: "signal:github:pr:review:1",
    tenantId: MOCK_TENANT_ID,
    provider: "github",
    signalType: "github_pr_review_requested",
    title: "PR #142: Add rate limiting middleware",
    summary: "Your review is requested on the rate limiting middleware PR. The team needs sign-off by EOD.",
    sourceUrl: "https://github.com/acme/api/pull/142",
    actor: "alice",
    repository: "acme/api",
    priorityHint: "high",
    createdAt: hoursAgo(2),
    updatedAt: hoursAgo(2),
  },
  {
    id: "signal:github:issue:blocked:1",
    tenantId: MOCK_TENANT_ID,
    provider: "github",
    signalType: "github_issue_blocked",
    title: "Issue #289: Admin dashboard shows stale data",
    summary: "This issue is blocked pending the database schema migration. The team can't proceed.",
    sourceUrl: "https://github.com/acme/admin/issues/289",
    actor: "bob",
    assignee: "you",
    repository: "acme/admin",
    createdAt: hoursAgo(4),
    updatedAt: hoursAgo(1),
  },
  {
    id: "signal:github:issue:assigned:1",
    tenantId: MOCK_TENANT_ID,
    provider: "github",
    signalType: "github_issue_assigned",
    title: "Issue #301: Implement email digest feature",
    summary: "You have been assigned this feature. Sprint ends Friday.",
    sourceUrl: "https://github.com/acme/api/issues/301",
    assignee: "you",
    repository: "acme/api",
    priorityHint: "medium",
    createdAt: hoursAgo(8),
    updatedAt: hoursAgo(8),
  },
  {
    id: "signal:slack:mention:1",
    tenantId: MOCK_TENANT_ID,
    provider: "slack",
    signalType: "slack_mention_request",
    title: "Slack message from @charlie in #ops",
    summary: "Charlie asked: \"Can someone review the deployment config? We need to ship today.\"",
    sourceUrl: "https://acme.slack.com/archives/ops/p123456",
    actor: "charlie",
    priorityHint: "high",
    createdAt: hoursAgo(3),
    updatedAt: hoursAgo(3),
  },
  {
    id: "signal:calendar:deadline:1",
    tenantId: MOCK_TENANT_ID,
    provider: "calendar",
    signalType: "calendar_deadline",
    title: "Quarterly review presentation due",
    summary: "Your quarterly review presentation is due in 2 days.",
    sourceUrl: "https://calendar.google.com/event?eid=abc123",
    priorityHint: "high",
    dueAt: new Date(NOW.getTime() + 2 * 86400_000).toISOString(),
    createdAt: hoursAgo(24),
    updatedAt: hoursAgo(24),
  },
]
