import { mkdir, rm } from "node:fs/promises"
import { generateZodClientFromOpenAPI, getHandlebars } from "openapi-zod-client"

type OpenApiDoc = {
  paths?: Record<string, unknown>
  [key: string]: unknown
}

const DIST_PATH = "./types/generated/admin"

const hbs = getHandlebars()

hbs.registerHelper("customAlias", (path: string, method: string) => {
  const map: Record<string, string> = {}
  const key = `${method}:${path}`
  const fallback = `${method}_${path}`
    .replace(/[{}]/g, "")
    .replace(/[\/:.-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase()

  return map[key] || fallback
})

function normalizeUrl(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) {
    return ""
  }

  const hasProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed)
  const withProtocol = hasProtocol ? trimmed : `http://${trimmed}`

  try {
    return new URL(withProtocol).toString()
  } catch {
    return ""
  }
}

function toOpenApiUrl(input: string): string {
  const normalized = normalizeUrl(input)
  if (!normalized) {
    return ""
  }

  const url = new URL(normalized)
  if (!url.pathname || url.pathname === "/") {
    url.pathname = "/docs/openapi.json"
    return url.toString()
  }

  if (url.pathname.endsWith(".json")) {
    return url.toString()
  }

  url.pathname = `${url.pathname.replace(/\/$/, "")}/docs/openapi.json`
  return url.toString()
}

function resolveOpenApiUrl(): string {
  const openApiEnv = process.env.OPENAPI_URL || ""
  if (openApiEnv) {
    const resolved = toOpenApiUrl(openApiEnv)
    if (resolved) {
      return resolved
    }
    throw new Error("OPENAPI_URL is set but invalid. Use a valid URL.")
  }

  const apiEnv = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || ""
  if (apiEnv) {
    const resolved = toOpenApiUrl(apiEnv)
    if (resolved) {
      return resolved
    }
    throw new Error("API_URL/NEXT_PUBLIC_API_URL is set but invalid. Use a valid URL.")
  }

  throw new Error(
    "Missing required env. Set OPENAPI_URL or API_URL (or NEXT_PUBLIC_API_URL)."
  )
}

function isAdminPath(path: string): boolean {
  return path === "/admin" || path.startsWith("/admin/")
}

function filterAdminRoutes(openApiDoc: OpenApiDoc): OpenApiDoc {
  const paths = openApiDoc.paths || {}
  const filteredPaths = Object.fromEntries(
    Object.entries(paths).filter(([path]) => isAdminPath(path))
  )

  if (Object.keys(filteredPaths).length === 0) {
    throw new Error("No /admin routes found in OpenAPI schema.")
  }

  return {
    ...openApiDoc,
    paths: filteredPaths,
  }
}

const openApiUrl = resolveOpenApiUrl()
const res = await fetch(openApiUrl)

if (!res.ok) {
  throw new Error(`Failed to fetch OpenAPI from ${openApiUrl}: ${res.status} ${res.statusText}`)
}

const openApiDoc = (await res.json()) as OpenApiDoc
const adminOnlyOpenApiDoc = filterAdminRoutes(openApiDoc)

await rm(DIST_PATH, { recursive: true, force: true })
await mkdir(DIST_PATH, { recursive: true })

await generateZodClientFromOpenAPI({
  // openapi-zod-client's typings are stricter than many real-world docs.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  openApiDoc: adminOnlyOpenApiDoc,
  distPath: DIST_PATH,
  handlebars: hbs,
  options: {
    groupStrategy: "tag-file",
    exportTypes: true,
    withAlias: true,
  },
})

console.log(`Generated admin-only types from ${openApiUrl} into ${DIST_PATH}`)
