/**
 * External integration boundary types.
 *
 * Defines the provider vocabulary and tenant-owned integration config shapes.
 * Client requests MUST NOT supply trusted integration config — integration
 * settings must come from server-side, tenant-owned secure storage.
 */

import type { TenantId } from "../tenant/types"

export type IntegrationProvider =
  | "slack"
  | "gmail"
  | "github"
  | "google_calendar"
  | "notion"
  | "google_drive"

export type IntegrationStatus = "active" | "inactive" | "error" | "pending_oauth"

/**
 * Tenant-owned integration configuration.
 * Stored server-side, never trusted from the client.
 */
export type TenantIntegration = {
  id: string
  tenantId: TenantId
  provider: IntegrationProvider
  status: IntegrationStatus
  /** External account identifier (e.g. Slack workspace ID, GitHub org) */
  externalAccountId?: string
  /** OAuth scope granted */
  scopes?: string[]
  /** When the integration was last connected/refreshed */
  connectedAt?: string
  /** When the current token expires */
  tokenExpiresAt?: string
  /** Provider-specific configuration resolved server-side */
  config: ProviderConfig
}

export type ProviderConfig = {
  slack?: SlackIntegrationConfig
  gmail?: GmailIntegrationConfig
  github?: GitHubIntegrationConfig
  googleCalendar?: GoogleCalendarIntegrationConfig
}

export type SlackIntegrationConfig = {
  /** Default channel for replies (server-configured, not client-chosen) */
  defaultChannel?: string
}

export type GmailIntegrationConfig = {
  /** Default sender address (server-configured) */
  defaultFrom?: string
}

export type GitHubIntegrationConfig = {
  /** Default owner/org */
  defaultOwner?: string
  /** Default repository */
  defaultRepo?: string
}

export type GoogleCalendarIntegrationConfig = {
  /** Default calendar ID */
  defaultCalendarId?: string
  /** Default timezone */
  defaultTimeZone?: string
}

/**
 * Typed external action target — what the action operates on.
 * Used for approval hashing and audit logging.
 */
export type ExternalActionTarget = {
  provider: IntegrationProvider
  channel?: string       // Slack channel
  recipient?: string     // Gmail recipient
  repo?: string          // GitHub repo (owner/repo)
  calendarId?: string    // Google Calendar ID
}

/**
 * Typed external action payload — what the action will send.
 * Used for approval hashing to detect tampering.
 */
export type ExternalActionPayload = {
  title?: string
  body?: string
  labels?: string[]
  attendees?: string[]
  timeHint?: string
}

// TODO: encrypted token storage — provider tokens must be encrypted at rest
// TODO: per-tenant OAuth — each tenant has independent OAuth credentials
// TODO: scope minimization — request only the scopes needed for the integration
// TODO: token rotation — refresh tokens before expiry, handle revocation
// TODO: revoke handling — detect and surface revoked tokens to the tenant admin
