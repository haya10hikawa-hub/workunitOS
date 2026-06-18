export type FilterableLauncherCommand = {
  readonly kind: string
  readonly label: string
  readonly description?: string
  readonly endpoint?: string
}

const FORBIDDEN_LABEL_PARTS: readonly (readonly string[])[] = [
  ["send", "email"],
  ["post", "slack"],
  ["create", "github", "issue"],
  ["create", "calendar", "event"],
  ["database", "update"],
  ["external", "execute"],
  ["direct", "provider", "mutation"],
]

const FORBIDDEN_KIND_PARTS: readonly (readonly string[])[] = [
  ["mark", "approval", "used"],
  ["send", "email"],
  ["slack", "post"],
  ["gmail", "send"],
  ["github", "issue"],
  ["calendar", "create"],
  ["database", "update"],
  ["provider", "mutation"],
]

const FORBIDDEN_ROUTE = ["/api/workunit", "/tools"].join("")

export function filterForbiddenPaletteCommands<T extends FilterableLauncherCommand>(
  commands: readonly T[],
): T[] {
  return commands.filter((command) => !isForbiddenPaletteCommand(command))
}

export function isForbiddenPaletteCommand(command: FilterableLauncherCommand): boolean {
  const label = normalize(`${command.label} ${command.description ?? ""}`)
  const kind = normalize(command.kind.replace(/[_-]/g, " "))
  const endpoint = command.endpoint ?? ""

  return endpoint.includes(FORBIDDEN_ROUTE)
    || FORBIDDEN_LABEL_PARTS.some((parts) => containsAll(label, parts))
    || FORBIDDEN_KIND_PARTS.some((parts) => containsAll(kind, parts))
}

function containsAll(value: string, parts: readonly string[]): boolean {
  return parts.every((part) => value.includes(part))
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}
