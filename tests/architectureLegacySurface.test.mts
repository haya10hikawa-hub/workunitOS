import test from "node:test"
import assert from "node:assert/strict"
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const rootDir = fileURLToPath(new URL("../", import.meta.url))
const LEGACY_IMPORT_BASELINE = 37
const ignoredDirs = new Set(["node_modules", ".next", ".open-next", "dist", "coverage"])
const importPattern = /^\s*import(?:\s+type)?(?:[\s\w{},*]+from\s+)?["']([^"']+)["']/gm
const legacyFragments = [
  "/app/lib/workunitInbox/",
  "/app/lib/actionField/",
  "/app/components/workunitInbox/",
  "/app/components/legacy/workunitInbox/",
]

test("root page remains the canonical WorkUnitOSDashboard entry", async () => {
  const source = await readFile(path.join(rootDir, "app/page.tsx"), "utf8")
  assert.match(source, /WorkUnitOSDashboard/)
  assert.equal(source.includes("WorkUnitInbox"), false)
  assert.equal(source.includes("WorkUnitActionField"), false)
  assert.equal(source.includes("WorkUnitDetail"), false)
})

test("no editor swap artifacts exist under app", async () => {
  const files = await listFiles(path.join(rootDir, "app"))
  const artifacts = files
    .map((file) => path.relative(rootDir, file))
    .filter((file) => /\.(swp|swo)$/.test(file) || /\/\.[^/]+\.(swp|swo)$/.test(file))
  assert.deepEqual(artifacts, [])
})

test("legacy import count does not exceed the current baseline", async () => {
  const files = [
    ...(await listCodeFiles(path.join(rootDir, "app"))),
    ...(await listCodeFiles(path.join(rootDir, "tests"))),
  ]
  const imports = await findLegacyImports(files)
  assert.ok(
    imports.length <= LEGACY_IMPORT_BASELINE,
    `Legacy imports increased above ${LEGACY_IMPORT_BASELINE}:\n${imports.join("\n")}`,
  )
})

test("adopted dashboard does not import server-only or infrastructure modules", async () => {
  const source = await readFile(path.join(rootDir, "app/components/workunit-os/adopted/AdoptedWorkUnitDashboard.tsx"), "utf8")
  const imports = Array.from(source.matchAll(importPattern), (match) => match[1])
  const forbidden = imports.filter((specifier) => {
    const resolved = resolveImport(path.join(rootDir, "app/components/workunit-os/adopted/AdoptedWorkUnitDashboard.tsx"), specifier)
    const normalized = resolved.split(path.sep).join("/")
    return [
      "/app/lib/persistence/d1/",
      "/app/lib/infrastructure/persistence/",
      "/app/lib/persistence/repositoryResolver",
      "/app/lib/persistence/routeRepositories",
      "/app/api/",
      "/app/lib/infrastructure/external/",
      "/app/lib/security/session",
    ].some((fragment) => normalized.includes(fragment))
  })
  assert.deepEqual(forbidden, [])
})

async function listFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  const nested = await Promise.all(entries.map(async (entry) => {
    if (ignoredDirs.has(entry.name)) return []
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) return listFiles(fullPath)
    return [fullPath]
  }))
  return nested.flat()
}

async function listCodeFiles(dir: string): Promise<string[]> {
  const files = await listFiles(dir)
  return files.filter((file) => /\.(ts|tsx|mts)$/.test(file))
}

async function findLegacyImports(files: string[]): Promise<string[]> {
  const violations: string[] = []
  for (const file of files) {
    const source = await readFile(file, "utf8")
    for (const match of source.matchAll(importPattern)) {
      const resolved = resolveImport(file, match[1]).split(path.sep).join("/")
      if (legacyFragments.some((fragment) => resolved.includes(fragment))) {
        violations.push(`${path.relative(rootDir, file)} -> ${match[1]}`)
      }
    }
  }
  return violations
}

function resolveImport(filePath: string, specifier: string): string {
  if (specifier.startsWith("@/")) {
    const aliasPath = specifier.slice(2)
    return path.join(rootDir, aliasPath.startsWith("app/") ? aliasPath : path.join("app", aliasPath))
  }
  if (specifier.startsWith(".")) return path.resolve(path.dirname(filePath), specifier)
  return specifier
}
