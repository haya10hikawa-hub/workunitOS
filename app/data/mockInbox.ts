import type { InboxEvent } from "@/types/inbox"

export const mockInbox: InboxEvent[] = [
  {
    id: "evt-1",
    signal: "Large customer renewal stalled after compliance questions",
    source: "sales@enterprise",
    time: "08:15",
    icon: "●",
    severity: "critical",
    workUnitId: "wu-1",
  },
  {
    id: "evt-2",
    signal: "Model usage costs spiked 18% after prompt expansion rollout",
    source: "ops-monitor",
    time: "09:40",
    icon: "▲",
    severity: "high",
    workUnitId: "wu-2",
  },
  {
    id: "evt-3",
    signal: "Onboarding users abandon Studio after drafting the first brief",
    source: "product-analytics",
    time: "10:05",
    icon: "◆",
    severity: "medium",
    workUnitId: "wu-3",
  },
  {
    id: "evt-4",
    signal: "Task completion lag detected in multi-step editorial flows",
    source: "workflow-agent",
    time: "11:22",
    icon: "■",
    severity: "medium",
    workUnitId: "wu-4",
  },
]
