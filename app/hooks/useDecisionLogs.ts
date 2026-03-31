"use client"

import { useState } from "react"
import type { DecisionLog } from "@/types/decision"

export function useDecisionLogs() {
  const [decisionLogs, setDecisionLogs] = useState<DecisionLog[]>([])

  const logDecision = (log: DecisionLog) => {
    setDecisionLogs((prev) => [...prev, log])
    console.info("[DecisionLog]", log)
  }

  return { decisionLogs, logDecision }
}
