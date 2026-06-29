/**
 * Candidate-only WorkUnit Bridge tests.
 *
 * Proves the bridge is candidate-only and cannot emit forbidden data:
 *   - mode: candidate_only, source: mock_candidate_pipeline (default)
 *   - safety metadata literals (no execution, no approval, no provider call)
 *   - every candidate is candidateOnly + humanReviewRequired
 *   - forbidden fields are absent from every candidate
 *   - candidates adapt into LauncherWorkUnit
 *   - bridge does not call /api/workunit/tools, does not import real providers
 *   - allowlist projection drops unsafe input fields
 *
 * The forbidden-key strings below are negative-control data, not product data.
 */

import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { candidateWorkUnitBridge } from "../app/lib/application/candidate/candidateWorkUnitBridge.ts"
import {
  projectSafeWorkUnitCandidate,
  FORBIDDEN_CANDIDATE_FIELDS,
  SAFE_WORK_UNIT_CANDIDATE_FIELDS,
} from "../app/lib/application/candidate/safeWorkUnitCandidate.ts"
import { candidateToLauncherWorkUnit } from "../app/lib/application/launcher/candidateToLauncherWorkUnit.ts"

const BRIDGE_SRC = readFileSync(
  join(import.meta.dirname!, "../app/lib/application/candidate/candidateWorkUnitBridge.ts"),
  "utf-8",
)
const CANDIDATE_SRC = readFileSync(
  join(import.meta.dirname!, "../app/lib/application/candidate/safeWorkUnitCandidate.ts"),
  "utf-8",
)

function forbiddenKeysOf(value: unknown): string[] {
  const found: string[] = []
  const walk = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(walk)
      return
    }
    if (node && typeof node === "object") {
      for (const key of Object.keys(node as Record<string, unknown>)) {
        if ((FORBIDDEN_CANDIDATE_FIELDS as readonly string[]).includes(key)) found.push(key)
        walk((node as Record<string, unknown>)[key])
      }
    }
  }
  walk(value)
  return found
}

// 1
test("returns mode: candidate_only", () => {
  assert.equal(candidateWorkUnitBridge().mode, "candidate_only")
})

// 2
test("returns source: mock_candidate_pipeline by default", () => {
  assert.equal(candidateWorkUnitBridge().source, "mock_candidate_pipeline")
})

// 3
test("safety.externalExecutionEnabled is false", () => {
  assert.equal(candidateWorkUnitBridge().safety.externalExecutionEnabled, false)
})

// 4
test("safety.approvalCreationEnabled is false", () => {
  assert.equal(candidateWorkUnitBridge().safety.approvalCreationEnabled, false)
})

// 5
test("safety.providerCallsEnabled is false", () => {
  assert.equal(candidateWorkUnitBridge().safety.providerCallsEnabled, false)
})

// 6
test("safety.humanReviewRequired is true", () => {
  assert.equal(candidateWorkUnitBridge().safety.humanReviewRequired, true)
})

// 7
test("safety.containsRawPayload is false", () => {
  assert.equal(candidateWorkUnitBridge().safety.containsRawPayload, false)
})

// 8
test("all workUnits have candidateOnly true", () => {
  const { workUnits } = candidateWorkUnitBridge()
  assert.ok(workUnits.length > 0)
  for (const wu of workUnits) assert.equal(wu.candidateOnly, true)
})

// 9
test("all workUnits have humanReviewRequired true", () => {
  for (const wu of candidateWorkUnitBridge().workUnits) assert.equal(wu.humanReviewRequired, true)
})

// 10
test("forbidden fields are absent from every candidate (deep)", () => {
  for (const wu of candidateWorkUnitBridge().workUnits) {
    assert.deepEqual(forbiddenKeysOf(wu), [], `candidate ${wu.id} must not contain forbidden keys`)
  }
})

// 11
test("bridge output can be adapted into LauncherWorkUnit", () => {
  const { workUnits } = candidateWorkUnitBridge()
  const launcher = candidateToLauncherWorkUnit(workUnits[0]!)
  assert.equal(launcher.id, workUnits[0]!.id)
  assert.equal(launcher.title, workUnits[0]!.title)
  assert.ok(launcher.sourceIcon)
  assert.deepEqual(forbiddenKeysOf(launcher), [])
})

// 12
test("bridge never calls /api/workunit/tools", () => {
  assert.equal(BRIDGE_SRC.includes("/api/workunit/tools"), false)
})

// 13
test("bridge does not import real providers or use fetch/process.env", () => {
  for (const sdk of ["openai", "@anthropic-ai", "deepseekProvider", "createDeepseek", "gemini", "ollama"]) {
    assert.equal(BRIDGE_SRC.includes(sdk), false, `bridge must not reference ${sdk}`)
    assert.equal(CANDIDATE_SRC.includes(sdk), false, `candidate contract must not reference ${sdk}`)
  }
  assert.equal(BRIDGE_SRC.includes("fetch("), false)
  assert.equal(BRIDGE_SRC.includes("process.env"), false)
})

// 14
test("allowlist projection excludes unsafe input fields", () => {
  const unsafe: Record<string, unknown> = {
    id: "candidate:x",
    title: "Safe title",
    // forbidden / unsafe fields that MUST be dropped:
    approvalId: "appr_1",
    targetHash: "deadbeef",
    payloadHash: "cafebabe",
    tenantId: "tenant-1",
    actorUserId: "user-1",
    role: "admin",
    rawPayload: { secretBody: "x" },
    providerPayload: { sk: "sk-xxx" },
    token: "sk-live-123",
    secret: "shh",
    authorization: "Bearer abc",
    cookie: "session=1",
    unexpectedExtra: "nope",
  }
  const projected = projectSafeWorkUnitCandidate(unsafe)
  assert.deepEqual(forbiddenKeysOf(projected), [])
  assert.equal((projected as Record<string, unknown>).unexpectedExtra, undefined)
  // Output key set is exactly the allowlist.
  assert.deepEqual(
    Object.keys(projected).sort(),
    [...SAFE_WORK_UNIT_CANDIDATE_FIELDS].sort(),
  )
  // Safe values still pass through; literals forced.
  assert.equal(projected.title, "Safe title")
  assert.equal(projected.candidateOnly, true)
  assert.equal(projected.humanReviewRequired, true)
})
