/**
 * Slack Normalized Event Types
 *
 * Safe, normalized Slack-like input types for WorkUnit Inbox.
 * These are NOT raw Slack API responses.
 */

// ─── Event Types ────────────────────────────────────────────────

export type SlackNormalizedEventType =
  | "mention_request"
  | "thread_needs_reply"
  | "decision_request"

// ─── Event ─────────────────────────────────────────────────────

export type SlackNormalizedEvent = {
  id: string
  tenantId: string
  eventType: SlackNormalizedEventType
  channel: string
  channelName?: string
  title: string
  summary: string
  url?: string
  actor?: string
  assignee?: string
  mentionedAt?: string
  updatedAt: string
}
