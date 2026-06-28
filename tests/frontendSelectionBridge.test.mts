/**
 * Frontend 2C: Selection -> Workspace -> Action Field bridge tests.
 *
 * Proves the candidate-only flow is coherent and non-executable:
 *   - candidate bridge data adapts into launcher data
 *   - selection derives a Workspace model (root card + breadcrumb)
 *   - Node Canvas model changes with selection
 *   - Action Field draft derives from the selected node
 *   - draft editing is local-only
 *   - no /api/workunit/tools call, no approval/execution UI copy
 *   - no forbidden fields reach the frontend models
 */

import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { candidateWorkUnitBridge } from "../app/lib/application/candidate/candidateWorkUnitBridge.ts"
import { candidatesToLauncherWorkUnits } from "../app/lib/application/launcher/candidateToLauncherWorkUnit.ts"
import { deriveWorkUnitTreeMap } from "../app/lib/application/launcher/workUnitTreeModel.ts"
import { deriveWorkspaceModel } from "../app/lib/application/launcher/deriveWorkspaceModel.ts"
import { deriveActionFieldEditorDraft } from "../app/lib/application/launcher/actionFieldEditorDraftModel.ts"
import { FORBIDDEN_CANDIDATE_FIELDS } from "../app/lib/application/candidate/safeWorkUnitCandidate.ts"

const COMPONENT_DIR = join(import.meta.dirname!, "../app/components/workunit-os/launcher")
const read = (file: string) => readFileSync(join(COMPONENT_DIR, file), "utf-8")

const launcher = candidatesToLauncherWorkUnits(candidateWorkUnitBridge().workUnits)

function forbiddenKeysOf(value: unknown): string[] {
  const found: string[] = []
  const walk = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(walk)
    if (node && typeof node === "object") {
      for (const key of Object.keys(node as Record<string, unknown>)) {
        if ((FORBIDDEN_CANDIDATE_FIELDS as readonly string[]).includes(key)) found.push(key)
        walk((node as Record<string, unknown>)[key])
      }
    }
  }
  walk(value)
  return found
}

// 1
test("candidate bridge data adapts into launcher data", () => {
  assert.ok(launcher.length > 0)
  for (const wu of launcher) {
    assert.equal(typeof wu.id, "string")
    assert.equal(typeof wu.title, "string")
    assert.ok(wu.sourceIcon)
  }
})

// 2
test("selecting a WorkUnit derives a Workspace model", () => {
  const treeMap = deriveWorkUnitTreeMap(launcher[0]!)
  const workspace = deriveWorkspaceModel(launcher[0]!, treeMap)
  assert.ok(workspace.rootCard)
  assert.equal(workspace.candidateOnly, true)
  assert.equal(workspace.humanReviewRequired, true)
  assert.equal(workspace.selectedNodeId, treeMap.center.id)
})

// 3
test("selected WorkUnit title appears in Workspace root card model", () => {
  const treeMap = deriveWorkUnitTreeMap(launcher[0]!)
  const workspace = deriveWorkspaceModel(launcher[0]!, treeMap)
  assert.equal(workspace.rootCard?.title, launcher[0]!.title)
  assert.equal(workspace.rootCard?.candidateOnly, true)
  assert.equal(workspace.rootCard?.humanReviewRequired, true)
})

// 4
test("breadcrumb derives from selected WorkUnit", () => {
  const treeMap = deriveWorkUnitTreeMap(launcher[1]!)
  const workspace = deriveWorkspaceModel(launcher[1]!, treeMap)
  assert.equal(workspace.breadcrumb[0]?.label, "Workspace")
  assert.equal(workspace.breadcrumb[1]?.label, launcher[1]!.title)
})

// 5
test("Node Canvas model changes with selection", () => {
  // Use two WorkUnits from different providers so source-derived nodes differ too.
  const github = launcher.find((w) => w.source === "GitHub")!
  const nonGithub = launcher.find((w) => w.source !== "GitHub")!
  const a = deriveWorkUnitTreeMap(github)
  const b = deriveWorkUnitTreeMap(nonGithub)
  assert.notEqual(a.center.label, b.center.label)
  const aSource = a.groups.find((g) => g.id === "sources")!.nodes[0]!.label
  const bSource = b.groups.find((g) => g.id === "sources")!.nodes[0]!.label
  assert.notEqual(aSource, bSource)
})

// 6
test("Action Field draft derives from selected node", () => {
  const treeMap = deriveWorkUnitTreeMap(launcher[0]!)
  const rootDraft = deriveActionFieldEditorDraft(launcher[0]!, null)
  const subtask = treeMap.groups.find((g) => g.id === "subtasks")!.nodes.find((n) => n.id === "subtask-pr")!
  const nodeDraft = deriveActionFieldEditorDraft(launcher[0]!, { id: subtask.id, label: subtask.label })
  assert.notEqual(rootDraft.body, nodeDraft.body)
  assert.ok(nodeDraft.body.includes(subtask.label))
  // Title still reflects the selected WorkUnit.
  assert.equal(nodeDraft.title, launcher[0]!.title)
})

// 7
test("draft editing is local-only (component uses local state, no network)", () => {
  const editor = read("ActionFieldEditor.tsx")
  assert.ok(editor.includes("useState"))
  assert.equal(editor.includes("fetch("), false)
  assert.equal(editor.includes("/api/"), false)
  assert.equal(editor.includes("onSubmit"), false)
})

// 8
test("no /api/workunit/tools call is introduced in the flow components", () => {
  for (const file of ["WorkUnitLauncher.tsx", "ActionFieldView.tsx", "WorkUnitTreeMap.tsx", "ActionFieldEditor.tsx", "CommandPaletteView.tsx"]) {
    assert.equal(read(file).includes("/api/workunit/tools"), false, file)
  }
})

// 9
test("no approval/execution UI copy is introduced in flow components", () => {
  const ctaPattern = /\b(send|approve|execute|publish|finalize|sent|approved|executed|published|finalized)\b/i
  for (const file of ["WorkUnitLauncher.tsx", "ActionFieldView.tsx", "WorkUnitTreeMap.tsx", "CommandPaletteView.tsx"]) {
    const src = read(file)
    assert.equal(ctaPattern.test(src), false, `${file} must not contain execution/approval UI copy`)
  }
})

// 10
test("forbidden fields are not present in frontend models", () => {
  assert.deepEqual(forbiddenKeysOf(launcher), [])
  const treeMap = deriveWorkUnitTreeMap(launcher[0]!)
  assert.deepEqual(forbiddenKeysOf(deriveWorkspaceModel(launcher[0]!, treeMap)), [])
  assert.deepEqual(forbiddenKeysOf(deriveActionFieldEditorDraft(launcher[0]!, null)), [])
  assert.deepEqual(forbiddenKeysOf(treeMap), [])
})
