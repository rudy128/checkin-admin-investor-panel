"use client"

import axios from "axios"

import { API_URL } from "@/config/api"
import { createInvestorAuthApiClient } from "@/lib/api/investor-auth"

function resolveApiUrl() {
  if (!API_URL) {
    throw new Error("Missing NEXT_PUBLIC_API_URL for browser investor API client.")
  }

  const hasProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(API_URL)
  const normalized = hasProtocol ? API_URL : `http://${API_URL}`
  return normalized.replace(/\/+$/, "")
}

const baseURL = resolveApiUrl()
let currentAuthToken: string | null = null

export const investorAxios = axios.create({
  baseURL,
  timeout: 10_000,
  headers: {
    Accept: "application/json",
  },
})

investorAxios.interceptors.request.use((config) => {
  if (currentAuthToken) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${currentAuthToken}`
  }

  return config
})

export function setInvestorAuthToken(token: string | null) {
  currentAuthToken = token
}

export const investorAuthApi = createInvestorAuthApiClient(baseURL, {
  axiosInstance: investorAxios,
})

export type InvestorSchemaColumn = {
  name: string
  type: string
  nullable: boolean
  default: string | null
  max_length: number | null
  numeric_precision: number | null
  numeric_scale: number | null
  datetime_precision: number | null
}

export type InvestorSchemaTable = {
  table_name: string
  column_count: number
  columns: InvestorSchemaColumn[]
}

export type InvestorSchemaResponse = {
  table_count: number
  tables: InvestorSchemaTable[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function coerceIntegerOrNull(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === "number" && Number.isInteger(value)) {
    return value
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number.parseInt(value, 10)
    if (Number.isInteger(parsed)) {
      return parsed
    }
  }

  return null
}

function coerceBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value
  }

  if (typeof value === "string") {
    if (value === "true") {
      return true
    }
    if (value === "false") {
      return false
    }
  }

  return null
}

function coerceSchemaColumn(value: unknown): InvestorSchemaColumn | null {
  if (!isRecord(value)) {
    return null
  }

  const name = typeof value.name === "string" ? value.name : null
  const type = typeof value.type === "string" ? value.type : null
  const nullable = coerceBoolean(value.nullable)

  if (!name || !type || nullable === null) {
    return null
  }

  return {
    name,
    type,
    nullable,
    default: typeof value.default === "string" ? value.default : null,
    max_length: coerceIntegerOrNull(value.max_length),
    numeric_precision: coerceIntegerOrNull(value.numeric_precision),
    numeric_scale: coerceIntegerOrNull(value.numeric_scale),
    datetime_precision: coerceIntegerOrNull(value.datetime_precision),
  }
}

function coerceSchemaTable(value: unknown): InvestorSchemaTable | null {
  if (!isRecord(value)) {
    return null
  }

  const tableName = typeof value.table_name === "string" ? value.table_name : null
  const columnsRaw = Array.isArray(value.columns) ? value.columns : []
  const columns = columnsRaw
    .map((item) => coerceSchemaColumn(item))
    .filter((item): item is InvestorSchemaColumn => item !== null)

  if (!tableName) {
    return null
  }

  return {
    table_name: tableName,
    column_count: coerceIntegerOrNull(value.column_count) ?? columns.length,
    columns,
  }
}

function normalizeSchemaPayload(payload: unknown): InvestorSchemaResponse {
  if (!isRecord(payload)) {
    throw new Error("Invalid investor schema response payload.")
  }

  const tablesRaw = Array.isArray(payload.tables) ? payload.tables : []
  const tables = tablesRaw
    .map((item) => coerceSchemaTable(item))
    .filter((item): item is InvestorSchemaTable => item !== null)

  return {
    table_count: coerceIntegerOrNull(payload.table_count) ?? tables.length,
    tables,
  }
}

export const investorSchemaApi = {
  async get(): Promise<InvestorSchemaResponse> {
    const response = await investorAxios.get<unknown>("/investor/schema")
    return normalizeSchemaPayload(response.data)
  },
}
