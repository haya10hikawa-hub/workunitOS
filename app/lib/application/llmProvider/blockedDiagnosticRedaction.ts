/**
 * Phase 2D: Blocked Diagnostic Redaction
 *
 * Ensures blocked diagnostic findings never expose raw forbidden
 * values. Replaces valuePreview with safe metadata only.
 *
 * Live provider integration remains No-Go.
 */

/** Safe metadata exposed in blocked diagnostics. */
export type SafeBlockedDiagnostic = {
  readonly path: string
  readonly key: string
  readonly reason: string
  readonly category: "forbidden_key" | "forbidden_value" | "forbidden_context"
  readonly severity: "p0" | "warning"
  readonly valueType?: string
  readonly valueLength?: number
}

/** Unsafe shape that may still carry valuePreview. */
export type UnsafeFinding = {
  readonly path: string
  readonly key: string
  readonly reason: string
  readonly valuePreview?: string
}

/**
 * Convert a single finding to a safe diagnostic.
 * Never copies valuePreview into the output.
 */
export function toSafeDiagnostic(finding: UnsafeFinding): SafeBlockedDiagnostic {
  return {
    path: finding.path,
    key: finding.key,
    reason: finding.reason,
    category: finding.reason.endsWith("_value") ? "forbidden_value"
      : finding.reason.endsWith("_key") ? "forbidden_key"
      : "forbidden_context",
    severity: "p0",
    valueType: finding.valuePreview !== undefined ? typeof finding.valuePreview : undefined,
    valueLength: finding.valuePreview !== undefined ? finding.valuePreview.length : undefined,
  }
}

/**
 * Convert an array of findings, redacting all valuePreviews.
 */
export function toSafeDiagnostics(findings: readonly UnsafeFinding[]): readonly SafeBlockedDiagnostic[] {
  return findings.map(toSafeDiagnostic)
}

/**
 * Check whether a serialized result contains raw forbidden value exposure.
 */
export function containsValuePreview(serialized: string): boolean {
  return serialized.includes('"valuePreview"')
    || serialized.includes("valuePreview:")
}
