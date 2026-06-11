/**
 * Fake GitHub API Client
 *
 * Implements GitHubApiClient using static fixtures.
 * No network calls. No tokens. No real GitHub API.
 * Replaces the now-legacy fetchFakeGitHubNormalizedEvents().
 */

import type { GitHubApiClient, GitHubApiClientInput } from "./client.ts"
import type { GitHubNormalizedEvent } from "./types.ts"

const NOW = new Date("2026-07-01T10:00:00Z")
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3600_000).toISOString()

export const fakeGitHubClient: GitHubApiClient = {
  async fetchNormalizedEvents(input: GitHubApiClientInput): Promise<GitHubNormalizedEvent[]> {
    return [
      {
        id: "gh:evt:pr:review:1",
        tenantId: input.tenantId,
        eventType: "pull_request_review_requested",
        repository: "acme/api",
        title: "Add rate limiting middleware",
        number: 142,
        url: "https://github.com/acme/api/pull/142",
        actor: "alice",
        reviewRequestedAt: hoursAgo(2),
        updatedAt: hoursAgo(2),
      },
      {
        id: "gh:evt:issue:blocked:1",
        tenantId: input.tenantId,
        eventType: "issue_blocked",
        repository: "acme/admin",
        title: "Admin dashboard shows stale data",
        number: 289,
        url: "https://github.com/acme/admin/issues/289",
        assignee: "user",
        blockedAt: hoursAgo(4),
        updatedAt: hoursAgo(1),
      },
      {
        id: "gh:evt:issue:assigned:1",
        tenantId: input.tenantId,
        eventType: "issue_assigned",
        repository: "acme/api",
        title: "Implement email digest feature",
        number: 301,
        url: "https://github.com/acme/api/issues/301",
        assignee: "user",
        assignedAt: hoursAgo(8),
        updatedAt: hoursAgo(8),
      },
    ]
  },
}
