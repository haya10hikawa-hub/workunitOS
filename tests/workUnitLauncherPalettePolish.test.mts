/**
 * WorkUnit search / selection palette polish.
 *
 * Covers loop keyboard navigation, Escape clear-vs-close, extended search fields,
 * and source-scan guards for the palette visual polish (react-icons usage, plural
 * result count, footer grouping) — without redesigning Action Field or touching
 * any safety boundary.
 */

import assert from "node:assert/strict"
import { readFile, readdir } from "node:fs/promises"
import path from "node:path"
import test from "node:test"
import {
  nextLauncherIndex,
  resolveLauncherEscapeAction,
} from "../app/lib/application/launcher/keyboardNavigationModel.ts"
import {
  filterLauncherWorkUnits,
  type LauncherWorkUnit,
} from "../app/lib/application/launcher/workUnitSelectionModel.ts"

const root = process.cwd()
async function source(file: string): Promise<string> {
  return readFile(path.join(root, file), "utf8")
}

function workUnit(over: Partial<LauncherWorkUnit> & { id: string }): LauncherWorkUnit {
  return {
    id: over.id,
    title: over.title ?? "Title",
    source: over.source ?? "GitHub",
    status: over.status ?? "READY",
    roi: over.roi ?? 7.5,
    summary: over.summary ?? "summary",
    objective: over.objective ?? "objective",
    kind: over.kind ?? "review waiting",
    priority: over.priority ?? "medium",
    ownerLabel: over.ownerLabel ?? "PM",
    sourceIcon: over.sourceIcon ?? {
      id: "github", label: "GitHub", assetPath: null, fallbackBadge: "GH", sourceType: "fallback_badge",
    },
    statusTone: over.statusTone,
    sourceDetail: over.sourceDetail,
    urgency: over.urgency,
    nextStep: over.nextStep,
  }
}

// ─── Loop navigation ────────────────────────────────────────────

test("ArrowDown past the last row loops to the first", () => {
  assert.equal(nextLauncherIndex(2, "next", 3), 0)
})

test("ArrowUp past the first row loops to the last", () => {
  assert.equal(nextLauncherIndex(0, "previous", 3), 2)
})

test("loop navigation stays in range mid-list", () => {
  assert.equal(nextLauncherIndex(1, "next", 3), 2)
  assert.equal(nextLauncherIndex(1, "previous", 3), 0)
})

test("loop navigation returns -1 for an empty list", () => {
  assert.equal(nextLauncherIndex(0, "next", 0), -1)
})

// ─── Escape clear-vs-close ──────────────────────────────────────

test("Escape clears a non-empty query before closing", () => {
  assert.equal(resolveLauncherEscapeAction("pr"), "clear_query")
  assert.equal(resolveLauncherEscapeAction("  spaced  "), "clear_query")
})

test("Escape closes when the query is empty", () => {
  assert.equal(resolveLauncherEscapeAction(""), "close")
  assert.equal(resolveLauncherEscapeAction("   "), "close")
})

// ─── Extended search fields ─────────────────────────────────────

const units: LauncherWorkUnit[] = [
  workUnit({ id: "a", title: "Alpha", roi: 9.4, sourceDetail: "GitHub · pull request #289", urgency: "High impact", nextStep: "Address review comments" }),
  workUnit({ id: "b", title: "Beta", roi: 6.1, sourceDetail: "Docs · onboarding", urgency: "Low impact", nextStep: "Fill checkpoints" }),
]

test("search matches roi value", () => {
  assert.deepEqual(filterLauncherWorkUnits(units, "9.4").map((u) => u.id), ["a"])
})

test("search matches sourceDetail", () => {
  assert.deepEqual(filterLauncherWorkUnits(units, "pull request").map((u) => u.id), ["a"])
})

test("search matches urgency", () => {
  assert.deepEqual(filterLauncherWorkUnits(units, "high impact").map((u) => u.id), ["a"])
})

test("search matches nextStep", () => {
  assert.deepEqual(filterLauncherWorkUnits(units, "checkpoints").map((u) => u.id), ["b"])
})

// ─── Palette source-scan guards ─────────────────────────────────

test("CommandPaletteView uses react-icons, plural result count, and footer grouping", async () => {
  const palette = await source("app/components/workunit-os/launcher/CommandPaletteView.tsx")
  assert.equal(palette.includes('from "react-icons/fi"'), true)
  assert.equal(palette.includes("FiSearch"), true)
  // Singular/plural result count.
  assert.equal(palette.includes('count === 1 ? "result" : "results"'), true)
  // Footer left/right grouping.
  assert.equal(palette.includes("footerGroup"), true)
  // Right preview stays synced to the active row.
  assert.equal(palette.includes("props.workUnits[props.activeIndex]"), true)
})

test("SourceAppIcon keeps the approved local asset path and adds a react-icons fallback", async () => {
  const icon = await source("app/components/workunit-os/launcher/SourceAppIcon.tsx")
  assert.equal(icon.includes("isLocalSourceAppIconAssetPath(icon.assetPath)"), true)
  assert.equal(icon.includes("src={icon.assetPath}"), true)
  assert.equal(icon.includes('from "next/image"'), true)
  assert.equal(icon.includes('from "react-icons/si"'), true)
  assert.equal(icon.includes("REACT_ICON_BY_ID"), true)
})

test("palette polish exposes no safety-sensitive fields and no tools route", async () => {
  const files = [
    "app/components/workunit-os/launcher/CommandPaletteView.tsx",
    "app/components/workunit-os/launcher/SourceAppIcon.tsx",
    "app/components/workunit-os/launcher/WorkUnitLauncher.tsx",
    "app/lib/application/launcher/workUnitSelectionModel.ts",
    "app/lib/application/launcher/keyboardNavigationModel.ts",
  ]
  const combined = (await Promise.all(files.map(source))).join("\n")
  // Safety-sensitive identifiers must never be surfaced in the palette UI.
  for (const forbidden of ["approvalId", "targetHash", "payloadHash", "tenantId", "actorUserId", "rawPayload", "/api/workunit" + "/tools"]) {
    assert.equal(combined.includes(forbidden), false, forbidden)
  }
})

test("no app component imports lucide-react (single icon dependency: react-icons)", async () => {
  const entries = await readdir(path.join(root, "app"), { recursive: true, withFileTypes: true })
  const offenders: string[] = []
  for (const entry of entries) {
    if (!entry.isFile()) continue
    if (!entry.name.endsWith(".tsx") && !entry.name.endsWith(".ts")) continue
    const dir = (entry as unknown as { parentPath?: string; path?: string }).parentPath ?? (entry as unknown as { path: string }).path
    const full = path.join(dir, entry.name)
    const src = await readFile(full, "utf8")
    if (/from ["']lucide-react["']/.test(src)) offenders.push(path.relative(root, full))
  }
  assert.deepEqual(offenders, [], `lucide-react import found in: ${offenders.join(", ")}`)
})
