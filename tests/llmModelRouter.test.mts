import test from "node:test"
import assert from "node:assert/strict"
import { getModelRoute } from "../app/lib/llm/modelRouter.ts"

// ─── Default Routes ─────────────────────────────────────────────

test("getModelRoute returns route for every stage", () => {
  const stages = ["sanitize_signal", "extract_candidate", "generate_workunit_draft", "evaluate_workunit", "generate_action_preview"]
  for (const stage of stages) {
    const route = getModelRoute(stage as Parameters<typeof getModelRoute>[0])
    assert.ok(route.model)
    assert.ok(route.maxOutputTokens >= 0)
    assert.ok(typeof route.temperature === "number")
  }
})

test("extract uses lower temperature than draft", () => {
  const extract = getModelRoute("extract_candidate")
  const draft = getModelRoute("generate_workunit_draft")
  assert.ok(extract.temperature <= draft.temperature)
})

test("all routes use deepseek provider", () => {
  const stages: Parameters<typeof getModelRoute>[0][] = ["extract_candidate", "generate_workunit_draft", "evaluate_workunit"]
  for (const stage of stages) {
    assert.equal(getModelRoute(stage).provider, "deepseek")
  }
})

// ─── Env Overrides ──────────────────────────────────────────────

test("per-stage model env var overrides default", () => {
  const route = getModelRoute("extract_candidate", {
    DEEPSEEK_MODEL_EXTRACT: "custom-extract-model",
  })
  assert.equal(route.model, "custom-extract-model")
})

test("per-stage model env var overrides for draft", () => {
  const route = getModelRoute("generate_workunit_draft", {
    DEEPSEEK_MODEL_DRAFT: "custom-draft-model",
  })
  assert.equal(route.model, "custom-draft-model")
})

test("per-stage model env var overrides for evaluate", () => {
  const route = getModelRoute("evaluate_workunit", {
    DEEPSEEK_MODEL_EVALUATE: "custom-eval-model",
  })
  assert.equal(route.model, "custom-eval-model")
})

test("DEEPSEEK_DEFAULT_MODEL fallback when per-stage not set", () => {
  const route = getModelRoute("extract_candidate", {
    DEEPSEEK_DEFAULT_MODEL: "fallback-model",
  })
  assert.equal(route.model, "fallback-model")
})

test("per-stage env var takes priority over DEEPSEEK_DEFAULT_MODEL", () => {
  const route = getModelRoute("extract_candidate", {
    DEEPSEEK_DEFAULT_MODEL: "fallback-model",
    DEEPSEEK_MODEL_EXTRACT: "extract-model",
  })
  assert.equal(route.model, "extract-model")
})

test("unknown env vars do not affect routing", () => {
  const route = getModelRoute("extract_candidate", {
    UNRELATED_VAR: "value",
  })
  assert.ok(route.model.length > 0)
})
