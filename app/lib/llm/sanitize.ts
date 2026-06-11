/**
 * Signal Sanitization Layer
 *
 * Prepares untrusted external input for LLM processing.
 * Sanitization reduces risk but does NOT make content trusted.
 */

import type { ExternalSignal } from "../domain/types.ts"
import type { SanitizedSignal, RiskFlag } from "./types.ts"

const MAX_CONTENT_LENGTH = 4_000
const PROMPT_INJECTION_PATTERNS = [
  /ignore (all )?(previous|prior|above) instructions/i,
  /you are now/i,
  /system prompt/i,
  /developer message/i,
  /override your (rules|behavior|instructions)/i,
  /disregard (all )?(previous|above) (instructions|rules)/i,
  /act as (if )?you are/i,
]

/**
 * Sanitize an ExternalSignal for LLM processing.
 *
 * This function:
 *   1. Extracts safe metadata fields (title, actor, timestamp, labels)
 *   2. Builds a text representation of the signal
 *   3. Scans for prompt injection patterns
 *   4. Truncates if content exceeds max length
 *   5. Returns a SanitizedSignal with risk flags
 *
 * WARNING: Sanitization does not make content trusted.
 * LLM output based on sanitized content must still be validated.
 */
export function sanitizeForLlm(signal: ExternalSignal): SanitizedSignal {
  const metadata = extractMetadata(signal)
  const textContent = buildTextContent(signal, metadata)
  const riskFlags = detectRiskFlags(textContent, signal)

  const truncated = textContent.length > MAX_CONTENT_LENGTH
  const sanitizedContent = truncated ? textContent.slice(0, MAX_CONTENT_LENGTH) : textContent

  if (truncated && !riskFlags.includes("input_too_long")) {
    riskFlags.push("input_too_long")
  }

  return {
    id: signal.id,
    tenantId: signal.tenantId,
    sourceType: signal.sourceType,
    originalLength: textContent.length,
    truncatedLength: sanitizedContent.length,
    wasTruncated: truncated,
    sanitizedContent,
    riskFlags,
    metadata,
  }
}

function extractMetadata(signal: ExternalSignal): SanitizedSignal["metadata"] {
  const meta = signal.metadata ?? {}
  return {
    title: typeof meta.title === "string" ? meta.title : undefined,
    actor: typeof meta.actor === "string" ? meta.actor : typeof meta.actors === "string" ? meta.actors : undefined,
    timestamp: typeof meta.timestamp === "string" ? meta.timestamp : signal.receivedAt,
    labels: Array.isArray(meta.labels) ? meta.labels.filter((l): l is string => typeof l === "string") : undefined,
  }
}

function buildTextContent(signal: ExternalSignal, metadata: SanitizedSignal["metadata"]): string {
  const parts: string[] = []

  if (metadata.title) parts.push(`Title: ${metadata.title}`)
  if (metadata.actor) parts.push(`From: ${metadata.actor}`)
  parts.push(`Source: ${signal.sourceType}`)

  // Build safe content from metadata — never include rawContentRef body text
  const safe = { ...signal.metadata }
  // Explicitly exclude known dangerous keys
  const dangerousKeys = ["rawContent", "body", "html", "text", "fileContent", "pageBody", "message", "secret", "token", "api_key"]
  for (const key of dangerousKeys) {
    delete safe[key]
  }

  const remaining = Object.entries(safe)
    .filter(([, v]) => typeof v === "string" && v.length > 0)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n")

  if (remaining) parts.push(remaining)
  return parts.join("\n")
}

function detectRiskFlags(text: string, _signal: ExternalSignal): RiskFlag[] {
  void _signal;
  const flags: RiskFlag[] = []

  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      flags.push("prompt_injection_detected")
      break
    }
  }

  // Check if source content contains system-like instructions
  if (/you (must|should|need to|have to) (respond|reply|answer|output|return|generate|create|send|post)/i.test(text)) {
    if (!flags.includes("prompt_injection_detected")) {
      flags.push("source_content_includes_instruction")
    }
  }

  return flags
}
