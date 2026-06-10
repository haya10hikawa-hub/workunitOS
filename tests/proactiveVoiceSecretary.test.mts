import test from "node:test";
import assert from "node:assert/strict";
import {
  buildExecutionTask,
  buildVoicePrompt,
  calculateRoi,
  shouldInterrupt,
  type SecretaryEvent,
} from "../prototypes/proactive-voice-secretary/engine.mts";

const event: SecretaryEvent = {
  id: "e1",
  source: "slack",
  actor: "田中",
  title: "緊急確認",
  impact: 10,
  urgency: 9,
  actorWeight: 8,
  effort: 8,
};

test("calculateRoi guards invalid effort", () => {
  assert.equal(calculateRoi({ ...event, effort: 0 }), 0);
  assert.equal(calculateRoi({ ...event, effort: Number.NaN }), 0);
});

test("shouldInterrupt applies threshold and required fields", () => {
  assert.equal(shouldInterrupt(event, 50), true);
  assert.equal(shouldInterrupt({ ...event, title: "" }, 50), false);
  assert.equal(shouldInterrupt(event, 100), false);
});

test("prompt and execution task preserve ROI context", () => {
  assert.match(buildVoicePrompt(event), /現在のROIは90/);
  assert.deepEqual(buildExecutionTask(event), {
    kind: "workunit_push",
    title: "緊急確認",
    source: "slack",
    actor: "田中",
    roi: 90,
    nextAction: "issue_draft",
  });
});
