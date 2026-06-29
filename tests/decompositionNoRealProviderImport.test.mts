/**
 * Phase 2A — static no-bypass guard.
 *
 * The decomposition AI runtime must never reach a real LLM provider SDK or a live
 * network call. This source-scan proves no file under app/lib/application/decomposition
 * imports a real provider SDK, imports an isolated real client module, calls fetch(,
 * or reads process.env. The mock boundary is the only generation entrypoint.
 *
 * Includes a positive control (an injected real-provider import must be caught) and a
 * negative control (clean mock-only source, including prose mentioning providers, must
 * pass) so the guard cannot silently rot into a no-op.
 */

import test from "node:test"
import assert from "node:assert/strict"
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"

const RUNTIME_DIR = "app/lib/application/decomposition"

// Real provider SDK package names that must never be imported into the AI runtime.
const FORBIDDEN_SDK_PACKAGES = ["openai", "cohere-ai", "ollama", "node-fetch", "axios"]
// Isolated real client modules that live elsewhere and must stay unreachable here.
const FORBIDDEN_LOCAL_MODULES = ["deepseekProvider", "realGitHubClient", "externalToolClients"]

type Violation = { readonly kind: string; readonly token: string }

function scanForRealProviderUse(source: string): Violation[] {
  const violations: Violation[] = []
  // import/require of a forbidden SDK package or a scoped provider SDK.
  const importLine = /\b(?:import|require)\b[^\n]*?["']([^"']+)["']/g
  for (const match of source.matchAll(importLine)) {
    const spec = match[1]
    if (FORBIDDEN_SDK_PACKAGES.includes(spec)) violations.push({ kind: "sdk_package_import", token: spec })
    if (/^@anthropic-ai\//.test(spec) || /^@google\//.test(spec) || /^@mistralai\//.test(spec)) {
      violations.push({ kind: "scoped_sdk_import", token: spec })
    }
    if (FORBIDDEN_LOCAL_MODULES.some((mod) => spec.includes(mod))) violations.push({ kind: "real_client_import", token: spec })
  }
  if (/\bfetch\s*\(/.test(source)) violations.push({ kind: "live_network_call", token: "fetch(" })
  if (/\bprocess\.env\b/.test(source)) violations.push({ kind: "runtime_env_read", token: "process.env" })
  return violations
}

async function runtimeFiles(): Promise<string[]> {
  const entries = await readdir(RUNTIME_DIR, { recursive: true, withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".ts")) continue
    const dir = (entry as unknown as { parentPath?: string; path?: string }).parentPath ?? (entry as unknown as { path: string }).path
    files.push(path.join(dir, entry.name))
  }
  return files
}

test("no decomposition runtime file imports a real provider SDK or makes a live call", async () => {
  const files = await runtimeFiles()
  assert.ok(files.length > 0, "expected to scan at least one runtime file")
  const offenders: string[] = []
  for (const file of files) {
    const violations = scanForRealProviderUse(await readFile(file, "utf8"))
    if (violations.length > 0) offenders.push(`${file}: ${violations.map((v) => `${v.kind}(${v.token})`).join(", ")}`)
  }
  assert.deepEqual(offenders, [], `real-provider use found in AI runtime:\n${offenders.join("\n")}`)
})

test("positive control: an injected real-provider import is caught", () => {
  const injectedSdk = `import OpenAI from ${JSON.stringify("openai")}\nexport const x = 1\n`
  const injectedScoped = `import { Anthropic } from ${JSON.stringify("@anthropic-ai/sdk")}\n`
  const injectedClient = `import { deepseekProvider } from ${JSON.stringify("../../llm/deepseekProvider.ts")}\n`
  const injectedFetch = `export async function go() { return fetch("https://example.test") }\n`
  const injectedEnv = `export const k = process.env.SECRET\n`
  assert.equal(scanForRealProviderUse(injectedSdk).some((v) => v.kind === "sdk_package_import"), true)
  assert.equal(scanForRealProviderUse(injectedScoped).some((v) => v.kind === "scoped_sdk_import"), true)
  assert.equal(scanForRealProviderUse(injectedClient).some((v) => v.kind === "real_client_import"), true)
  assert.equal(scanForRealProviderUse(injectedFetch).some((v) => v.kind === "live_network_call"), true)
  assert.equal(scanForRealProviderUse(injectedEnv).some((v) => v.kind === "runtime_env_read"), true)
})

test("negative control: clean mock-only source with provider prose does not false-positive", () => {
  const clean = [
    "// This module never calls a real provider SDK such as openai or anthropic.",
    "// It also never reads env or hits the network; the mock boundary is the only seam.",
    "import { createStaticMockDecompositionLlm } from \"./mockDecompositionLlm.ts\"",
    "export function build() { return createStaticMockDecompositionLlm({ text: \"safe\" }) }",
  ].join("\n")
  assert.deepEqual(scanForRealProviderUse(clean), [])
})
