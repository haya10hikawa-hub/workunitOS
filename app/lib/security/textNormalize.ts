/**
 * Security Text Normalization
 *
 * Red-team finding (Attacker C, C-01/C-02/C-04/C-05): every pattern-based
 * guard in the system (prompt-injection regexes, forbidden-metadata-key
 * matching, raw-data ingress scans) operated on ASCII-only comparisons.
 * Unicode homoglyphs (Cyrillic/Greek lookalikes), zero-width characters,
 * and compatibility characters bypassed all of them — e.g. `sеcret` (Cyrillic
 * `е`) sailed past the forbidden-key filter, and `іgnore previous instructions`
 * (Cyrillic `і`) defeated the injection detector.
 *
 * This module canonicalizes untrusted text BEFORE any security-relevant
 * comparison so that visually-identical attacks collapse to their ASCII form.
 *
 * IMPORTANT: the normalized form is for DETECTION ONLY. The original content
 * is still treated as untrusted; normalization never makes content "safe".
 */

// Zero-width / invisible characters used to split keywords across a regex.
// U+00AD soft hyphen, U+200B-200D zero-width space/(non-)joiner,
// U+2060 word joiner, U+FEFF BOM, U+180E Mongolian vowel separator.
const INVISIBLE_CHARS = new RegExp("[\\u00AD\\u200B\\u200C\\u200D\\u2060\\uFEFF\\u180E]", "g")

// Confusable folding: map common non-Latin homoglyphs to their ASCII
// lookalike. This is intentionally focused on the Latin-lookalike subset of
// Cyrillic and Greek (the practical bypass alphabet) rather than the full
// Unicode confusables table.
const CONFUSABLES: Readonly<Record<string, string>> = {
  // ── Cyrillic → Latin (lowercase) ──
  "а": "a", "е": "e", "о": "o", "р": "p", "с": "c",
  "у": "y", "х": "x", "і": "i", "ј": "j", "ѕ": "s",
  "ԛ": "q", "ԝ": "w", "к": "k", "м": "m", "н": "h",
  "т": "t", "в": "v", "б": "b", "г": "r", "л": "n",
  // ── Cyrillic → Latin (uppercase) ──
  "А": "a", "В": "b", "Е": "e", "К": "k", "М": "m",
  "Н": "h", "О": "o", "Р": "p", "С": "c", "Т": "t",
  "Х": "x", "І": "i", "Ј": "j", "Ѕ": "s", "П": "n",
  // ── Greek → Latin ──
  "ο": "o", "ι": "i", "ν": "v", "α": "a", "ε": "e",
  "ρ": "p", "υ": "y", "κ": "k", "χ": "x", "τ": "t",
  "Ο": "o", "Ι": "i", "Α": "a", "Ε": "e", "Ρ": "p",
  "Κ": "k", "Τ": "t", "Χ": "x", "Β": "b", "Μ": "m",
  "Η": "h", "Ν": "n",
}

/**
 * Fold confusable homoglyphs to their ASCII lookalike (lowercased input
 * assumed by the caller where case-insensitivity is desired).
 */
export function foldConfusables(input: string): string {
  let out = ""
  for (const ch of input) {
    out += CONFUSABLES[ch] ?? ch
  }
  return out
}

/**
 * Canonicalize untrusted text for security scanning:
 *   1. Unicode NFKC normalization (folds fullwidth/compatibility forms)
 *   2. Strip zero-width / invisible characters
 *   3. Fold Latin-lookalike Cyrillic/Greek homoglyphs to ASCII
 *
 * The result is suitable for case-insensitive pattern matching. It is a
 * detection aid only and must never be presented back to the user or stored
 * as if it were the trusted original.
 */
export function normalizeForSecurityScan(input: string): string {
  const nfkc = input.normalize("NFKC")
  const stripped = nfkc.replace(INVISIBLE_CHARS, "")
  return foldConfusables(stripped)
}
