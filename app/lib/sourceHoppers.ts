import type {
  SanitizedWorkUnitCandidate,
  SourceHopperEvent,
  SourceKind,
} from "../types/sourceHopper.ts"
import type {
  ExternalSignal,
  SourceCandidate,
} from "./domain/types.ts"

export function sanitizeSourceEvent(
  event: SourceHopperEvent,
): SanitizedWorkUnitCandidate | null {
  if (!event.id || !event.source || !event.title || !event.timestamp) return null
  const actors = normalizeActors(event)
  const tags = Array.from(new Set(event.labels ?? []))
  const urgency = inferUrgency(event)

  return {
    id: `candidate:${event.id}`,
    sourceRef: {
      source: event.source,
      externalId: event.id,
      container: event.container,
      url: event.url,
      capturedAt: event.timestamp,
    },
    title: event.title.trim(),
    actors,
    situationHint: buildSituation(event),
    problemHint: buildProblem(event),
    deadlineHint: event.deadline ?? "unspecified",
    impactHint: clampScore(event.metadata?.impact, event.source === "gmail" ? 8 : 7),
    urgencyHint: urgency,
    actorWeightHint: clampScore(event.metadata?.actor_weight, actors.length > 1 ? 7 : 6),
    effortHint: clampScore(event.metadata?.effort, event.source === "slack" ? 3 : 4),
    confidence: clamp01(0.55 + tags.length * 0.05 + urgency * 0.025),
    tags,
  }
}

export function sanitizeSourceEvents(
  events: readonly SourceHopperEvent[],
): SanitizedWorkUnitCandidate[] {
  return events.map(sanitizeSourceEvent).filter((item): item is SanitizedWorkUnitCandidate => !!item)
}

export function allowedHopperFields(source: SourceKind): string[] {
  const shared = ["id", "source", "title", "actor", "timestamp", "deadline", "labels", "metadata"]
  if (source === "slack") return [...shared, "container", "thread_count", "reaction_count"]
  if (source === "notion") return [...shared, "status", "owner", "updated_at"]
  if (source === "google_drive") return [...shared, "owner", "modified_at", "mime_type"]
  if (source === "google_calendar") return [...shared, "attendees", "busy", "time_range"]
  return [...shared, "sender", "subject", "has_attachment"]
}

export function externalSignalToCandidate(signal: ExternalSignal): SourceCandidate | null {
  if (!signal?.id || !signal?.tenantId || !signal?.sourceType || !signal?.sourceRef) {
    return null
  }

  const meta = signal.metadata ?? {}

  const title = typeof meta.title === "string" ? meta.title : ""
  const actors = Array.isArray(meta.actors)
    ? meta.actors.filter((a): a is string => typeof a === "string")
    : typeof meta.actors === "string"
      ? [meta.actors]
      : []
  const problem = typeof meta.problem === "string" ? meta.problem : undefined
  const deadline = typeof meta.deadline === "string" ? meta.deadline : undefined

  if (!title && actors.length === 0) return null

  const tags = Array.isArray(meta.labels) ? meta.labels.filter((l): l is string => typeof l === "string").length : 0
  const confidence = Math.min(1, Math.max(0, 0.55 + tags * 0.05))

  return {
    id: `candidate:${signal.id}`,
    tenantId: signal.tenantId,
    sourceSignalIds: [signal.id],
    sourceType: signal.sourceType,
    extractedSummary: title,
    detectedActors: actors,
    detectedProblem: problem,
    detectedDeadline: deadline,
    detectedIntent: typeof meta.intent === "string" ? meta.intent : undefined,
    confidence,
    trustLevel: "sanitized_candidate",
    createdAt: new Date().toISOString(),
  }
}

function normalizeActors(event: SourceHopperEvent): string[] {
  const actors = event.actors?.length ? event.actors : event.actor ? [event.actor] : ["Unknown"]
  return actors.map((actor) => actor.trim()).filter(Boolean)
}

function buildSituation(event: SourceHopperEvent): string {
  return `${event.source} signal captured from ${event.container ?? "source"} at ${event.timestamp}.`
}

function buildProblem(event: SourceHopperEvent): string {
  if (event.status && event.status !== "Done") return `${event.title} is ${event.status}.`
  if (event.deadline) return `${event.title} has a deadline hint: ${event.deadline}.`
  return `${event.title} needs WorkUnit classification before execution.`
}

function inferUrgency(event: SourceHopperEvent): number {
  const text = `${event.title} ${event.deadline ?? ""} ${(event.labels ?? []).join(" ")}`.toLowerCase()
  if (/urgent|緊急|today|本日/.test(text)) return 9
  if (/tomorrow|明日|deadline|期限/.test(text)) return 8
  return event.source === "google_calendar" ? 7 : 5
}

function clampScore(value: unknown, fallback: number): number {
  return Math.min(10, Math.max(1, Number.isFinite(value) ? Number(value) : fallback))
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}
