export type LauncherKeyboardMode = "palette" | "action-field"

export type LauncherKeyIntent =
  | "open_palette"
  | "close"
  | "confirm"
  | "next"
  | "previous"
  | "none"

export type LauncherKeyboardEventLike = {
  readonly key: string
  readonly metaKey?: boolean
  readonly ctrlKey?: boolean
}

export function getLauncherKeyIntent(event: LauncherKeyboardEventLike): LauncherKeyIntent {
  const key = event.key.toLowerCase()
  if ((event.metaKey || event.ctrlKey) && key === "k") return "open_palette"
  if (event.key === "Escape") return "close"
  if (event.key === "Enter") return "confirm"
  if (event.key === "ArrowDown") return "next"
  if (event.key === "ArrowUp") return "previous"
  return "none"
}

export function nextLauncherIndex(current: number, direction: "next" | "previous", length: number): number {
  if (length <= 0) return -1
  if (!Number.isFinite(current)) return 0
  const delta = direction === "next" ? 1 : -1
  return Math.min(Math.max(Math.trunc(current) + delta, 0), length - 1)
}
