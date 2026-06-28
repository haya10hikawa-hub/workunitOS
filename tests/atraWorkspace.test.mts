/**
 * Atra workspace (Action Field) tests.
 *
 * Locks the candidate-only safety invariants and the target design fidelity of
 * the Atra Node Canvas + Action Field. Forbidden-key strings below are negative
 * controls; static guards scan the product sources, not this test.
 */

import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { deriveAtraWorkspace } from "../app/lib/application/atra/atraWorkspaceModel.ts"
import { FORBIDDEN_CANDIDATE_FIELDS } from "../app/lib/application/candidate/safeWorkUnitCandidate.ts"

const COMPONENT = readFileSync(join(process.cwd(), "app/components/atra/AtraWorkspace.tsx"), "utf-8")
const MODEL = readFileSync(join(process.cwd(), "app/lib/application/atra/atraWorkspaceModel.ts"), "utf-8")
const CSS = readFileSync(join(process.cwd(), "app/components/atra/Atra.module.css"), "utf-8")
const LAUNCHER = readFileSync(join(process.cwd(), "app/components/workunit-os/launcher/WorkUnitLauncher.tsx"), "utf-8")

function deepForbiddenKeys(value: unknown): string[] {
  const found: string[] = []
  const walk = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(walk)
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

// ─── Model: candidate-only ────────────────────────────────────
test("Atra model is candidate-only and human-review-required", () => {
  const m = deriveAtraWorkspace()
  assert.equal(m.actionField.candidateOnly, true)
  assert.equal(m.actionField.humanReviewRequired, true)
  assert.equal(m.actionField.localEditsOnly, true)
})

test("Atra model emits no forbidden fields", () => {
  assert.deepEqual(deepForbiddenKeys(deriveAtraWorkspace()), [])
})

// ─── Model: target fidelity ───────────────────────────────────
test("Atra model reproduces the target node graph", () => {
  const m = deriveAtraWorkspace()
  assert.equal(m.workspaceTitle, "Quarterly Review Plan")
  assert.equal(m.coreObjective.label, "Quarterly review presentation")
  assert.equal(m.coreObjective.score, 79)
  assert.deepEqual(
    m.processNodes.map((n) => n.label),
    ["Orient", "Plan", "Compose", "Verify", "Resolve", "Review", ""],
  )
  const compose = m.processNodes.find((n) => n.id === "compose")!
  assert.equal(compose.state, "selected")
  assert.equal(compose.output?.label, "Slide Deck (v4)")
  assert.deepEqual(compose.badges.map((b) => b.code), ["NO", "DR"])
})

test("Atra model reproduces the target draft content", () => {
  const m = deriveAtraWorkspace()
  assert.equal(m.actionField.path, "Compose / Slide Deck (v4)")
  assert.equal(m.actionField.outputTitle, "Slide Deck")
  assert.equal(m.actionField.draftFilename, "editable.md")
  const h1 = m.actionField.draftBlocks.find((b) => b.kind === "h1")
  assert.equal(h1 && h1.kind === "h1" ? h1.text : null, "Q2 Performance Summary")
  // Colored source tokens exist in the draft.
  const tones = m.actionField.draftBlocks.flatMap((b) =>
    b.kind === "p" || b.kind === "bullet" ? b.spans.filter((s) => s.tone).map((s) => s.text) : [],
  )
  for (const code of ["SL", "DB", "NO", "GH", "EM"]) assert.ok(tones.includes(code), `token ${code}`)
})

// ─── Component: target UI strings ─────────────────────────────
test("Atra component renders the target shell labels", () => {
  for (const label of [
    ">Atra<", "Workspace", "Command Palette", "Action Field", "Output:",
    "Linked Context:", "Generated Draft", "Local edits only", "Safety Protocol",
    "Finalization Queue", "System Logs",
  ]) {
    assert.ok(COMPONENT.includes(label), `component should render ${label}`)
  }
})

// ─── Safety: no execution / forbidden routes / forbidden data ─
test("Atra surface has no execution CTA copy", () => {
  const cta = /\b(send|approve|execute|publish|finalize)\b/i
  assert.equal(cta.test(COMPONENT), false, "component CTA")
  assert.equal(cta.test(MODEL), false, "model CTA")
})

test("Atra surface has no forbidden runtime paths or providers", () => {
  for (const src of [COMPONENT, MODEL, LAUNCHER]) {
    assert.equal(src.includes("/api/workunit/tools"), false)
    assert.equal(src.includes("fetch("), false)
    assert.equal(src.includes("process.env"), false)
    for (const sdk of ["openai", "@anthropic-ai", "deepseekProvider", "createDeepseek"]) {
      assert.equal(src.includes(sdk), false, `provider ${sdk}`)
    }
  }
})

test("Atra surface emits no forbidden field identifiers", () => {
  for (const src of [COMPONENT, MODEL]) {
    for (const key of FORBIDDEN_CANDIDATE_FIELDS) {
      assert.equal(src.includes(key), false, `forbidden field ${key}`)
    }
  }
})

test("Atra component uses inline icons (no external icon package, no raster images)", () => {
  assert.equal(COMPONENT.includes("lucide-react"), false)
  assert.equal(CSS.includes(".png"), false)
  assert.equal(COMPONENT.includes("<img"), false)
  assert.equal(COMPONENT.includes(".png"), false)
})

// ─── Layout stability (viewport-independent graph) ─────────────

function cssBlock(selector: string): string {
  const at = CSS.indexOf(`${selector} {`)
  if (at < 0) return ""
  const start = CSS.indexOf("{", at)
  const end = CSS.indexOf("}", start)
  return CSS.slice(start, end + 1)
}

test("graph uses a stable graph-stage coordinate wrapper", () => {
  assert.ok(CSS.includes(".graphStage"), "CSS must define .graphStage")
  assert.ok(COMPONENT.includes("styles.graphStage"), "component must render the graph stage")
  // Stage is a fixed logical px size, not viewport-derived.
  assert.ok(COMPONENT.includes("STAGE_W") && COMPONENT.includes("STAGE_H"))
  assert.equal(/const STAGE_W = \d+/.test(COMPONENT), true)
  assert.equal(/const STAGE_H = \d+/.test(COMPONENT), true)
})

test("edge SVG and graph nodes live inside the same graph stage", () => {
  const stageIdx = COMPONENT.indexOf("styles.graphStage")
  const edgesIdx = COMPONENT.indexOf("styles.edges")
  const nodesIdx = COMPONENT.indexOf("ProcessNodeCard")
  const outputIdx = COMPONENT.indexOf("styles.outputNode")
  assert.ok(stageIdx > 0)
  assert.ok(stageIdx < edgesIdx, "edge SVG must be inside the graph stage")
  assert.ok(stageIdx < nodesIdx, "nodes must be inside the graph stage")
  assert.ok(stageIdx < outputIdx, "output node must be inside the graph stage")
})

test("edge SVG shares the node coordinate system (fixed viewBox, not stretched)", () => {
  assert.ok(COMPONENT.includes("viewBox={`0 0 ${STAGE_W} ${STAGE_H}`}"))
  assert.equal(COMPONENT.includes('preserveAspectRatio="none"'), false)
})

test("root card and process nodes use no viewport units or percentage positioning", () => {
  for (const selector of [".coreCard", ".node", ".outputNode", ".graphStage"]) {
    const block = cssBlock(selector)
    assert.ok(block.length > 0, `${selector} block must exist`)
    assert.equal(/\d(vw|vh)\b/.test(block), false, `${selector} must not use vw/vh`)
  }
  // Root card / node / output positions are not percentage-based in CSS.
  for (const selector of [".coreCard", ".node", ".outputNode"]) {
    const block = cssBlock(selector)
    assert.equal(/left:\s*\d+%/.test(block), false, `${selector} must not use percentage left`)
    assert.equal(/top:\s*\d+%/.test(block), false, `${selector} must not use percentage top`)
  }
  // Node graph tops are px, not percent.
  assert.equal(COMPONENT.includes("${top}px"), true)
  assert.equal(COMPONENT.includes("${top}%"), false)
})

test("Action Field column width is clamped (bounded), not fixed to viewport drift", () => {
  const body = cssBlock(".body")
  assert.ok(body.includes("grid-template-columns"))
  assert.ok(body.includes("clamp("), "Action Field column must be clamped")
})

test("typography stays in px (no viewport-scaled font sizes)", () => {
  assert.equal(/font-size:[^;]*\d(vw|vh)/.test(CSS), false)
  assert.equal(/font-size:\s*clamp\([^)]*vw/.test(CSS), false)
})
