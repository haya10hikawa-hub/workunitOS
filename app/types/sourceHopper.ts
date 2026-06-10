export type SourceKind = "slack" | "notion" | "gmail" | "google_drive" | "google_calendar"

export type SourceRef = {
  source: SourceKind
  externalId: string
  container?: string
  url?: string
  capturedAt: string
}

export type SourceHopperEvent = {
  id: string
  source: SourceKind
  title: string
  actor?: string
  actors?: string[]
  container?: string
  url?: string
  timestamp: string
  status?: string
  deadline?: string
  labels?: string[]
  metadata?: Record<string, string | number | boolean | null>
  rawContent?: string
}

export type SanitizedWorkUnitCandidate = {
  id: string
  sourceRef: SourceRef
  title: string
  actors: string[]
  situationHint: string
  problemHint: string
  deadlineHint: string
  impactHint: number
  urgencyHint: number
  actorWeightHint: number
  effortHint: number
  confidence: number
  tags: string[]
}

export type WorkUnitDraftStatus = "draft" | "accepted" | "deferred" | "rejected"

export type WorkUnitDraft = {
  id: string
  sourceCandidateIds: string[]
  status: WorkUnitDraftStatus
  title: string
  situation: string
  actors: string[]
  problem: string
  deadline: string
  impact: number
  urgency: number
  actorWeight: number
  effort: number
  nextAction: string
  tasks: string[]
  sources: string[]
  missingFields: string[]
  createdAt: string
  updatedAt: string
}

export type WorkUnitJudgmentAction = "accept" | "reject" | "defer" | "correct"

export type WorkUnitJudgmentLog = {
  draftId: string
  action: WorkUnitJudgmentAction
  reason?: string
  correction?: Partial<WorkUnitDraft>
  createdAt: string
}
