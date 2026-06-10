import assert from "node:assert/strict"
import test from "node:test"

import { mockSourceHopperEvents } from "../app/data/mockSourceHopperResults.ts"
import { sanitizeSourceEvents } from "../app/lib/sourceHoppers.ts"
import { candidateToWorkUnitDraft } from "../app/lib/workUnitDrafts.ts"
import {
  buildProactiveVoicePrompt,
  createVoicePushMetricLog,
  evaluateInterruptibility,
  evaluateVoicePush,
  parseVoiceIntent,
  scheduleDeferredPush,
  summarizeVoicePushMetrics,
} from "../app/lib/workUnitVoicePush.ts"

const [candidate] = sanitizeSourceEvents(mockSourceHopperEvents)
const draft = candidateToWorkUnitDraft(candidate, "2026-06-08T10:30:00+09:00")

test("Phase 5 fixes proactive voice prompt and limits voice intents", () => {
  const result = evaluateVoicePush(draft, { threshold: 40, state: {}, now: "2026-06-08T10:31:00+09:00" })

  assert.equal(result.shouldSpeak, true)
  assert.equal(result.prompt, buildProactiveVoicePrompt(draft, result.decision))
  assert.equal(parseVoiceIntent("はい"), "accept")
  assert.equal(parseVoiceIntent("うるさい"), "reject")
  assert.equal(parseVoiceIntent("あとで"), "defer")
  assert.equal(parseVoiceIntent("これは違う"), "correct")
  assert.equal(parseVoiceIntent("Slackに送って"), null)
})

test("Phase 5 blocks voice push by interruptibility and cooldown", () => {
  const meeting = evaluateVoicePush(draft, { threshold: 40, state: { inMeeting: true, inFocus: true }, now: "2026-06-08T10:31:00+09:00" })
  const cooldown = evaluateVoicePush(draft, {
    threshold: 40,
    now: "2026-06-08T10:31:00+09:00",
    lastPushedAt: "2026-06-08T10:30:30+09:00",
    cooldownMs: 120_000,
  })

  assert.equal(evaluateInterruptibility({ inMeeting: true, inFocus: true }).blocked, true)
  assert.equal(meeting.shouldSpeak, false)
  assert.equal(cooldown.shouldSpeak, false)
  assert.ok(cooldown.reasons.includes("cooldown_active"))
})

test("Phase 5 schedules defer and measures push quality logs", () => {
  const at = "2026-06-08T10:30:00+09:00"
  const logs = [
    createVoicePushMetricLog("mis_push", draft, "rejected_after_push", at),
    createVoicePushMetricLog("over_push", draft, "cooldown_violation", at),
    createVoicePushMetricLog("missed_push", draft, "accepted_without_push", at),
  ].filter((log) => log !== null)
  const summary = summarizeVoicePushMetrics(logs)

  assert.equal(scheduleDeferredPush(at, 15), "2026-06-08T01:45:00.000Z")
  assert.equal(scheduleDeferredPush("invalid", 15), null)
  assert.equal(summary.mis_push.count, 1)
  assert.equal(summary.over_push.rate, 1 / 3)
  assert.equal(summary.missed_push.count, 1)
})
