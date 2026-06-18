import assert from "node:assert/strict"
import test from "node:test"
import {
  clampLauncherActiveIndex,
  filterLauncherWorkUnits,
  getActiveLauncherWorkUnit,
  type LauncherWorkUnit,
} from "../app/lib/application/launcher/workUnitSelectionModel.ts"

const workUnits: LauncherWorkUnit[] = [
  { id: "wu-1", title: "Review request", source: "GitHub", status: "READY", roi: 91, summary: "Needs review" },
  { id: "wu-2", title: "Team follow-up", source: "Team", status: "NEEDS REVIEW", roi: 82, summary: "Waiting on PM" },
]

test("filterLauncherWorkUnits filters by query", () => {
  assert.deepEqual(filterLauncherWorkUnits(workUnits, "team").map((w) => w.id), ["wu-2"])
})

test("clampLauncherActiveIndex clamps active index", () => {
  assert.equal(clampLauncherActiveIndex(-4, workUnits.length), 0)
  assert.equal(clampLauncherActiveIndex(40, workUnits.length), 1)
  assert.equal(clampLauncherActiveIndex(Number.NaN, workUnits.length), 0)
})

test("getActiveLauncherWorkUnit returns active WorkUnit", () => {
  assert.equal(getActiveLauncherWorkUnit(workUnits, 1)?.id, "wu-2")
})

test("getActiveLauncherWorkUnit returns null for empty list", () => {
  assert.equal(getActiveLauncherWorkUnit([], 0), null)
})
