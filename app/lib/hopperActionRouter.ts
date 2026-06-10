export type HopperCommitRoute = "note" | "workunit"
export type HopperCommitNextAction = "defer" | "create"
export type HopperConnectionSurface = "issue" | "task" | "research_note" | "note"

export type HopperRoutableItem = {
  id: string
  scopeKey: string
  score: number
  threshold: number
  title: string
  summary: string
  sourceUrl?: string
}

export type HopperCommitEvent = {
  id: string
  action: "keep" | "discard"
  route?: HopperCommitRoute
  nextAction?: HopperCommitNextAction
  latencyMs: number
  score: number
}

export type HopperRoutedOutcome =
  | {
      type: "drop"
      sourceItemId: string
      memoryEffect: "M_reject"
      reason: "explicit_discard"
    }
  | {
      type: "note"
      sourceItemId: string
      targetSurface: "note"
      title: string
      summary: string
      reentryCondition: string
    }
  | {
      type: "workunit_draft"
      draft: HopperWorkUnitDraft
    }

export type HopperWorkUnitDraft = {
  sourceItemId: string
  sourceScope: string
  sourceUrl?: string
  title: string
  situation: string
  problem: string
  whyNow: string
  connection: HopperConnectionDraft
  suggestedTasks: string[]
  targetSurface: Exclude<HopperConnectionSurface, "note">
  confidence: number
  status: "deferred" | "create_ready"
}

export type HopperConnectionDraft =
  | {
      targetSurface: "issue"
      problem: string
      acceptanceCriteria: string[]
      implementationHint: string
      sourceUrl?: string
    }
  | {
      targetSurface: "task"
      nextAction: string
      ownerHint: string
      blocker: string
      deadlineHint: string
    }
  | {
      targetSurface: "research_note"
      claim: string
      whyItMatters: string
      decisionImpact: string
      followUpQuestion: string
    }

export type HopperConnectionPreview = {
  targetSurface: HopperConnectionSurface
  label: string
  why: string
  nextItems: string[]
}

export function routeHopperCommit(
  item: HopperRoutableItem | undefined,
  event: HopperCommitEvent,
): HopperRoutedOutcome | null {
  if (!item) return null

  if (event.action === "discard") {
    return {
      type: "drop",
      sourceItemId: item.id,
      memoryEffect: "M_reject",
      reason: "explicit_discard",
    }
  }

  if (event.route === "note") {
    return {
      type: "note",
      sourceItemId: item.id,
      targetSurface: "note",
      title: item.title,
      summary: item.summary,
      reentryCondition: "Raise priority if similar signals recur or the source is revisited.",
    }
  }

  if (event.route === "workunit") {
    return {
      type: "workunit_draft",
      draft: createWorkUnitDraft(item, event),
    }
  }

  return {
    type: "note",
    sourceItemId: item.id,
    targetSurface: "note",
    title: item.title,
    summary: item.summary,
    reentryCondition: "Keep as an unresolved candidate until routing is explicit.",
  }
}

function createWorkUnitDraft(
  item: HopperRoutableItem,
  event: HopperCommitEvent,
): HopperWorkUnitDraft {
  const confidence = clamp01(item.score)
  const targetSurface = inferTargetSurface(item)
  const connection = createConnectionDraft(item, targetSurface)
  const suggestedTasks = inferSuggestedTasks(item, targetSurface, connection)

  return {
    sourceItemId: item.id,
    sourceScope: item.scopeKey,
    sourceUrl: item.sourceUrl,
    title: normalizeTitle(item.title),
    situation: `A pushed ${item.scopeKey} signal passed Hopper screening and was routed toward execution.`,
    problem: inferProblem(item),
    whyNow: `Current WorkUnit margin is ${(item.score - item.threshold).toFixed(3)}; the signal is above the adaptive gate and should not remain passive reading material.`,
    connection,
    suggestedTasks,
    targetSurface,
    confidence,
    status: event.nextAction === "create" ? "create_ready" : "deferred",
  }
}

export function getHopperConnectionPreview(
  item: HopperRoutableItem,
  route: HopperCommitRoute = "workunit",
): HopperConnectionPreview {
  if (route === "note") {
    return {
      targetSurface: "note",
      label: "Open Note",
      why: "Useful signal, but not executable enough to become a WorkUnit.",
      nextItems: [
        "Keep in M_open",
        "Re-raise if similar signals recur",
        "Do not create execution work yet",
      ],
    }
  }

  const targetSurface = inferTargetSurface(item)
  const connection = createConnectionDraft(item, targetSurface)

  if (connection.targetSurface === "issue") {
    return {
      targetSurface,
      label: "GitHub Issue Draft",
      why: connection.problem,
      nextItems: connection.acceptanceCriteria,
    }
  }

  if (connection.targetSurface === "research_note") {
    return {
      targetSurface,
      label: "Research Note",
      why: connection.decisionImpact,
      nextItems: [connection.claim, connection.whyItMatters, connection.followUpQuestion],
    }
  }

  return {
    targetSurface,
    label: "Task Draft",
    why: connection.nextAction,
    nextItems: [connection.ownerHint, connection.blocker, connection.deadlineHint],
  }
}

