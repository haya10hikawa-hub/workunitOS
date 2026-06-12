import test from "node:test"
import assert from "node:assert/strict"
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const rootDir = fileURLToPath(new URL("../", import.meta.url))

async function listCodeFiles(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    const nested = await Promise.all(entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name)
      if (entry.name === "node_modules" || entry.name === ".open-next" || entry.name === ".next") return []
      if (entry.isDirectory()) return listCodeFiles(fullPath)
      if (!/\.(ts|tsx|mts)$/.test(entry.name)) return []
      return [fullPath]
    }))
    return nested.flat()
  } catch {
    return []
  }
}

function extractImports(source: string): string[] {
  const matches = source.matchAll(/^\s*import(?:\s+type)?(?:[\s\w{},*]+from\s+)?["']([^"']+)["']/gm)
  return Array.from(matches, (match) => match[1])
}

function resolveImport(filePath: string, specifier: string): string {
  if (specifier.startsWith("@/")) return path.join(rootDir, specifier.slice(2))
  if (specifier.startsWith(".")) return path.resolve(path.dirname(filePath), specifier)
  return specifier
}

function isBareModule(resolved: string, name: string): boolean {
  return resolved === name || resolved.startsWith(`${name}/`)
}

function hasForbiddenResolvedPath(resolved: string, fragments: string[]): boolean {
  const normalized = resolved.split(path.sep).join("/")
  return fragments.some((fragment) => normalized.includes(fragment))
}

async function assertNoForbiddenImports(
  files: string[],
  ruleName: string,
  forbidden: (resolved: string) => boolean,
) {
  const violations: string[] = []
  for (const filePath of files) {
    const source = await readFile(filePath, "utf8")
    for (const specifier of extractImports(source)) {
      const resolved = resolveImport(filePath, specifier)
      if (forbidden(resolved)) {
        violations.push(`${path.relative(rootDir, filePath)} -> ${specifier}`)
      }
    }
  }
  assert.deepEqual(violations, [], `${ruleName} violations:\n${violations.join("\n")}`)
}

test("domain modules do not import UI, routes, Next/React, D1 implementations, or raw external clients", async () => {
  const files = await listCodeFiles(path.join(rootDir, "app/lib/domain"))
  await assertNoForbiddenImports(files, "domain", (resolved) =>
    isBareModule(resolved, "react")
    || isBareModule(resolved, "next")
    || hasForbiddenResolvedPath(resolved, [
      "/app/api/",
      "/app/components/",
      "/app/lib/persistence/d1/",
      "/app/lib/infrastructure/persistence/d1/",
      "/app/lib/workunitInbox/sources/",
      "/app/lib/infrastructure/external/",
    ]))
})

test("application auth modules do not import React, components, or API routes", async () => {
  const files = await listCodeFiles(path.join(rootDir, "app/lib/application/auth"))
  await assertNoForbiddenImports(files, "application-auth", (resolved) =>
    isBareModule(resolved, "react")
    || isBareModule(resolved, "next")
    || hasForbiddenResolvedPath(resolved, ["/app/components/", "/app/api/"]))
})

test("application modules do not import React, components, or API routes", async () => {
  const files = await listCodeFiles(path.join(rootDir, "app/lib/application"))
  await assertNoForbiddenImports(files, "application", (resolved) =>
    isBareModule(resolved, "react")
    || isBareModule(resolved, "next")
    || hasForbiddenResolvedPath(resolved, ["/app/components/", "/app/api/"]))
})

test("components do not import D1 implementations, raw external clients, or server-only repository resolvers", async () => {
  const files = await listCodeFiles(path.join(rootDir, "app/components"))
  await assertNoForbiddenImports(files, "components", (resolved) =>
    hasForbiddenResolvedPath(resolved, [
      "/app/lib/persistence/d1/",
      "/app/lib/infrastructure/persistence/d1/",
      "/app/lib/persistence/repositoryResolver.ts",
      "/app/lib/persistence/routeRepositories.ts",
      "/app/lib/workunitInbox/sources/",
      "/app/lib/infrastructure/external/",
    ]))
})

test("API routes do not import React components", async () => {
  const files = await listCodeFiles(path.join(rootDir, "app/api"))
  await assertNoForbiddenImports(files, "api", (resolved) =>
    isBareModule(resolved, "react")
    || hasForbiddenResolvedPath(resolved, ["/app/components/"]))
})

test("D1 repositories do not import React, components, or API routes", async () => {
  const files = await listCodeFiles(path.join(rootDir, "app/lib/persistence/d1"))
  await assertNoForbiddenImports(files, "d1", (resolved) =>
    isBareModule(resolved, "react")
    || hasForbiddenResolvedPath(resolved, ["/app/components/", "/app/api/"]))
})

test("external source clients do not import React, components, or API routes", async () => {
  const files = [
    ...(await listCodeFiles(path.join(rootDir, "app/lib/workunitInbox/sources"))),
    ...(await listCodeFiles(path.join(rootDir, "app/lib/infrastructure/external"))),
    ...(await listCodeFiles(path.join(rootDir, "app/lib/integrations"))),
  ]
  await assertNoForbiddenImports(files, "external-clients", (resolved) =>
    isBareModule(resolved, "react")
    || hasForbiddenResolvedPath(resolved, ["/app/components/", "/app/api/"]))
})
