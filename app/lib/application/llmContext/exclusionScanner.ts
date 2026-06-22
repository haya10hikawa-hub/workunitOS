import { containsForbiddenContextText, isForbiddenContextKey } from "../safety/p0Policy.ts"

export type ForbiddenContextFinding = {
  readonly path: string
  readonly key?: string
  readonly valuePreview?: string
  readonly reason: "forbidden_key" | "forbidden_value"
}

export type LlmExclusionScanResult = {
  readonly ok: boolean
  readonly findings: readonly ForbiddenContextFinding[]
}

export function scanLlmContextExclusions(value: unknown): LlmExclusionScanResult {
  const findings: ForbiddenContextFinding[] = []
  scan(value, "$", findings)
  return { ok: findings.length === 0, findings }
}

function scan(value: unknown, path: string, findings: ForbiddenContextFinding[]): void {
  if (typeof value === "string") {
    if (containsForbiddenContextText(value)) {
      findings.push({ path, valuePreview: value.slice(0, 80), reason: "forbidden_value" })
    }
    return
  }
  if (!value || typeof value !== "object") return
  if (Array.isArray(value)) {
    value.forEach((item, index) => scan(item, `${path}[${index}]`, findings))
    return
  }
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const nextPath = `${path}.${key}`
    if (isForbiddenContextKey(key)) {
      findings.push({ path: nextPath, key, reason: "forbidden_key" })
    }
    scan(nested, nextPath, findings)
  }
}
