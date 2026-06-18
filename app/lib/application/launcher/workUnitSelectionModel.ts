export type LauncherWorkUnit = {
  readonly id: string
  readonly title: string
  readonly source: string
  readonly status: string
  readonly roi: number
  readonly summary: string
}

export function filterLauncherWorkUnits(
  workUnits: readonly LauncherWorkUnit[],
  query: string,
): LauncherWorkUnit[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return [...workUnits]

  return workUnits.filter((workUnit) => {
    const haystack = [
      workUnit.id,
      workUnit.title,
      workUnit.source,
      workUnit.status,
      workUnit.summary,
    ].join(" ").toLowerCase()
    return haystack.includes(normalized)
  })
}

export function clampLauncherActiveIndex(index: number, length: number): number {
  if (length <= 0) return -1
  if (!Number.isFinite(index)) return 0
  return Math.min(Math.max(Math.trunc(index), 0), length - 1)
}

export function getActiveLauncherWorkUnit(
  workUnits: readonly LauncherWorkUnit[],
  activeIndex: number,
): LauncherWorkUnit | null {
  const index = clampLauncherActiveIndex(activeIndex, workUnits.length)
  return index === -1 ? null : workUnits[index] ?? null
}
