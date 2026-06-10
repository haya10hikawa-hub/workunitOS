import { NextResponse } from "next/server"
import { listToolBackendAdapters, runToolBackendRequest } from "../../../lib/toolBackend.ts"
import type { ToolBackendRequest } from "../../../types/toolBackend.ts"

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ adapters: listToolBackendAdapters().map(({ source, operations }) => ({ source, operations })) })
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const payload = (await request.json()) as ToolBackendRequest
    const result = await runToolBackendRequest(payload)
    return NextResponse.json(result, { status: result.ok ? 200 : 400 })
  } catch {
    return NextResponse.json({ ok: false, requestId: "unknown", errors: ["invalid_json"] }, { status: 400 })
  }
}
