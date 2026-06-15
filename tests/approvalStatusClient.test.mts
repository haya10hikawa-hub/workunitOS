import test from "node:test"
import assert from "node:assert/strict"
import { fetchDashboardApprovalStatus } from "../app/lib/application/dashboard/dashboardApprovalStatusClient.ts"

type FetchStub = (url: string | URL | Request, init?: RequestInit) => Promise<Response>

function stubResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status })
}

// ─── Valid responses ─────────────────────────────────────────────

test("valid none response parses as none", async () => {
  const result = await fetchDashboardApprovalStatus("wu:1", (async () => stubResponse({
    workUnitId: "wu:1",
    status: "none",
    approved: false,
    rejected: false,
    expired: false,
    used: false,
    latestApprovalId: null,
    latestActionPreviewId: null,
    createdAt: null,
    expiresAt: null,
    usedAt: null,
  })) as FetchStub)
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.approvalStatus.status, "none")
  assert.equal(result.approvalStatus.approved, false)
})

test("valid approved response parses as approved", async () => {
  const result = await fetchDashboardApprovalStatus("wu:1", (async () => stubResponse({
    workUnitId: "wu:1",
    status: "approved",
    approved: true,
    rejected: false,
    expired: false,
    used: false,
    latestApprovalId: "approval:1",
    latestActionPreviewId: "preview:1",
    createdAt: "2026-06-01T00:00:00Z",
    expiresAt: "2026-06-15T00:00:00Z",
    usedAt: null,
  })) as FetchStub)
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.approvalStatus.status, "approved")
  assert.equal(result.approvalStatus.approved, true)
})

test("valid rejected response parses correctly", async () => {
  const result = await fetchDashboardApprovalStatus("wu:1", (async () => stubResponse({
    workUnitId: "wu:1",
    status: "rejected",
    approved: false,
    rejected: true,
    expired: false,
    used: false,
    latestApprovalId: "approval:2",
    latestActionPreviewId: "preview:2",
    createdAt: "2026-06-01T00:00:00Z",
    expiresAt: "2026-06-15T00:00:00Z",
    usedAt: null,
  })) as FetchStub)
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.approvalStatus.status, "rejected")
  assert.equal(result.approvalStatus.rejected, true)
})

test("valid expired response parses correctly", async () => {
  const result = await fetchDashboardApprovalStatus("wu:1", (async () => stubResponse({
    workUnitId: "wu:1",
    status: "expired",
    approved: false,
    rejected: false,
    expired: true,
    used: false,
    latestApprovalId: "approval:3",
    latestActionPreviewId: "preview:3",
    createdAt: "2026-06-01T00:00:00Z",
    expiresAt: "2026-06-01T00:00:00Z",
    usedAt: null,
  })) as FetchStub)
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.approvalStatus.status, "expired")
  assert.equal(result.approvalStatus.expired, true)
})

test("valid used response parses correctly", async () => {
  const result = await fetchDashboardApprovalStatus("wu:1", (async () => stubResponse({
    workUnitId: "wu:1",
    status: "used",
    approved: true,
    rejected: false,
    expired: false,
    used: true,
    latestApprovalId: "approval:4",
    latestActionPreviewId: "preview:4",
    createdAt: "2026-06-01T00:00:00Z",
    expiresAt: "2026-06-15T00:00:00Z",
    usedAt: "2026-06-02T00:00:00Z",
  })) as FetchStub)
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.approvalStatus.status, "used")
  assert.equal(result.approvalStatus.used, true)
})

// ─── Invalid responses — must return ok:false, not "none" ──────

test("invalid response shape returns ok:false not silent none", async () => {
  const result = await fetchDashboardApprovalStatus("wu:1", (async () => stubResponse({ foo: "bar" })) as FetchStub)
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.error, "Invalid approval status response from server.")
})

test("non-json response returns ok:false", async () => {
  const result = await fetchDashboardApprovalStatus("wu:1", (async () =>
    new Response("not json", { status: 200 })
  ) as FetchStub)
  assert.equal(result.ok, false)
})

test("non-200 response returns ok:false with safe error", async () => {
  const result = await fetchDashboardApprovalStatus("wu:1", (async () => stubResponse({ error: "unauthorized" }, 401)) as FetchStub)
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.error, "unauthorized")
})

test("array response returns ok:false", async () => {
  const result = await fetchDashboardApprovalStatus("wu:1", (async () => stubResponse([{ workUnitId: "wu:1", status: "none" }])) as FetchStub)
  assert.equal(result.ok, false)
})

test("null response returns ok:false", async () => {
  const result = await fetchDashboardApprovalStatus("wu:1", (async () => stubResponse(null)) as FetchStub)
  assert.equal(result.ok, false)
})

test("missing workUnitId returns ok:false", async () => {
  const result = await fetchDashboardApprovalStatus("wu:1", (async () => stubResponse({ status: "approved" })) as FetchStub)
  assert.equal(result.ok, false)
})

test("missing status field returns ok:false", async () => {
  const result = await fetchDashboardApprovalStatus("wu:1", (async () => stubResponse({ workUnitId: "wu:1" })) as FetchStub)
  assert.equal(result.ok, false)
})

// ─── Response does not expose forbidden fields ───────────────────

test("client strips forbidden fields (no hashes exposed)", async () => {
  const result = await fetchDashboardApprovalStatus("wu:1", (async () => stubResponse({
    workUnitId: "wu:1",
    status: "approved",
    approved: true,
    targetHash: "should-not-leak",
    payloadHash: "should-not-leak",
    tenantId: "should-not-leak",
    approvedByUserId: "should-not-leak",
    latestApprovalId: "approval:1",
    latestActionPreviewId: null,
    createdAt: "2026-06-01T00:00:00Z",
    expiresAt: null,
    usedAt: null,
    rejected: false,
    expired: false,
    used: false,
  })) as FetchStub)
  assert.equal(result.ok, true)
  if (!result.ok) return
  // The client normalizes away unknown fields — verify approved still correct
  assert.equal(result.approvalStatus.approved, true)
  // Verify the response isn't carrying hash/tenant fields through
  const flat = JSON.stringify(result.approvalStatus)
  assert.equal(flat.includes("targetHash"), false)
  assert.equal(flat.includes("payloadHash"), false)
  assert.equal(flat.includes("should-not-leak"), false)
})
