/**
 * Model Router
 *
 * Maps LLM pipeline stages to model configurations.
 * Supports environment variable overrides for per-stage DeepSeek models.
 */

import type { LlmProcessingStage } from "./types.ts"

// ─── Route ───────────────────────────────────────────────────────

export type ModelName = "deepseek-v4-pro" | "deepseek-v4-flash"

export type LlmModelRoute = {
  stage: LlmProcessingStage
  provider: "deepseek" | "mock"
  model: string
  temperature: number
  maxOutputTokens: number
}

// ─── Default Routes ──────────────────────────────────────────────

const DEFAULT_ROUTES: Record<LlmProcessingStage, Omit<LlmModelRoute, "stage">> = {
  sanitize_signal: {
    provider: "deepseek",
    model: "deepseek-chat",
    temperature: 0,
    maxOutputTokens: 0,
  },
  extract_candidate: {
    provider: "deepseek",
    model: "deepseek-chat",
    temperature: 0.1,
    maxOutputTokens: 500,
  },
  generate_workunit_draft: {
    provider: "deepseek",
    model: "deepseek-chat",
    temperature: 0.2,
    maxOutputTokens: 800,
  },
  evaluate_workunit: {
    provider: "deepseek",
    model: "deepseek-chat",
    temperature: 0,
    maxOutputTokens: 400,
  },
  generate_action_preview: {
    provider: "deepseek",
    model: "deepseek-chat",
    temperature: 0.1,
    maxOutputTokens: 600,
  },
}

// ─── Env Override Keys ──────────────────────────────────────────

const STAGE_MODEL_ENV: Partial<Record<LlmProcessingStage, string>> = {
  extract_candidate: "DEEPSEEK_MODEL_EXTRACT",
  generate_workunit_draft: "DEEPSEEK_MODEL_DRAFT",
  evaluate_workunit: "DEEPSEEK_MODEL_EVALUATE",
  generate_action_preview: "DEEPSEEK_MODEL_ACTION_PREVIEW",
}

// ─── Resolution ──────────────────────────────────────────────────

/**
 * Resolve the model route for a given stage.
 *
 * Falls back:
 *   1. Per-stage env var (DEEPSEEK_MODEL_EXTRACT, etc.)
 *   2. DEEPSEEK_DEFAULT_MODEL
 *   3. Hardcoded default from DEFAULT_ROUTES
 */
export function getModelRoute(
  stage: LlmProcessingStage,
  env: { DEEPSEEK_DEFAULT_MODEL?: string } & Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): LlmModelRoute {
  const defaults = DEFAULT_ROUTES[stage]
  const envKey = STAGE_MODEL_ENV[stage]
  const model = (envKey ? env[envKey] : undefined) ?? env.DEEPSEEK_DEFAULT_MODEL ?? defaults.model

  return {
    stage,
    provider: defaults.provider,
    model,
    temperature: defaults.temperature,
    maxOutputTokens: defaults.maxOutputTokens,
  }
}
