type DashboardActionType = "database_update" | "email_send" | "slack_reply" | "github_issue" | "calendar_block"
type ApprovalDecision = "approve" | "reject"

export type DashboardPreviewAction = {
  id: string
  type: DashboardActionType
  tool: string
  title: string
  fields: Record<string, string | string[]>
}

export type DashboardPreviewGroup = {
  workUnitId: string
  workUnitTitle: string
  source: string
  actions: DashboardPreviewAction[]
}

export type DashboardPreviewRef = {
  actionId: string
  previewId: string
}

export type DashboardPreviewRequest = {
  actionId: string
  workUnitId: string
  body: {
    actionType: "internal_task" | "slack_reply" | "gmail_reply" | "github_issue" | "calendar_event"
    target: Record<string, unknown>
    payload: Record<string, unknown>
  }
}

const FORBIDDEN_CLIENT_KEYS = new Set(["targetHash", "payloadHash", "tenantId", "approvedByUserId", "status", "usedAt"])

export function buildDashboardPreviewRequests(group: DashboardPreviewGroup): DashboardPreviewRequest[] {
  return group.actions.map((action) => ({
    actionId: action.id,
    workUnitId: group.workUnitId,
    body: {
      actionType: toApprovalActionType(action.type),
      target: stripForbiddenClientKeys({
        tool: action.tool,
        source: group.source,
        workUnitTitle: group.workUnitTitle,
        actionTitle: action.title,
      }),
      payload: stripForbiddenClientKeys({
        actionId: action.id,
        title: action.title,
        fields: stripForbiddenClientKeys(action.fields),
      }),
    },
  }))
}

export async function createDashboardActionPreviews(
  group: DashboardPreviewGroup,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true; previews: DashboardPreviewRef[] } | { ok: false; error: string }> {
  const previews: DashboardPreviewRef[] = []
  for (const request of buildDashboardPreviewRequests(group)) {
    const res = await fetchImpl(`/api/workunit/${request.workUnitId}/action-preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request.body),
    })
    if (!res.ok) return { ok: false, error: await readError(res, "Preview creation failed") }
    const data = await res.json()
    previews.push({ actionId: request.actionId, previewId: String(data.preview?.id ?? "") })
  }
  return { ok: true, previews: previews.filter((preview) => preview.previewId.length > 0) }
}

export async function approveDashboardActionPreviews(
  workUnitId: string,
  previews: DashboardPreviewRef[],
  decision: ApprovalDecision,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true } | { ok: false; error: string }> {
  for (const preview of previews) {
    const res = await fetchImpl(`/api/workunit/${workUnitId}/approval`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionPreviewId: preview.previewId, decision }),
    })
    if (!res.ok) return { ok: false, error: await readError(res, "Approval failed") }
  }
  return { ok: true }
}

function toApprovalActionType(type: DashboardActionType): DashboardPreviewRequest["body"]["actionType"] {
  if (type === "email_send") return "gmail_reply"
  if (type === "calendar_block") return "calendar_event"
  if (type === "database_update") return "internal_task"
  return type
}

function stripForbiddenClientKeys(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input).filter(([key]) => !FORBIDDEN_CLIENT_KEYS.has(key)))
}

async function readError(response: Response, fallback: string): Promise<string> {
  const data = await response.json().catch(() => ({}))
  return typeof data.error === "string" ? data.error : fallback
}
