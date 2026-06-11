import test from "node:test"
import assert from "node:assert/strict"
import {
  createExternalSignal,
  type ExternalSignal,
  type WorkUnitDraft,
  type ExecutionCommand,
  type ActionApprovalRecord,
} from "../app/lib/domain/types.ts"
import {
  externalSignalToSourceCandidate,
  sourceCandidateToWorkUnitDraft,
  reviewWorkUnitDraft,
  recordExecutionOutcome,
  assertTrustLevel,
} from "../app/lib/domain/workUnitLifecycle.ts"
import { createActionPreview, buildExecutionCommand, getExternalActionType } from "../app/lib/workUnitExecution.ts"
import { createApprovalPreview } from "../app/lib/security/actionApproval.ts"
import { verifyApproval, defaultDenyApprovalStore } from "../app/lib/security/approvalStore.ts"
import type { TenantId, UserId } from "../app/lib/tenant/types.ts"

const tenantId = "test-tenant" as TenantId
const userId = "test-user" as UserId

// ─── Signal → Candidate ───

test("full lifecycle: external signal → source candidate", () => {
  const signal = createExternalSignal({
    id: "sig-1",
    tenantId,
    sourceType: "slack",
    sourceRef: { source: "slack", externalId: "msg-1", capturedAt: new Date().toISOString() },
    metadata: { title: "Urgent review needed", actors: ["PM"], problem: "Deadline approaching" },
  })
  assert.equal(signal.trustLevel, "untrusted")

  const result = externalSignalToSourceCandidate(signal, {
    summary: "Urgent review needed",
    actors: ["PM"],
    problem: "Deadline approaching",
    confidence: 0.8,
  })
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.value.trustLevel, "sanitized_candidate")
    assert.equal(result.value.sourceType, "slack")
    assert.equal(result.event, "source_candidate_created")
  }
})

// ─── Candidate → Draft → Reviewed ───

test("full lifecycle: candidate → draft → reviewed", () => {
  const signal = createExternalSignal({
    id: "sig-2",
    tenantId,
    sourceType: "gmail",
    sourceRef: { source: "gmail", externalId: "email-1", capturedAt: new Date().toISOString() },
    metadata: { title: "Contract renewal", actors: ["Legal"], deadline: "2026-07-01" },
  })

  const candidateResult = externalSignalToSourceCandidate(signal, {
    summary: "Contract renewal",
    actors: ["Legal"],
    deadline: "2026-07-01",
    problem: "Contract expires soon",
    confidence: 0.9,
  })
  assert.equal(candidateResult.ok, true)
  if (!candidateResult.ok) return

  const draftResult = sourceCandidateToWorkUnitDraft(candidateResult.value, { createdBy: "ai" })
  assert.equal(draftResult.ok, true)
  if (!draftResult.ok) return
  assert.equal(draftResult.value.trustLevel, "draft")
  assert.equal(draftResult.value.status, "draft")
  assert.equal(draftResult.value.createdBy, "ai")
  assert.ok(draftResult.value.missingFields.length >= 0)

  const reviewResult = reviewWorkUnitDraft(draftResult.value, userId)
  assert.equal(reviewResult.ok, true)
  if (!reviewResult.ok) return
  assert.equal(reviewResult.value.trustLevel, "reviewed")
  assert.equal(reviewResult.value.status, "reviewed")
  assert.equal(reviewResult.value.reviewedByUserId, userId)
  assert.equal(reviewResult.event, "workunit_reviewed")
})

// ─── External signal rejects non-untrusted input ───

test("externalSignalToSourceCandidate rejects non-untrusted input", () => {
  const badSignal = { trustLevel: "draft" } as unknown as ExternalSignal
  const result = externalSignalToSourceCandidate(badSignal, { summary: "x", actors: [], confidence: 0.5 })
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.reason, "Signal must be untrusted")
})

// ─── Draft → Reviewed rejects non-draft input ───

test("reviewWorkUnitDraft rejects non-draft input", () => {
  const reviewed = { trustLevel: "reviewed" } as unknown as WorkUnitDraft
  const result = reviewWorkUnitDraft(reviewed, userId)
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.reason, "Only drafts can be reviewed")
})

// ─── Trust level assertions ───

test("assertTrustLevel validates trust level", () => {
  const signal = createExternalSignal({
    id: "sig-3",
    tenantId,
    sourceType: "slack",
    sourceRef: { source: "slack", externalId: "msg-3", capturedAt: new Date().toISOString() },
  })
  const good = assertTrustLevel(signal, "untrusted")
  assert.equal(good.ok, true)

  const bad = assertTrustLevel(signal, "approved")
  assert.equal(bad.ok, false)
})

