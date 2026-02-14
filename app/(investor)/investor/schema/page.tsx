"use client"

import * as React from "react"
import { LoaderCircleIcon, RefreshCwIcon } from "lucide-react"

import { MermaidDiagram } from "@/components/mermaid-diagram"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  investorSchemaApi,
  type InvestorSchemaResponse,
} from "@/lib/api/investor-browser"

function toMermaidToken(value: string, fallback: string) {
  const cleaned = value
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")

  const candidate = cleaned || fallback
  return /^[0-9]/.test(candidate) ? `n_${candidate}` : candidate
}

function normalizeEntityName(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")

  if (normalized.endsWith("ies")) {
    return `${normalized.slice(0, -3)}y`
  }
  if (normalized.endsWith("s")) {
    return normalized.slice(0, -1)
  }
  return normalized
}

function inferForeignKeyTarget(
  columnName: string,
  entityToTableId: Map<string, string>
) {
  if (!columnName.endsWith("_id")) {
    return null
  }

  const base = columnName.slice(0, -3)
  const candidates = [
    base,
    `${base}s`,
    base.endsWith("y") ? `${base.slice(0, -1)}ies` : "",
  ].filter(Boolean)

  for (const candidate of candidates) {
    const tableId = entityToTableId.get(normalizeEntityName(candidate))
    if (tableId) {
      return tableId
    }
  }

  return null
}

function toMermaid(schema: InvestorSchemaResponse) {
  const lines: string[] = ["erDiagram"]
  const usedTableIds = new Set<string>()
  const tableNameToId = new Map<string, string>()
  const entityToTableId = new Map<string, string>()

  for (const table of schema.tables) {
    const baseId = toMermaidToken(table.table_name, "table")
    let tableId = baseId
    let suffix = 2

    while (usedTableIds.has(tableId)) {
      tableId = `${baseId}_${suffix}`
      suffix += 1
    }
    usedTableIds.add(tableId)
    tableNameToId.set(table.table_name, tableId)

    const entityKey = normalizeEntityName(table.table_name)
    if (!entityToTableId.has(entityKey)) {
      entityToTableId.set(entityKey, tableId)
    }
  }

  for (const table of schema.tables) {
    const tableId = tableNameToId.get(table.table_name)
    if (!tableId) {
      continue
    }

    lines.push(`  %% ${tableId} -> ${table.table_name}`)
    lines.push(`  ${tableId} {`)

    for (const column of table.columns) {
      const columnType = toMermaidToken(column.type.toLowerCase(), "unknown")
      const columnName = toMermaidToken(column.name, "column")
      const key =
        column.name === "id" ? "PK" : column.name.endsWith("_id") ? "FK" : ""
      lines.push(`    ${columnType} ${columnName}${key ? ` ${key}` : ""}`)
    }

    lines.push("  }")
  }

  const relationLines: string[] = []
  const relationKeys = new Set<string>()

  for (const table of schema.tables) {
    const sourceId = tableNameToId.get(table.table_name)
    if (!sourceId) {
      continue
    }

    for (const column of table.columns) {
      const targetId = inferForeignKeyTarget(column.name, entityToTableId)
      if (!targetId || targetId === sourceId) {
        continue
      }

      const relationKey = `${sourceId}->${targetId}:${column.name}`
      if (relationKeys.has(relationKey)) {
        continue
      }
      relationKeys.add(relationKey)
      relationLines.push(
        `  ${sourceId} }o--|| ${targetId} : ${toMermaidToken(column.name, "fk")}`
      )
    }
  }

  if (relationLines.length > 0) {
    lines.push(...relationLines)
  }

  return lines.join("\n")
}

export default function InvestorSchemaPage() {
  const [data, setData] = React.useState<InvestorSchemaResponse | null>(null)
  const [mermaid, setMermaid] = React.useState("erDiagram")
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState("")

  const loadSchema = React.useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError("")
    try {
      const payload = await investorSchemaApi.get()
      const sortedTables = [...payload.tables].sort((a, b) =>
        a.table_name.localeCompare(b.table_name)
      )
      const normalized = {
        ...payload,
        tables: sortedTables,
        table_count: payload.table_count || sortedTables.length,
      }
      setData(normalized)
      setMermaid(toMermaid(normalized))
    } catch {
      setError("Failed to load schema from /investor/schema.")
      setData(null)
      setMermaid("erDiagram")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  React.useEffect(() => {
    void loadSchema()
  }, [loadSchema])

  return (
    <div className="w-full space-y-4 p-4 md:p-6">
      <section className="flex flex-wrap items-center justify-between gap-3 border-b pb-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Table Schema</h1>
          <p className="text-muted-foreground text-sm">
            Mermaid ER diagram generated from `/investor/schema`.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadSchema(true)}
          disabled={loading || refreshing}
        >
          {refreshing ? (
            <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />
          ) : (
            <RefreshCwIcon data-icon="inline-start" />
          )}
          Refresh
        </Button>
      </section>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {loading ? (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <LoaderCircleIcon className="size-4 animate-spin" />
          Loading investor schema...
        </div>
      ) : !data ? (
        <p className="text-muted-foreground text-sm">No schema data available.</p>
      ) : (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge>{data.table_count} table(s)</Badge>
          </div>
          <MermaidDiagram chart={mermaid} />
        </section>
      )}
    </div>
  )
}
