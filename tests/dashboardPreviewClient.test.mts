import test from "node:test"
import assert from "node:assert/strict"
import {
  approveDashboardActionPreviews,
  buildDashboardPreviewRequests,
  createDashboardActionPreviews,
  type DashboardPreviewGroup,
} from "../app/lib/application/actionField/dashboardPreviewClient.ts"

const group: DashboardPreviewGroup = {
  workUnitId: "WU-1",
  workUnitTitle: "Enterprise renewal response pack",
  source: "Slack / #enterprise-updates",
  actions: [
    {
      id: "slack-1",
      type: "slack_reply",
      tool: "slack",
      title: "Slack返信",
      fields: {
        messageBody: "確認します",
        targetHash: "client-must-not-send",
        tenantId: "client-must-not-send",
      } as Record<string, string>,
    },
  ],
}

test("dashboard preview request strips client-owned security fields", () => {
  const [request] = buildDashboardPreviewRequests(group)
  assert.equal(request.body.actionType, "slack_reply")
  assert.equal("targetHash" in request.body, false)
  assert.equal("payloadHash" in request.body, false)
  assert.equal("tenantId" in request.body.payload, false)
  assert.equal("targetHash" in request.body.payload, false)
  const fields = request.body.payload["fields"] as Record<string, unknown>
  assert.equal("tenantId" in fields, false)
  assert.equal("targetHash" in fields, false)
})

test("dashboard preview client sends safe mapped request only", async () => {
  const calls: Array<{ url: string; body: Record<string, unknown> }> = []
  const fetchImpl = async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), body: JSON.parse(String(init?.body ?? "{}")) })
    return new Response(JSON.stringify({ preview: { id: "preview-1" } }), { status: 201 })
  }
  const result = await createDashboardActionPreviews(group, fetchImpl as typeof fetch)
  assert.equal(result.ok, true)
  assert.equal(calls[0].url, "/api/workunit/WU-1/action-preview")
  assert.deepEqual(Object.keys(calls[0].body).sort(), ["actionType", "payload", "target"])
})

test("dashboard approval client sends only actionPreviewId and decision", async () => {
  const bodies: Record<string, unknown>[] = []
  const fetchImpl = async (_url: string | URL | Request, init?: RequestInit) => {
    bodies.push(JSON.parse(String(init?.body ?? "{}")))
    return new Response(JSON.stringify({ approval: { id: "approval-1" } }), { status: 201 })
  }
  const result = await approveDashboardActionPreviews("WU-1", [{ actionId: "slack-1", previewId: "preview-1" }], "approve", fetchImpl as typeof fetch)
  assert.equal(result.ok, true)
  assert.deepEqual(bodies[0], { actionPreviewId: "preview-1", decision: "approve" })
})
