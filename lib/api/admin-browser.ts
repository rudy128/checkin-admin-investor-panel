"use client"

import axios from "axios"

import { API_URL } from "@/config/api"
import { createApiClient as createAdminApiClient } from "@/types/generated/admin/Admin"
import { createApiClient as createAdminAuthApiClient } from "@/types/generated/admin/Admin_Auth"
import { schemas as adminSchemas } from "@/types/generated/admin/Admin"

function resolveApiUrl() {
  if (!API_URL) {
    throw new Error("Missing NEXT_PUBLIC_API_URL for browser admin API client.")
  }

  const hasProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(API_URL)
  const normalized = hasProtocol ? API_URL : `http://${API_URL}`
  return normalized.replace(/\/+$/, "")
}

const baseURL = resolveApiUrl()
let currentAuthToken: string | null = null

export const adminAxios = axios.create({
  baseURL,
  timeout: 10_000,
  headers: {
    Accept: "application/json",
  },
})

adminAxios.interceptors.request.use((config) => {
  if (currentAuthToken) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${currentAuthToken}`
  }

  return config
})

export function setAdminAuthToken(token: string | null) {
  currentAuthToken = token
}

export const adminApi = createAdminApiClient(baseURL, {
  axiosInstance: adminAxios,
})

export const adminAuthApi = createAdminAuthApiClient(baseURL, {
  axiosInstance: adminAxios,
})

export type AdminUser = {
  id: string
  username?: string
  phoneNo?: string
  countryCode?: string
  timezone?: string
  locationPermission?: string | null
  healthPermission?: string | null
  name?: string | null
  createdAt?: string
  updatedAt?: string
  [key: string]: unknown
}

export type AdminUserDetails = {
  user: AdminUser
  cards: Record<string, unknown>[]
  emotionalTimeline: Record<string, unknown>[]
  followRequest: Record<string, unknown>[]
  followers: Record<string, unknown>[]
  health: Record<string, unknown>[]
  location: Record<string, unknown>[]
  spotify: Record<string, unknown>[]
}

export type AdminPromptTableRow = {
  id: string
  name: string
  prompt: string
  created_at: string
  updated_at: string
  is_active: boolean
}

export type AdminPromptUpsertRequest = {
  name: string
  prompt: string
}

export type AdminPromptMutationResponse = {
  message: string
  prompt: AdminPromptTableRow
}

const REQUEST_CACHE_TTL_MS = 10_000
const requestCache = new Map<string, { expiresAt: number; data: unknown }>()
const inFlightRequests = new Map<string, Promise<unknown>>()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function coerceAdminUser(value: unknown): AdminUser | null {
  if (!isRecord(value)) {
    return null
  }

  const id = value.id
  if (typeof id !== "string") {
    return null
  }

  const username = typeof value.username === "string" ? value.username : undefined
  const phoneNo =
    typeof value.phoneNo === "string"
      ? value.phoneNo
      : typeof value.phone_no === "string"
        ? value.phone_no
        : undefined

  return {
    id,
    username,
    phoneNo,
    countryCode:
      typeof value.countryCode === "string"
        ? value.countryCode
        : typeof value.country_code === "string"
          ? value.country_code
          : undefined,
    timezone: typeof value.timezone === "string" ? value.timezone : undefined,
    locationPermission:
      typeof value.locationPermission === "string" || value.locationPermission === null
        ? value.locationPermission
        : typeof value.location_permission === "string" || value.location_permission === null
          ? value.location_permission
          : null,
    healthPermission:
      typeof value.healthPermission === "string" || value.healthPermission === null
        ? value.healthPermission
        : typeof value.health_permission === "string" || value.health_permission === null
          ? value.health_permission
          : null,
    name: typeof value.name === "string" || value.name === null ? value.name : null,
    createdAt:
      typeof value.createdAt === "string"
        ? value.createdAt
        : typeof value.created_at === "string"
          ? value.created_at
          : undefined,
    updatedAt:
      typeof value.updatedAt === "string"
        ? value.updatedAt
        : typeof value.updated_at === "string"
          ? value.updated_at
          : undefined,
    ...value,
  }
}

function toRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is Record<string, unknown> => isRecord(item))
}

function coerceAdminPromptRow(value: unknown): AdminPromptTableRow | null {
  if (!isRecord(value)) {
    return null
  }

  const id = value.id
  const name = value.name
  const prompt = value.prompt
  const createdAtRaw =
    typeof value.created_at === "string"
      ? value.created_at
      : typeof value.createdAt === "string"
        ? value.createdAt
        : null
  const updatedAtRaw =
    typeof value.updated_at === "string"
      ? value.updated_at
      : typeof value.updatedAt === "string"
        ? value.updatedAt
        : null
  const isActiveRaw =
    typeof value.is_active === "boolean"
      ? value.is_active
      : typeof value.isActive === "boolean"
        ? value.isActive
        : null

  if (
    typeof id !== "string" ||
    typeof name !== "string" ||
    typeof prompt !== "string" ||
    typeof createdAtRaw !== "string" ||
    typeof updatedAtRaw !== "string" ||
    typeof isActiveRaw !== "boolean"
  ) {
    return null
  }

  return {
    id,
    name,
    prompt,
    created_at: createdAtRaw,
    updated_at: updatedAtRaw,
    is_active: isActiveRaw,
    ...value,
  }
}

function normalizePromptsPayload(payload: unknown): AdminPromptTableRow[] {
  const toPrompts = (arr: unknown[]) =>
    arr
      .map((item) => coerceAdminPromptRow(item))
      .filter((item): item is AdminPromptTableRow => item !== null)

  if (Array.isArray(payload)) {
    return toPrompts(payload)
  }

  if (isRecord(payload)) {
    const candidates = [payload.prompts, payload.items, payload.data]
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return toPrompts(candidate)
      }
    }
  }

  return []
}

function normalizePromptMutationPayload(payload: unknown): AdminPromptMutationResponse {
  if (!isRecord(payload)) {
    throw new Error("Invalid prompt mutation response payload.")
  }

  const prompt = coerceAdminPromptRow(payload.prompt)
  if (!prompt) {
    throw new Error("Invalid prompt row in mutation response.")
  }

  return {
    message: typeof payload.message === "string" ? payload.message : "",
    prompt,
  }
}

function toAdminUserDetailsSchemaShape(payload: unknown): unknown {
  if (!isRecord(payload)) {
    return payload
  }

  const user = isRecord(payload.user) ? payload.user : {}
  const mappedUser = {
    id: typeof user.id === "string" ? user.id : "",
    name: typeof user.name === "string" || user.name === null ? user.name : null,
    country_code:
      typeof user.country_code === "string"
        ? user.country_code
        : typeof user.countryCode === "string"
          ? user.countryCode
          : "",
    phone_no:
      typeof user.phone_no === "string"
        ? user.phone_no
        : typeof user.phoneNo === "string"
          ? user.phoneNo
          : "",
    timezone:
      typeof user.timezone === "string" || user.timezone === null ? user.timezone : null,
    location_permission:
      typeof user.location_permission === "string" || user.location_permission === null
        ? user.location_permission
        : typeof user.locationPermission === "string" || user.locationPermission === null
          ? user.locationPermission
          : null,
    health_permission:
      typeof user.health_permission === "string" || user.health_permission === null
        ? user.health_permission
        : typeof user.healthPermission === "string" || user.healthPermission === null
          ? user.healthPermission
          : null,
    created_at:
      typeof user.created_at === "string"
        ? user.created_at
        : typeof user.createdAt === "string"
          ? user.createdAt
          : "",
    updated_at:
      typeof user.updated_at === "string"
        ? user.updated_at
        : typeof user.updatedAt === "string"
          ? user.updatedAt
          : "",
    ...user,
  }

  return {
    ...payload,
    user: mappedUser,
    cards: Array.isArray(payload.cards) ? payload.cards : [],
    emotional_timeline: Array.isArray(payload.emotional_timeline) ? payload.emotional_timeline : [],
    follow_request: Array.isArray(payload.follow_request) ? payload.follow_request : [],
    followers: Array.isArray(payload.followers) ? payload.followers : [],
    health: Array.isArray(payload.health) ? payload.health : [],
    location: Array.isArray(payload.location) ? payload.location : [],
    spotify: Array.isArray(payload.spotify) ? payload.spotify : [],
  }
}

async function memoizedRequest<T>({
  key,
  force = false,
  request,
}: {
  key: string
  force?: boolean
  request: () => Promise<T>
}): Promise<T> {
  const now = Date.now()
  const cached = requestCache.get(key)

  if (!force && cached && cached.expiresAt > now) {
    return cached.data as T
  }

  const inFlight = inFlightRequests.get(key)
  if (!force && inFlight) {
    return inFlight as Promise<T>
  }

  const promise = request()
    .then((data) => {
      requestCache.set(key, {
        data,
        expiresAt: Date.now() + REQUEST_CACHE_TTL_MS,
      })
      return data
    })
    .finally(() => {
      inFlightRequests.delete(key)
    })

  inFlightRequests.set(key, promise as Promise<unknown>)
  return promise
}

function clearCachedRequest(key: string) {
  requestCache.delete(key)
  inFlightRequests.delete(key)
}

function normalizeUsersPayload(payload: unknown): AdminUser[] {
  const toUsers = (arr: unknown[]) =>
    arr.map((item) => coerceAdminUser(item)).filter((item): item is AdminUser => item !== null)

  if (Array.isArray(payload)) {
    return toUsers(payload)
  }

  if (isRecord(payload)) {
    const candidates = [payload.users, payload.items, payload.data]
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return toUsers(candidate)
      }
    }
  }

  return []
}

export const adminUsersApi = {
  async list(force = false): Promise<AdminUser[]> {
    return memoizedRequest({
      key: "admin-users:list",
      force,
      request: async () => {
        const response = await adminAxios.get<unknown>("/admin/users")
        return normalizeUsersPayload(response.data)
      },
    })
  },
  async getById(id: string): Promise<AdminUserDetails> {
    return memoizedRequest({
      key: `admin-users:details:${id}`,
      request: async () => {
        const response = await adminAxios.get<unknown>(`/admin/user/${id}`)
        const schemaShape = toAdminUserDetailsSchemaShape(response.data)
        const parsed = adminSchemas.AdminUserDetailsResponse.safeParse(schemaShape)
        if (!parsed.success) {
          throw new Error("Invalid AdminUserDetailsResponse payload.")
        }

        const payload = parsed.data
        const user = coerceAdminUser(payload.user)
        if (!user) {
          throw new Error("Invalid user payload in AdminUserDetailsResponse.")
        }

        return {
          user,
          cards: toRecordArray(payload.cards),
          emotionalTimeline: toRecordArray(payload.emotional_timeline),
          followRequest: toRecordArray(payload.follow_request),
          followers: toRecordArray(payload.followers),
          health: toRecordArray(payload.health),
          location: toRecordArray(payload.location),
          spotify: toRecordArray(payload.spotify),
        }
      },
    })
  },
}

export const adminPromptsApi = {
  async list(force = false): Promise<AdminPromptTableRow[]> {
    return memoizedRequest({
      key: "admin-prompts:list",
      force,
      request: async () => {
        const response = await adminAxios.get<unknown>("/admin/prompts")
        return normalizePromptsPayload(response.data)
      },
    })
  },
  async create(data: AdminPromptUpsertRequest): Promise<AdminPromptMutationResponse> {
    const body = adminSchemas.AdminPromptUpsertRequest.parse(data)
    const response = await adminAxios.post<unknown>("/admin/prompts/create", body)
    const parsed = normalizePromptMutationPayload(response.data)
    clearCachedRequest("admin-prompts:list")
    return parsed
  },
  async update(
    id: string,
    data: AdminPromptUpsertRequest
  ): Promise<AdminPromptMutationResponse> {
    const body = adminSchemas.AdminPromptUpsertRequest.parse(data)
    const response = await adminAxios.put<unknown>(`/admin/prompts/${id}`, body)
    const parsed = normalizePromptMutationPayload(response.data)
    clearCachedRequest("admin-prompts:list")
    clearCachedRequest(`admin-prompts:${id}`)
    return parsed
  },
  async remove(id: string): Promise<AdminPromptMutationResponse> {
    const response = await adminAxios.delete<unknown>(`/admin/prompts/${id}`)
    const parsed = normalizePromptMutationPayload(response.data)
    clearCachedRequest("admin-prompts:list")
    clearCachedRequest(`admin-prompts:${id}`)
    return parsed
  },
}
