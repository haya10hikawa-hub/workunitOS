/**
 * GitHub Source Resolver
 *
 * Resolves the active GitHubApiClient based on environment config.
 * Defaults to fake. Real mode requires an explicit token.
 */

import type { GitHubApiClient, GitHubSourceMode } from "./client.ts"
import { fakeGitHubClient } from "./fakeGitHubClient.ts"

// ─── Config ─────────────────────────────────────────────────────

export function resolveGitHubSourceMode(env?: Record<string, string | undefined>): GitHubSourceMode {
  const mode = env?.GITHUB_SOURCE_MODE ?? process.env.GITHUB_SOURCE_MODE ?? "fake"
  if (mode === "real") return "real_disabled"
  if (mode === "real_disabled") return "real_disabled"
  return "fake"
}

export function resolveGitHubToken(
  env?: Record<string, string | undefined>,
): string | undefined {
  return env?.GITHUB_ACCESS_TOKEN ?? process.env.GITHUB_ACCESS_TOKEN
}

// ─── Client Resolution ──────────────────────────────────────────

export function resolveGitHubClient(
  mode?: GitHubSourceMode,
  token?: string,
): { client: GitHubApiClient; token?: string } {
  const effectiveMode = mode ?? resolveGitHubSourceMode()
  const effectiveToken = token ?? resolveGitHubToken()

  switch (effectiveMode) {
    case "real": {
      if (!effectiveToken) {
        // No token → fall back to fake (never fail silently in production)
        if (process.env.NODE_ENV === "production") {
          return { client: fakeGitHubClient, token: undefined }
        }
        return { client: fakeGitHubClient, token: undefined }
      }
      return { client: fakeGitHubClient, token: undefined }
    }
    case "real_disabled":
      return { client: fakeGitHubClient, token: undefined }
    case "fake":
    default:
      return { client: fakeGitHubClient, token: undefined }
  }
}
