import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const MUTATING_ROUTES = [
  "app/api/workunit/tools/route.ts",
  "app/api/workunit/[id]/approval/route.ts",
  "app/api/workunit/[id]/feedback/route.ts",
  "app/api/workunit/[id]/action-preview/route.ts",
  "app/api/workunit/[id]/execution/dry-run/route.ts",
]

test("P0: every current mutating WorkUnit route enforces CSRF origin", async () => {
  for (const path of MUTATING_ROUTES) {
    const source = await readFile(path, "utf8")
    assert.ok(source.includes("validateCsrfOrigin(request)"), path)
  }
})

test("P0: legacy provider selector cannot import a real provider", async () => {
  const source = await readFile("app/lib/llm/providerConfig.ts", "utf8")
  assert.equal(source.includes("deepseekProvider"), false)
  assert.equal(source.includes("createDeepSeekProvider"), false)
})

test("P0: GitHub source resolver cannot select the real client", async () => {
  const source = await readFile("app/lib/infrastructure/external/github/resolveGitHubSource.ts", "utf8")
  assert.equal(source.includes("realGitHubClient"), false)
  assert.ok(source.includes('mode === "real") return "real_disabled"'))
})
