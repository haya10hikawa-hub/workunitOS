/**
 * GitHub API Client Interface
 *
 * Defines the GitHub read-path boundary for the WorkUnit Inbox.
 * Implementations can be fake (tests/dev) or real (GitHub API).
 */

import type { GitHubNormalizedEvent } from "./types.ts"

// ─── Config ─────────────────────────────────────────────────────

export type GitHubSourceMode = "fake" | "real_disabled" | "real"

export type GitHubApiClientInput = {
  tenantId: string
  owner?: string
  repo?: string
  token?: string
}

// ─── Interface ──────────────────────────────────────────────────

export type GitHubApiClient = {
  fetchNormalizedEvents(input: GitHubApiClientInput): Promise<GitHubNormalizedEvent[]>
}
