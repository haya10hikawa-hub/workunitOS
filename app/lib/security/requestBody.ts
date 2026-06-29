export type JsonBodyLimits = {
  readonly maxBytes?: number
  readonly maxDepth?: number
  readonly maxNodes?: number
  readonly maxArrayLength?: number
  readonly maxStringLength?: number
  readonly maxObjectKeys?: number
}

export type JsonObjectReadResult =
  | { readonly ok: true; readonly value: Record<string, unknown> }
  | { readonly ok: false; readonly reason: "invalid_json" | "payload_too_large" | "invalid_structure" }

const DEFAULT_LIMITS: Required<JsonBodyLimits> = {
  maxBytes: 64 * 1024,
  maxDepth: 20,
  maxNodes: 2_000,
  maxArrayLength: 100,
  maxStringLength: 10_000,
  maxObjectKeys: 100,
}

export async function readBoundedJsonObject(
  request: Request,
  overrides: JsonBodyLimits = {},
): Promise<JsonObjectReadResult> {
  const limits = { ...DEFAULT_LIMITS, ...overrides }
  const declaredLength = parseContentLength(request.headers.get("content-length"))
  if (declaredLength !== null && declaredLength > limits.maxBytes) {
    return { ok: false, reason: "payload_too_large" }
  }

  const bytes = await readBodyBytes(request, limits.maxBytes)
  if (!bytes.ok) return bytes

  let parsed: unknown
  try {
    parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes.value))
  } catch {
    return { ok: false, reason: "invalid_json" }
  }

  if (!isPlainObject(parsed) || !hasSafeStructure(parsed, limits)) {
    return { ok: false, reason: "invalid_structure" }
  }
  return { ok: true, value: parsed }
}

async function readBodyBytes(
  request: Request,
  maxBytes: number,
): Promise<{ readonly ok: true; readonly value: Uint8Array } | { readonly ok: false; readonly reason: "payload_too_large" | "invalid_json" }> {
  if (!request.body) return { ok: false, reason: "invalid_json" }
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0

  try {
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      total += chunk.value.byteLength
      if (total > maxBytes) {
        await reader.cancel()
        return { ok: false, reason: "payload_too_large" }
      }
      chunks.push(chunk.value)
    }
  } catch {
    return { ok: false, reason: "invalid_json" }
  }

  const body = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return { ok: true, value: body }
}

function hasSafeStructure(root: Record<string, unknown>, limits: Required<JsonBodyLimits>): boolean {
  const stack: Array<{ readonly value: unknown; readonly depth: number }> = [{ value: root, depth: 0 }]
  let nodes = 0

  while (stack.length > 0) {
    const current = stack.pop()!
    nodes += 1
    if (nodes > limits.maxNodes || current.depth > limits.maxDepth) return false
    if (typeof current.value === "string" && current.value.length > limits.maxStringLength) return false

    if (Array.isArray(current.value)) {
      if (current.value.length > limits.maxArrayLength) return false
      for (const item of current.value) stack.push({ value: item, depth: current.depth + 1 })
      continue
    }

    if (current.value && typeof current.value === "object") {
      if (!isPlainObject(current.value)) return false
      const entries = Object.entries(current.value)
      if (entries.length > limits.maxObjectKeys) return false
      for (const [, value] of entries) stack.push({ value, depth: current.depth + 1 })
    }
  }
  return true
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function parseContentLength(value: string | null): number | null {
  if (value === null) return null
  if (!/^\d+$/.test(value)) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null
}