// ─── Action Preview ───

test("createActionPreview builds external and internal previews", () => {
  const external = createActionPreview({
    tenantId,
    workUnitId: "wu-1",
    actionType: "slack_reply",
    targetLabel: "Slack Reply",
    targetDestination: "#general",
    bodySnippet: "確認しました。対応を進めます。",
    detailFields: { channel: "#general" },
    provider: "slack",
  })
  assert.equal(external.requiresApproval, true)
  assert.equal(external.actionType, "slack_reply")
  assert.ok(external.payloadHash.length > 0)
  assert.ok(external.targetHash.length > 0)

  const internal = createActionPreview({
    tenantId,
    workUnitId: "wu-1",
    actionType: "internal_task",
    targetLabel: "Internal Task",
    targetDestination: "self",
    bodySnippet: "Follow up with team",
    detailFields: {},
    provider: "internal",
  })
  assert.equal(internal.requiresApproval, false)
})

// ─── Execution Command ───

test("buildExecutionCommand creates command with idempotency key", () => {
  const preview = createActionPreview({
    tenantId,
    workUnitId: "wu-1",
    actionType: "github_issue",
    targetLabel: "GitHub Issue",
    targetDestination: "acme/ops",
    bodySnippet: "Security review",
    detailFields: { owner: "acme", repo: "ops" },
    provider: "github",
  })

  const approval: ActionApprovalRecord = createApprovalPreview({
    tenantId,
    workUnitId: "wu-1",
    actionPreviewId: preview.id,
    actionType: "github_issue",
    target: "acme/ops",
    payload: { title: "Security review" },
  })

  const command = buildExecutionCommand({
    tenantId,
    workUnitId: "wu-1",
    approvalRecord: approval,
    resolvedTarget: { provider: "github", owner: "acme", repo: "ops" },
    resolvedPayload: { title: "Security review", body: "Review needed" },
  })

  assert.ok(command.id.startsWith("exec:"))
  assert.equal(command.actionType, "github_issue")
  assert.ok(command.idempotencyKey.length > 0)
  assert.equal(command.resolvedTarget.owner, "acme")
})

// ─── Execution Result ───

test("recordExecutionOutcome records success and failure", () => {
  const command: ExecutionCommand = buildExecutionCommand({
    tenantId,
    workUnitId: "wu-2",
    approvalRecord: createApprovalPreview({
      tenantId,
      workUnitId: "wu-2",
      actionPreviewId: "preview-x",
      actionType: "slack_reply",
      target: "#general",
      payload: { body: "OK" },
    }),
    resolvedTarget: { provider: "slack", channel: "#general" },
    resolvedPayload: { title: "Reply", body: "OK" },
  })

  const success = recordExecutionOutcome(command, {
    status: "succeeded",
    provider: "slack",
    providerResultRef: "C123:12345",
    safeMessage: "Message posted",
  })
  assert.equal(success.ok, true)
  if (success.ok) {
    assert.equal(success.value.status, "succeeded")
    assert.equal(success.event, "execution_completed")
  }

  const failed = recordExecutionOutcome(command, {
    status: "failed",
    safeMessage: "Provider unavailable",
    errorCode: "provider_down",
  })
  assert.equal(failed.ok, true)
  if (failed.ok) {
    assert.equal(failed.value.status, "failed")
    assert.equal(failed.event, "execution_failed")
  }
})

// ─── getExternalActionType ───

test("getExternalActionType maps providers to action types", () => {
  assert.equal(getExternalActionType("slack"), "slack_reply")
  assert.equal(getExternalActionType("gmail"), "gmail_reply")
  assert.equal(getExternalActionType("github"), "github_issue")
  assert.equal(getExternalActionType("google_calendar"), "calendar_event")
  assert.equal(getExternalActionType("unknown"), "internal_task")
})

// ─── Approval remains default-deny ───

test("verifyApproval still defaults to deny", async () => {
  const result = await verifyApproval(defaultDenyApprovalStore, {
    tenantId,
    workUnitId: "wu-1",
    actionPreviewId: "preview-1",
    approvalId: "any",
    actionType: "slack_reply",
    targetHash: "h1",
    payloadHash: "h2",
    now: new Date().toISOString(),
  })
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error, "approval_required")
})
