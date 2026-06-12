/**
 * GitHub Normalized Event Types
 *
 * Safe, normalized GitHub-like input types for WorkUnit Inbox.
 * These are NOT raw GitHub API responses. They are the structured
 * input that the read-side boundary expects.
 *
 * When real GitHub API integration is added, its raw responses
 * will be mapped into these types before entering the pipeline.
 */

// ─── Event Types ────────────────────────────────────────────────

export type GitHubNormalizedEventType =
  | "pull_request_review_requested"
  | "issue_assigned"
  | "issue_blocked"

// ─── Event ─────────────────────────────────────────────────────

export type GitHubNormalizedEvent = {
  id: string
  tenantId: string
  eventType: GitHubNormalizedEventType
  repository: string
  title: string
  number: number
  url: string
  actor?: string
  assignee?: string
  labels?: string[]
  reviewRequestedAt?: string
  assignedAt?: string
  blockedAt?: string
  updatedAt: string
}
