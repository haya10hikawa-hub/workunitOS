/**
 * Real GitHub API Client (Skeleton)
 *
 * Reads GitHub issues and PRs from the REST API and maps them
 * into GitHubNormalizedEvent objects.
 *
 * SAFETY:
 *   - No token is stored — it's passed per-input.
 *   - Never logs tokens.
 *   - Raw API responses are NOT exposed to the WorkUnit pipeline.
 *   - Returns empty array on any error (safe fallback).
 *
 * ENV:
 *   GITHUB_SOURCE_MODE=real
 *   GITHUB_ACCESS_TOKEN=ghp_xxx (only in dev — never committed)
 */

import type { GitHubApiClient, GitHubApiClientInput } from "./client.ts"
import type { GitHubNormalizedEvent } from "./types.ts"

// ─── Config ─────────────────────────────────────────────────────

const GITHUB_API_BASE = "https://api.github.com"

function authHeader(token: string): Record<string, string> {
  return { Authorization: `token ${token}` }
}

// ─── Client ─────────────────────────────────────────────────────

export const realGitHubClient: GitHubApiClient = {
  async fetchNormalizedEvents(input: GitHubApiClientInput): Promise<GitHubNormalizedEvent[]> {
    if (!input.token) {
      // Safe: no token → no API call
      return []
    }

    const owner = input.owner ?? "acme"
    const repo = input.repo ?? "api"
    const tenantId = input.tenantId
    const headers = { ...authHeader(input.token), Accept: "application/vnd.github+json" }

    try {
      const [issues, prs] = await Promise.all([
        fetchIssues(owner, repo, headers, tenantId),
        fetchReviewRequests(owner, repo, headers, tenantId),
      ])
      return [...issues, ...prs]
    } catch {
      // Safe fallback: return empty on any error
      return []
    }
  },
}

// ─── Fetch Helpers ──────────────────────────────────────────────

async function fetchIssues(
  owner: string,
  repo: string,
  headers: Record<string, string>,
  tenantId: string,
): Promise<GitHubNormalizedEvent[]> {
  const res = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/issues?state=open&per_page=10`,
    { headers },
  )
  if (!res.ok) return []

  const issues = (await res.json()) as unknown[]
  return issues.map((issue, i) => mapIssueToNormalizedEvent(issue as Record<string, unknown>, tenantId, i))
}

async function fetchReviewRequests(
  owner: string,
  repo: string,
  headers: Record<string, unknown>,
  tenantId: string,
): Promise<GitHubNormalizedEvent[]> {
  const res = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls?state=open&per_page=10`,
    { headers: headers as Record<string, string> },
  )
  if (!res.ok) return []

  const pulls = (await res.json()) as unknown[]
  return pulls
    .filter((pr) => (pr as Record<string, unknown>).draft !== true)
    .map((pr, i) => mapPullToNormalizedEvent(pr as Record<string, unknown>, tenantId, i))
}

// ─── Mapping ────────────────────────────────────────────────────

function mapIssueToNormalizedEvent(
  issue: Record<string, unknown>,
  tenantId: string,
  index: number,
): GitHubNormalizedEvent {
  const number = (issue.number as number) ?? 0
  const labels = ((issue.labels as Array<{ name?: string }>) ?? []).map((l) => l.name ?? "")
  const isBlocked = labels.some((l) => l.toLowerCase().includes("blocked"))

  return {
    id: `gh:api:issue:${number}:${index}`,
    tenantId,
    eventType: isBlocked ? "issue_blocked" : "issue_assigned",
    repository: repoFromUrl(issue.repository_url as string),
    title: (issue.title as string) ?? "",
    number,
    url: (issue.html_url as string) ?? "",
    assignee: loginFrom(issue.assignee),
    labels,
    assignedAt: (issue.created_at as string) ?? new Date().toISOString(),
    updatedAt: (issue.updated_at as string) ?? new Date().toISOString(),
  }
}

function mapPullToNormalizedEvent(
  pr: Record<string, unknown>,
  tenantId: string,
  index: number,
): GitHubNormalizedEvent {
  const number = (pr.number as number) ?? 0

  return {
    id: `gh:api:pr:${number}:${index}`,
    tenantId,
    eventType: "pull_request_review_requested",
    repository: repoFromUrl(pr.base as Record<string, unknown>),
    title: (pr.title as string) ?? "",
    number,
    url: (pr.html_url as string) ?? "",
    actor: loginFrom(pr.user),
    reviewRequestedAt: (pr.created_at as string) ?? new Date().toISOString(),
    updatedAt: (pr.updated_at as string) ?? new Date().toISOString(),
  }
}

function repoFromUrl(repo: unknown): string {
  if (typeof repo === "object" && repo !== null) {
    return ((repo as Record<string, unknown>).full_name as string) ?? "unknown"
  }
  return "unknown"
}

function loginFrom(user: unknown): string | undefined {
  if (typeof user === "object" && user !== null) {
    return ((user as Record<string, unknown>).login as string) ?? undefined
  }
  return undefined
}
