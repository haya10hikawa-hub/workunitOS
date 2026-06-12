/**
 * InboxWorkUnit ↔ Persistence Row Mapping
 *
 * Maps between the UI-facing InboxWorkUnit type and the
 * persistence-layer InboxWorkUnitRow type.
 * No secrets, no raw payloads.
 */

import type { InboxWorkUnit, InboxWorkUnitStatus } from "./types.ts"
import type { InboxWorkUnitRow } from "../../persistence/types.ts"

export function inboxWorkUnitToRow(wu: InboxWorkUnit): InboxWorkUnitRow {
  return {
    id: wu.id,
    tenantId: wu.tenantId as InboxWorkUnitRow["tenantId"],
    sourceSignalId: wu.signalId,
    title: wu.title,
    kind: wu.kind,
    priority: wu.priority,
    sourceProvider: wu.sourceProvider,
    reason: wu.reason,
    evidence: wu.evidence,
    nextAction: wu.nextAction,
    sourceUrl: wu.sourceUrl,
    actor: wu.actor,
    assignee: wu.assignee,
    repository: wu.repository,
    dueAt: wu.dueAt,
    status: wu.status,
    createdAt: wu.createdAt,
    updatedAt: new Date().toISOString(),
  }
}

export function workUnitRowToInboxWorkUnit(row: InboxWorkUnitRow): InboxWorkUnit {
  return {
    id: row.id,
    signalId: row.sourceSignalId ?? row.id,
    tenantId: row.tenantId as string,
    title: row.title,
    kind: row.kind as InboxWorkUnit["kind"],
    priority: row.priority as InboxWorkUnit["priority"],
    sourceProvider: row.sourceProvider as InboxWorkUnit["sourceProvider"],
    reason: row.reason,
    evidence: row.evidence,
    nextAction: row.nextAction,
    sourceUrl: row.sourceUrl,
    actor: row.actor,
    assignee: row.assignee,
    repository: row.repository,
    dueAt: row.dueAt,
    createdAt: row.createdAt,
    status: row.status as InboxWorkUnitStatus,
  }
}
