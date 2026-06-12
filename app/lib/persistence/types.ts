/**
 * Persistence Layer Types
 *
 * Defines the type system for the D1-first data model.
 * No database bindings — types and interfaces only.
 */

import type { TenantId, UserId, WorkUnitId } from "../tenant/types.ts"

// ─── Database Contexts ──────────────────────────────────────────

/** Represents a connection to a specific tenant's D1 database. */
export type TenantDbContext = {
  tenantId: TenantId
  /** Opaque D1 database handle. Real implementation will use D1Database. */
  db: unknown
}

/** Represents a connection to the control/registry database. */
export type ControlDbContext = {
  /** Opaque D1 database handle. */
  db: unknown
}

// ─── Tenant Database Registry ───────────────────────────────────

export type TenantDatabaseRef = {
  tenantId: TenantId
  databaseName: string
  databaseId: string
  schemaVersion: string
  status: "active" | "migrating" | "failed"
}

// ─── Object Storage ─────────────────────────────────────────────

export type ObjectStorageRef = {
  /** Object key in R2 or equivalent object storage. */
  key: string
  /** SHA-256 hex hash of the stored content. */
  contentHash: string
  /** Content length in bytes. */
  sizeBytes: number
  /** MIME type if known. */
  mimeType?: string
}

// ─── Row Types (matching DATA_MODEL.md schemas) ─────────────────

export type UserRow = {
  id: UserId
  email: string
  name: string
  avatarUrl?: string
  createdAt: string
  updatedAt: string
}

export type TenantRow = {
  id: TenantId
  name: string
  slug: string
  status: "active" | "suspended" | "deleted"
  createdAt: string
  updatedAt: string
}

export type MembershipRow = {
  id: string
  userId: UserId
  tenantId: TenantId
  role: "owner" | "manager" | "editor" | "viewer"
  status: "active" | "invited" | "suspended"
  createdAt: string
  updatedAt: string
}

export type WorkUnitRow = {
  id: WorkUnitId
  tenantId: TenantId
  title: string
  situation: string
  problem: string
  actors: string   // JSON array
  urgency: number
  impact: number
  effort: number
  priorityScore: number
  nextAction: string
  tasks: string    // JSON array
  missingFields: string // JSON array
  status: "draft" | "reviewed"
  trustLevel: string
  sourceCandidateIds: string // JSON array
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type SourceCandidateRow = {
  id: string
  tenantId: TenantId
  sourceSignalIds: string // JSON array
  sourceType: string
  extractedSummary: string
  detectedActors: string // JSON array
  detectedProblem?: string
  detectedDeadline?: string
  detectedIntent?: string
  confidence: number
  trustLevel: string
  createdAt: string
}

export type ExternalSignalRow = {
  id: string
  tenantId: TenantId
  sourceType: string
  sourceRef: string // JSON object
  receivedAt: string
  trustLevel: string
  rawContentRef?: string
  metadata: string // JSON object
}

export type ActionPreviewRow = {
  id: string
  tenantId: TenantId
  workUnitId: string
  actionType: string
  targetPreview: string  // JSON object
  payloadPreview: string // JSON object
  requiresApproval: number
  status: string
  targetHash: string
  payloadHash: string
  createdAt: string
  expiresAt?: string
}

export type ApprovalRecordRow = {
  id: string
  tenantId: TenantId
  workUnitId: string
  actionPreviewId: string
  actionType: string
  targetHash: string
  payloadHash: string
  status: "pending" | "approved" | "rejected" | "expired" | "used"
  approvedByUserId?: UserId
  createdAt: string
  approvedAt?: string
  expiresAt: string
  usedAt?: string
}

export type ExecutionResultRow = {
  id: string
  tenantId: TenantId
  workUnitId: string
  executionCommandId: string
  status: "succeeded" | "failed" | "blocked" | "skipped"
  provider?: string
  providerResultRef?: string
  safeMessage: string
  errorCode?: string
  executedAt: string
}

export type AuditLogRow = {
  id: string
  tenantId: TenantId
  eventKind: string
  actorId?: UserId
  requestId?: string
  workUnitId?: string
  operation?: string
  target?: string
  reason?: string
  metadata?: string // JSON object
  occurredAt: string
}

export type LlmProcessingRunRow = {
  id: string
  tenantId: TenantId
  signalId?: string
  candidateId?: string
  workUnitId?: string
  stage: string
  provider: string
  model: string
  promptTokens?: number
  completionTokens?: number
  durationMs?: number
  status: "started" | "completed" | "failed" | "blocked"
  errorCode?: string
  createdAt: string
}

export type IntegrationMetadataRow = {
  id: string
  tenantId: TenantId
  provider: string
  status: "active" | "inactive" | "error" | "pending_oauth"
  externalAccountId?: string
  scopes?: string   // JSON array
  connectedAt?: string
  tokenExpiresAt?: string
  config: string    // JSON object; never plain tokens
}

// ─── Phase 2: New persistence types ──────────────────────────────

export type InboxWorkUnitRow = {
  id: string
  tenantId: TenantId
  sourceSignalId?: string
  title: string
  kind: string
  priority: string
  sourceProvider: string
  reason: string
  evidence: string
  nextAction: string
  sourceUrl?: string
  actor?: string
  assignee?: string
  repository?: string
  dueAt?: string
  status: string
  createdAt: string
  updatedAt: string
}

export type WorkUnitFeedbackRow = {
  id: string
  tenantId: TenantId
  workUnitId: string
  feedback: string
  actorUserId?: string
  createdAt: string
}

export type IntegrationConnectionRow = {
  id: string
  tenantId: TenantId
  provider: string
  status: string
  mode: string
  displayName?: string
  externalAccountId?: string
  scopesJson?: string
  metadataJson?: string
  connectedAt?: string
  disconnectedAt?: string
  lastSyncAt?: string
  lastErrorCode?: string
  lastErrorMessage?: string
  createdAt: string
  updatedAt: string
}

export type UsageEventRow = {
  id: string
  tenantId: TenantId
  eventType: string
  quantity: number
  resourceType?: string
  resourceId?: string
  metadataJson?: string
  createdAt: string
}

export type UsageDailySummaryRow = {
  tenantId: TenantId
  date: string
  eventType: string
  quantity: number
  updatedAt: string
}
