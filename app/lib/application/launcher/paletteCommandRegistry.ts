import type { LauncherWorkUnit } from "./workUnitSelectionModel.ts"
import { filterForbiddenPaletteCommands } from "./forbiddenCommandFilter.ts"

export type PaletteCommandKind =
  | "open_workunit"
  | "open_archive"
  | "open_audit"
  | "open_settings"
  | "noop"

export type PaletteCommand = {
  readonly id: string
  readonly kind: PaletteCommandKind
  readonly label: string
  readonly description: string
  readonly workUnitId?: string
}

const STATIC_COMMANDS: readonly PaletteCommand[] = [
  { id: "open-archive", kind: "open_archive", label: "Open archive", description: "Browse completed WorkUnits." },
  { id: "open-audit", kind: "open_audit", label: "Open audit", description: "Inspect safe activity records." },
  { id: "open-settings", kind: "open_settings", label: "Open settings", description: "Review local launcher preferences." },
  { id: "noop", kind: "noop", label: "No operation", description: "Keep the launcher in read-only mode." },
]

export function getSafePaletteCommands(workUnits: readonly LauncherWorkUnit[] = []): PaletteCommand[] {
  const workUnitCommands = workUnits.map((workUnit): PaletteCommand => ({
    id: `open-${workUnit.id}`,
    kind: "open_workunit",
    label: `Open ${workUnit.title}`,
    description: `${workUnit.source} · ${workUnit.status}`,
    workUnitId: workUnit.id,
  }))
  return filterForbiddenPaletteCommands([...workUnitCommands, ...STATIC_COMMANDS])
}

export function isSafePaletteCommandKind(kind: string): kind is PaletteCommandKind {
  return kind === "open_workunit"
    || kind === "open_archive"
    || kind === "open_audit"
    || kind === "open_settings"
    || kind === "noop"
}
