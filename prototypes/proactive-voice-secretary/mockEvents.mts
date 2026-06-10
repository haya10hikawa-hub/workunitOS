import type { SecretaryEvent } from "./engine.mts";

export const mockEvents: SecretaryEvent[] = [
  {
    id: "slack-urgent-review",
    source: "slack",
    actor: "田中",
    title: "本番障害の暫定対応レビュー",
    impact: 10,
    urgency: 9,
    actorWeight: 8,
    effort: 8,
  },
  {
    id: "notion-weekly-note",
    source: "notion",
    actor: "佐藤",
    title: "週次メモの確認",
    impact: 3,
    urgency: 2,
    actorWeight: 4,
    effort: 6,
  },
  {
    id: "calendar-deadline",
    source: "calendar",
    actor: "山田",
    title: "本日18時締切の意思決定",
    impact: 8,
    urgency: 10,
    actorWeight: 7,
    effort: 7,
  },
];