function inferTargetSurface(item: HopperRoutableItem): Exclude<HopperConnectionSurface, "note"> {
  const scope = item.scopeKey.toLowerCase()
  const text = `${item.title} ${item.summary}`.toLowerCase()

  if (scope.includes("github_star") || scope.includes("repo")) return "issue"
  if (
    scope.includes("rss") ||
    scope.includes("newsletter") ||
    scope.includes("news") ||
    text.includes("research") ||
    text.includes("trend") ||
    text.includes("competitor")
  ) {
    return "research_note"
  }

  if (
    scope.includes("sns") ||
    scope.includes("share") ||
    scope.includes("slack") ||
    scope.includes("gmail") ||
    scope.includes("x_bookmark")
  ) {
    return "task"
  }

  return "task"
}

function createConnectionDraft(
  item: HopperRoutableItem,
  targetSurface: Exclude<HopperConnectionSurface, "note">,
): HopperConnectionDraft {
  if (targetSurface === "issue") {
    const problem = inferProblem(item)

    return {
      targetSurface,
      problem,
      acceptanceCriteria: [
        "Implementation implication is stated in one sentence",
        "Acceptance criteria are explicit enough for an issue",
        "A benchmark, code change, or validation step is named",
      ],
      implementationHint: inferImplementationHint(item),
      sourceUrl: item.sourceUrl,
    }
  }

  if (targetSurface === "research_note") {
    return {
      targetSurface,
      claim: normalizeTitle(item.title),
      whyItMatters: "This signal may change prioritization or architecture direction.",
      decisionImpact: inferDecisionImpact(item),
      followUpQuestion: "What WorkUnit OS decision changes if this signal is true?",
    }
  }

  return {
    targetSurface,
    nextAction: `Clarify the execution step implied by: ${item.title}`,
    ownerHint: inferOwnerHint(item),
    blocker: "Execution owner and concrete next step are not confirmed yet.",
    deadlineHint: "No deadline inferred; schedule only after the owner confirms urgency.",
  }
}

function inferProblem(item: HopperRoutableItem): string {
  const lower = `${item.title} ${item.summary}`.toLowerCase()
  if (lower.includes("faiss") || lower.includes("cache") || lower.includes("vector")) {
    return "The current vector retrieval and threshold pipeline needs a concrete implementation or benchmark decision."
  }
  if (lower.includes("threshold") || lower.includes("ranking")) {
    return "The ranking gate needs a tighter rule for deciding which pushed signals become executable work."
  }
  return "The pushed signal may contain an actionable WorkUnit, but the next execution step is not yet explicit."
}

function inferSuggestedTasks(
  item: HopperRoutableItem,
  targetSurface: Exclude<HopperConnectionSurface, "note">,
  connection: HopperConnectionDraft,
): string[] {
  if (targetSurface === "issue") {
    const issueConnection = connection.targetSurface === "issue" ? connection : null
    return [
      `Open source context for: ${item.title}`,
      issueConnection?.implementationHint ?? "Extract implementation implication",
      "Create GitHub Issue only if the next code change is explicit",
    ]
  }

  if (targetSurface === "research_note") {
    const researchConnection = connection.targetSurface === "research_note" ? connection : null
    return [
      `Summarize signal: ${item.title}`,
      researchConnection?.followUpQuestion ?? "Extract one decision it changes for WorkUnit OS",
      "Promote to WorkUnit only if it implies a concrete build or strategy step",
    ]
  }

  const taskConnection = connection.targetSurface === "task" ? connection : null
  return [
    taskConnection?.nextAction ?? `Clarify action required by: ${item.title}`,
    taskConnection?.blocker ?? "Identify owner, blocker, and next step",
    "Convert to WorkUnit only if execution can start within the current project",
  ]
}

function inferImplementationHint(item: HopperRoutableItem): string {
  const lower = `${item.title} ${item.summary}`.toLowerCase()
  if (lower.includes("benchmark")) return "Define and run the smallest benchmark that changes the implementation choice."
  if (lower.includes("cache")) return "Specify cache key, invalidation boundary, and lookup fallback before writing code."
  if (lower.includes("vector")) return "Tie the signal to embedding dimension, nearest-neighbor search, or threshold behavior."
  return "Extract the smallest code or validation change implied by this source."
}

function inferDecisionImpact(item: HopperRoutableItem): string {
  const lower = `${item.title} ${item.summary}`.toLowerCase()
  if (lower.includes("ranking") || lower.includes("threshold")) {
    return "May change Hopper's screening threshold or ranking logic."
  }
  if (lower.includes("competitor") || lower.includes("market")) {
    return "May change positioning, prioritization, or integration order."
  }
  return "May change a WorkUnit OS product, architecture, or execution decision."
}

function inferOwnerHint(item: HopperRoutableItem): string {
  const scope = item.scopeKey.toLowerCase()
  if (scope.includes("slack") || scope.includes("gmail")) return "Message owner or requester"
  if (scope.includes("share")) return "Current project operator"
  return "WorkUnit OS pilot"
}

function normalizeTitle(title: string): string {
  return title.trim() || "Untitled Hopper WorkUnit"
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}
