export type SourceType = "slack" | "notion" | "gmail" | "calendar";

export type SecretaryEvent = {
  id: string;
  source: SourceType;
  actor: string;
  title: string;
  impact: number;
  urgency: number;
  actorWeight: number;
  effort: number;
};

export function calculateRoi(event: SecretaryEvent): number {
  const safeEffort = Number.isFinite(event.effort) ? event.effort : 0;
  if (safeEffort <= 0) return 0;
  const values = [event.impact, event.urgency, event.actorWeight];
  if (values.some((value) => !Number.isFinite(value) || value < 0)) return 0;
  return Math.round((event.impact * event.urgency * event.actorWeight) / safeEffort);
}

export function shouldInterrupt(event: SecretaryEvent, threshold = 50): boolean {
  if (!event.id || !event.actor || !event.title) return false;
  return calculateRoi(event) >= Math.max(1, threshold);
}

export function buildVoicePrompt(event: SecretaryEvent): string {
  const roi = calculateRoi(event);
  return `お仕事中恐れ入ります。${event.source}で${event.actor}さんから「${event.title}」が入りました。現在のROIは${roi}です。今すぐ1秒で判断しますか？`;
}

export function buildExecutionTask(event: SecretaryEvent) {
  return {
    kind: "workunit_push",
    title: event.title,
    source: event.source,
    actor: event.actor,
    roi: calculateRoi(event),
    nextAction: "issue_draft",
  } as const;
}
