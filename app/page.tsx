"use client"

import { useMemo, useState } from "react"
import { HopperMobileTui, type HopperQueueItem } from "@/components/hopper/HopperMobileTui"
import { WorkUnitOSDashboard } from "@/components/workunit-os/WorkUnitOSDashboard"
import { mockHopperInputs } from "@/data/mockHopperInputs"
import {
  getHopperConnectionPreview,
  routeHopperCommit,
  type HopperRoutedOutcome,
} from "@/lib/hopperActionRouter"
import { HopperEngine } from "@/lib/hopperEngine"
import { styles } from "@/styles/layoutStyles"
import type { AppLanguage } from "@/types/ui"

export default function Page() {
  const [language, setLanguage] = useState<AppLanguage>("ja")
  const [, setHopperLogs] = useState<
    Array<{
      itemId: string
      type: "commit" | "wrong"
      payload: unknown
      createdAt: string
    }>
  >([])
  const [, setHopperOutcomes] = useState<HopperRoutedOutcome[]>([])

  const hopperQueueItems = useMemo<HopperQueueItem[]>(() => {
    const engine = new HopperEngine({
      duplicateSimilarityThreshold: 0.97,
      maxDisplayItems: 5,
    })

    engine.setWorkContext([0.96, 0.24, 0.1, 0.04])
    engine.recordJudgment({
      itemId: "seed-keep-faiss",
      action: "keep",
      sourceType: "github_star",
      projectId: "workunit-os",
      embedding: [0.95, 0.22, 0.08, 0.04],
      decidedAt: 1_799_999_990_000,
      downstreamAction: "issue",
    })
    engine.recordJudgment({
      itemId: "seed-open-threshold",
      action: "open",
      sourceType: "rss",
      projectId: "workunit-os",
      embedding: [0.9, 0.3, 0.12, 0.03],
      decidedAt: 1_799_999_995_000,
    })

    return engine.process(mockHopperInputs).map(({ item, decision }) => {
      const queueItem = {
        id: item.id,
        scopeKey: decision.scopeKey,
        score: decision.score,
        threshold: decision.threshold,
        title: item.canonicalInput.title,
        summary: item.summary.join(" "),
        sourceUrl: item.canonicalInput.url,
      }

      return {
        ...queueItem,
        connectionPreview: getHopperConnectionPreview(queueItem, "workunit"),
        notePreview: getHopperConnectionPreview(queueItem, "note"),
      }
    })
  }, [])

  const hopperItemById = useMemo(
    () => new Map(hopperQueueItems.map((item) => [item.id, item])),
    [hopperQueueItems],
  )

  return (
    <div style={styles.root}>
      <div className="md:hidden">
        <HopperMobileTui
          items={hopperQueueItems}
          alpha={0.15}
          tDelay={0}
          language={language}
          onLanguageChange={setLanguage}
          onCommit={(event) => {
            const outcome = routeHopperCommit(hopperItemById.get(event.id), event)
            setHopperLogs((prev) => [
              ...prev,
              {
                itemId: event.id,
                type: "commit",
                payload: { event, outcome },
                createdAt: new Date().toISOString(),
              },
            ])
            if (outcome) {
              setHopperOutcomes((prev) => [...prev, outcome])
            }
          }}
          onWrongFeedback={(event) => {
            setHopperLogs((prev) => [
              ...prev,
              {
                itemId: event.id,
                type: "wrong",
                payload: event,
                createdAt: new Date().toISOString(),
              },
            ])
          }}
        />
      </div>

      <WorkUnitOSDashboard />
    </div>
  )
}
