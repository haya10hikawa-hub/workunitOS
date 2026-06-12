/**
 * InboxWorkUnit → ActionPreview Mapping
 *
 * Deterministic mapping from InboxWorkUnit to ActionPreview request.
 * No secrets, no client hashes, no external APIs.
 */

import type { InboxWorkUnit, InboxWorkUnitKind } from "./types.ts"

// ─── Result ─────────────────────────────────────────────────────

export type ActionPreviewMapping = {
  actionType: string
  targetPreview: Record<string, unknown>
  payloadPreview: Record<string, unknown>
}

// ─── Mapping ────────────────────────────────────────────────────

const KIND_MAPPING: Record<InboxWorkUnitKind, (wu: InboxWorkUnit) => ActionPreviewMapping> = {
  review_waiting: (wu) => ({
    actionType: "github_issue",
    targetPreview: {
      provider: "github",
      repository: wu.repository ?? "unknown",
      sourceUrl: wu.sourceUrl ?? "",
    },
    payloadPreview: {
      intent: "review_pr",
      title: wu.title,
      nextAction: wu.nextAction,
      summary: wu.evidence,
    },
  }),

  blocker: (wu) => ({
    actionType: "github_issue",
    targetPreview: {
      provider: "github",
      repository: wu.repository ?? "unknown",
      sourceUrl: wu.sourceUrl ?? "",
    },
    payloadPreview: {
      intent: "unblock_request",
      title: wu.title,
      nextAction: wu.nextAction,
      summary: wu.evidence,
    },
  }),

  assigned_issue: (wu) => ({
    actionType: "github_issue",
    targetPreview: {
      provider: "github",
      repository: wu.repository ?? "unknown",
      sourceUrl: wu.sourceUrl ?? "",
    },
    payloadPreview: {
      intent: "triage_or_implement",
      title: wu.title,
      nextAction: wu.nextAction,
      summary: wu.evidence,
    },
  }),

  missed_response: (wu) => ({
    actionType: "slack_reply",
    targetPreview: {
      provider: "slack",
      sourceUrl: wu.sourceUrl ?? "",
      actor: wu.actor,
    },
    payloadPreview: {
      intent: "reply_or_clarify",
      title: wu.title,
      nextAction: wu.nextAction,
      summary: wu.evidence,
    },
  }),

  deadline: (wu) => ({
    actionType: "calendar_event",
    targetPreview: {
      provider: "calendar",
      dueAt: wu.dueAt,
    },
    payloadPreview: {
      intent: "prepare_before_deadline",
      title: wu.title,
      nextAction: wu.nextAction,
      summary: wu.evidence,
    },
  }),
}

// ─── Public API ─────────────────────────────────────────────────

export function buildActionPreviewFromInboxWorkUnit(wu: InboxWorkUnit): ActionPreviewMapping {
  const mapper = KIND_MAPPING[wu.kind] ?? KIND_MAPPING["assigned_issue"]
  return mapper(wu)
}
