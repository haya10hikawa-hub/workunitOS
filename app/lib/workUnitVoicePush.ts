import type { WorkUnitDraft, WorkUnitJudgmentAction } from "../types/sourceHopper"
import { evaluatePushDecision, type PushDecision } from "./workUnitRanking.ts"

export type VoiceIntent = Extract<WorkUnitJudgmentAction, "accept" | "reject" | "defer" | "correct">
export type VoicePushMetricKind = "mis_push" | "over_push" | "missed_push"
export type InterruptibilityState = { now?: string; inMeeting?: boolean; inFocus?: boolean; isNight?: boolean }
export type VoicePushMetricLog = { kind: VoicePushMetricKind; draftId: string; reason: string; createdAt: string }

export function buildProactiveVoicePrompt(draft: WorkUnitDraft, decision: Pick<PushDecision, "roi">): string {
  const actor = draft.actors[0] ?? "不明な相手"
  return `お仕事中恐れ入ります。${actor}から「${draft.title}」。現在のROIは${decision.roi}です。今すぐ1秒で判断しますか？`
}

export function parseVoiceIntent(input: string): VoiceIntent | null {
  const text = input.trim().toLowerCase()
  if (!text) return null
  if (/^(yes|y|ok|accept|承認|はい|やる|実行)$/.test(text)) return "accept"
  if (/^(no|n|reject|stop|却下|いいえ|うるさい|不要)$/.test(text)) return "reject"
  if (/^(later|defer|hold|pending|保留|あとで|後で)$/.test(text)) return "defer"
  if (/^(correct|fix|wrong|修正|違う|これは違う)$/.test(text)) return "correct"
  return null
}

export function evaluateInterruptibility(state: InterruptibilityState = {}): { score: number; blocked: boolean; reasons: string[] } {
  const reasons = [state.inMeeting ? "in_meeting" : "", state.inFocus ? "in_focus" : "", state.isNight ? "night" : ""].filter(Boolean)
  const penalty = (state.inMeeting ? 0.55 : 0) + (state.inFocus ? 0.35 : 0) + (state.isNight ? 0.4 : 0)
  const score = Math.max(0, Math.min(1, 1 - penalty))
  return { score, blocked: score <= 0.25, reasons }
}

export function evaluateVoicePush(
  draft: WorkUnitDraft,
  options: { now?: string; threshold?: number; lastPushedAt?: string; cooldownMs?: number; state?: InterruptibilityState } = {},
): { shouldSpeak: boolean; prompt: string | null; decision: PushDecision; reasons: string[] } {
  const interruptibility = evaluateInterruptibility(options.state)
  const decision = evaluatePushDecision(draft, { threshold: options.threshold, interruptibility: interruptibility.score })
  const cooldownActive = isCooldownActive(options.now, options.lastPushedAt, options.cooldownMs)
  const shouldSpeak = decision.shouldPush && !interruptibility.blocked && !cooldownActive
  const reasons = [...decision.reasons, ...interruptibility.reasons, ...(cooldownActive ? ["cooldown_active"] : [])]
  return { shouldSpeak, prompt: shouldSpeak ? buildProactiveVoicePrompt(draft, decision) : null, decision, reasons }
}

export function scheduleDeferredPush(now: string, minutes = 30): string | null {
  const startedAt = Date.parse(now)
  if (!Number.isFinite(startedAt) || minutes <= 0) return null
  return new Date(startedAt + minutes * 60_000).toISOString()
}

export function createVoicePushMetricLog(kind: VoicePushMetricKind, draft: WorkUnitDraft, reason: string, now: string): VoicePushMetricLog | null {
  if (!draft.id || !reason || !Number.isFinite(Date.parse(now))) return null
  return { kind, draftId: draft.id, reason, createdAt: new Date(Date.parse(now)).toISOString() }
}

export function summarizeVoicePushMetrics(logs: readonly VoicePushMetricLog[]): Record<VoicePushMetricKind, { count: number; rate: number }> {
  const total = Math.max(1, logs.length)
  return {
    mis_push: metricSummary(logs, "mis_push", total),
    over_push: metricSummary(logs, "over_push", total),
    missed_push: metricSummary(logs, "missed_push", total),
  }
}

function isCooldownActive(now?: string, lastPushedAt?: string, cooldownMs = 300_000): boolean {
  if (!now || !lastPushedAt || cooldownMs <= 0) return false
  const elapsed = Date.parse(now) - Date.parse(lastPushedAt)
  return Number.isFinite(elapsed) && elapsed >= 0 && elapsed < cooldownMs
}

function metricSummary(logs: readonly VoicePushMetricLog[], kind: VoicePushMetricKind, total: number): { count: number; rate: number } {
  const count = logs.filter((log) => log.kind === kind).length
  return { count, rate: count / total }
}
