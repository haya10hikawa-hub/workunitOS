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
  // Loop navigation: ArrowDown past the last row wraps to the first, ArrowUp past
  // the first wraps to the last.
  const base = Number.isFinite(current) && current >= 0 ? Math.trunc(current) % length : 0
  const delta = direction === "next" ? 1 : -1
  return ((base + delta) % length + length) % length
}

/**
 * Escape behaviour in the palette: clear the search query first when it is
 * non-empty, otherwise close the palette.
 */
export function resolveLauncherEscapeAction(query: string): "clear_query" | "close" {
  return query.trim().length > 0 ? "clear_query" : "close"
}
