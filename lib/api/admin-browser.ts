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

export type AdminCreateUserRequest = {
  name: string
  number: string
  country_code: string
  timezone: string
  created_at: string
}

export type AdminPromptTableRow = {
  id: string
  name: string
  prompt: string
  category?: "health" | "location" | "spotify"
  prompt_scope: "card_generation" | "emotion_generation"
  created_at: string
  updated_at: string
  is_active: boolean
}

export type AdminPromptUpsertRequest = {
  name: string
  prompt: string
  category?: "health" | "location" | "spotify"
  prompt_scope: "card_generation" | "emotion_generation"
}

export type AdminPromptMutationResponse = {
  message: string
  prompt: AdminPromptTableRow
}

export type AdminSchedulerConfigRow = {
  id: string
  jobName: string
  displayName: string
  description: string
  cronExpression: string
  isEnabled: boolean
  model: string
  cardsPerUser: number
  batchSize: number
  delayBetweenBatchesMs: number
  targetUsers: unknown
  skipInactiveDays: number
  lastRun: string | null
  nextRunAt: string | null
  totalRuns: number
  createdAt: string
  [key: string]: unknown
}

export type AdminSchedulerLogRow = {
  id: string
  schedulerJobId: string
  lastRunAt: string
  lastRunStatus: string
  lastRunSummary: Record<string, unknown> | null
  [key: string]: unknown
}

export type AdminSchedulerResponse = {
  configuration: AdminSchedulerConfigRow[]
  scheduler_logs: AdminSchedulerLogRow[]
}

export type AdminSchedulerUpdateRequest = {
  job_name: string
  display_name: string
  description: string
  cron_expression: string
  is_enabled: boolean
  model: string
  cards_per_user: number
  batch_size: number
  delay_between_batches_ms: number
  target_users: string[] | string | Record<string, unknown>
  skip_inactive_days: number
}

export type AdminSchedulerStartRequest = {
  job_name: "card_generation" | "emotion_generation"
  user_ids: string[]
}

export type AdminSchedulerMutationResponse = {
  message: string
  configuration: AdminSchedulerConfigRow
}

export type AdminSchedulerStartResponse = {
  message: string
  triggered_at: string
  tick_accepted: boolean
  requested_job_name: "card_generation" | "emotion_generation"
  requested_user_ids: string[]
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
  const categoryRaw = value.category
  const promptScopeRaw =
    typeof value.prompt_scope === "string"
      ? value.prompt_scope
      : typeof value.promptScope === "string"
        ? value.promptScope
        : null
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
  const category =
    categoryRaw === "health" || categoryRaw === "location" || categoryRaw === "spotify"
      ? categoryRaw
      : undefined
  const promptScope =
    promptScopeRaw === "card_generation" || promptScopeRaw === "emotion_generation"
      ? promptScopeRaw
      : null

  if (
    typeof id !== "string" ||
    typeof name !== "string" ||
    typeof prompt !== "string" ||
    promptScope === null ||
    typeof createdAtRaw !== "string" ||
    typeof updatedAtRaw !== "string" ||
    typeof isActiveRaw !== "boolean"
  ) {
    return null
  }
  if (promptScope === "card_generation" && category === undefined) {
    return null
  }

  return {
    id,
    name,
    prompt,
    category,
    prompt_scope: promptScope,
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

function normalizePromptUpsertPayload(
  data: AdminPromptUpsertRequest
): AdminPromptUpsertRequest {
  const promptScope = data.prompt_scope

  if (promptScope === "card_generation") {
    if (
      data.category !== "health" &&
      data.category !== "location" &&
      data.category !== "spotify"
    ) {
      throw new Error("Category is required when prompt scope is card_generation.")
    }
    return {
      name: data.name,
      prompt: data.prompt,
      prompt_scope: promptScope,
      category: data.category,
    }
  }

  return {
    name: data.name,
    prompt: data.prompt,
    prompt_scope: promptScope,
  }
}

function coerceInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && Number.isInteger(value)) {
    return value
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    if (Number.isFinite(parsed) && Number.isInteger(parsed)) {
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

function coerceSchedulerConfigRow(value: unknown): AdminSchedulerConfigRow | null {
  if (!isRecord(value)) {
    return null
  }

  const id = typeof value.id === "string" ? value.id : null
  const jobName =
    typeof value.jobName === "string"
      ? value.jobName
      : typeof value.job_name === "string"
        ? value.job_name
        : null
  const displayName =
    typeof value.displayName === "string"
      ? value.displayName
      : typeof value.display_name === "string"
        ? value.display_name
        : null
  const description = typeof value.description === "string" ? value.description : null
  const cronExpression =
    typeof value.cronExpression === "string"
      ? value.cronExpression
      : typeof value.cron_expression === "string"
        ? value.cron_expression
        : null
  const isEnabled =
    coerceBoolean(
      typeof value.isEnabled === "boolean"
        ? value.isEnabled
        : value.is_enabled
    )
  const model = typeof value.model === "string" ? value.model : null
  const cardsPerUser = coerceInteger(
    typeof value.cardsPerUser === "number" || typeof value.cardsPerUser === "string"
      ? value.cardsPerUser
      : value.cards_per_user
  )
  const batchSize = coerceInteger(
    typeof value.batchSize === "number" || typeof value.batchSize === "string"
      ? value.batchSize
      : value.batch_size
  )
  const delayBetweenBatchesMs = coerceInteger(
    typeof value.delayBetweenBatchesMs === "number" || typeof value.delayBetweenBatchesMs === "string"
      ? value.delayBetweenBatchesMs
      : value.delay_between_batches_ms
  )
  const targetUsers = value.targetUsers ?? value.target_users ?? null
  const skipInactiveDays = coerceInteger(
    typeof value.skipInactiveDays === "number" || typeof value.skipInactiveDays === "string"
      ? value.skipInactiveDays
      : value.skip_inactive_days
  )
  const lastRun =
    typeof value.lastRun === "string" || value.lastRun === null
      ? value.lastRun
      : typeof value.last_run === "string" || value.last_run === null
        ? value.last_run
        : null
  const nextRunAt =
    typeof value.nextRunAt === "string" || value.nextRunAt === null
      ? value.nextRunAt
      : typeof value.next_run_at === "string" || value.next_run_at === null
        ? value.next_run_at
        : null
  const totalRuns = coerceInteger(
    typeof value.totalRuns === "number" || typeof value.totalRuns === "string"
      ? value.totalRuns
      : value.total_runs
  )
  const createdAt =
    typeof value.createdAt === "string"
      ? value.createdAt
      : typeof value.created_at === "string"
        ? value.created_at
        : null

  if (
    typeof id !== "string" ||
    typeof jobName !== "string" ||
    typeof displayName !== "string" ||
    typeof description !== "string" ||
    typeof cronExpression !== "string" ||
    typeof isEnabled !== "boolean" ||
    typeof model !== "string" ||
    typeof cardsPerUser !== "number" ||
    typeof batchSize !== "number" ||
    typeof delayBetweenBatchesMs !== "number" ||
    typeof skipInactiveDays !== "number" ||
    typeof totalRuns !== "number" ||
    typeof createdAt !== "string"
  ) {
    return null
  }

  return {
    id,
    jobName,
    displayName,
    description,
    cronExpression,
    isEnabled,
    model,
    cardsPerUser,
    batchSize,
    delayBetweenBatchesMs,
    targetUsers,
    skipInactiveDays,
    lastRun,
    nextRunAt,
    totalRuns,
    createdAt,
    ...value,
  }
}

function coerceSchedulerLogRow(value: unknown): AdminSchedulerLogRow | null {
  if (!isRecord(value)) {
    return null
  }

  const id = typeof value.id === "string" ? value.id : null
  const schedulerJobId =
    typeof value.schedulerJobId === "string"
      ? value.schedulerJobId
      : typeof value.scheduler_job_id === "string"
        ? value.scheduler_job_id
        : null
  const lastRunAt =
    typeof value.lastRunAt === "string"
      ? value.lastRunAt
      : typeof value.last_run_at === "string"
        ? value.last_run_at
        : null
  const lastRunStatus =
    typeof value.lastRunStatus === "string"
      ? value.lastRunStatus
      : typeof value.last_run_status === "string"
        ? value.last_run_status
        : null
  const lastRunSummary =
    isRecord(value.lastRunSummary)
      ? value.lastRunSummary
      : isRecord(value.last_run_summary)
        ? value.last_run_summary
        : value.lastRunSummary === null || value.last_run_summary === null
          ? null
          : null

  if (
    typeof id !== "string" ||
    typeof schedulerJobId !== "string" ||
    typeof lastRunAt !== "string" ||
    typeof lastRunStatus !== "string"
  ) {
    return null
  }

  return {
    id,
    schedulerJobId,
    lastRunAt,
    lastRunStatus,
    lastRunSummary,
    ...value,
  }
}

function normalizeSchedulerPayload(payload: unknown): AdminSchedulerResponse {
  if (!isRecord(payload)) {
    return {
      configuration: [],
      scheduler_logs: [],
    }
  }

  const configurationRaw = Array.isArray(payload.configuration)
    ? payload.configuration
    : Array.isArray(payload.scheduler_config)
      ? payload.scheduler_config
      : []
  const logsRaw = Array.isArray(payload.scheduler_logs)
    ? payload.scheduler_logs
    : Array.isArray(payload.schedulerLogs)
      ? payload.schedulerLogs
      : Array.isArray(payload.logs)
        ? payload.logs
        : []

  return {
    configuration: configurationRaw
      .map((item) => coerceSchedulerConfigRow(item))
      .filter((item): item is AdminSchedulerConfigRow => item !== null),
    scheduler_logs: logsRaw
      .map((item) => coerceSchedulerLogRow(item))
      .filter((item): item is AdminSchedulerLogRow => item !== null),
  }
}

function normalizeSchedulerMutationPayload(payload: unknown): AdminSchedulerMutationResponse {
  if (!isRecord(payload)) {
    throw new Error("Invalid scheduler mutation response payload.")
  }

  const configuration = coerceSchedulerConfigRow(
    payload.configuration ?? payload.scheduler ?? payload.data
  )
  if (!configuration) {
    throw new Error("Invalid scheduler configuration row in mutation response.")
  }

  return {
    message: typeof payload.message === "string" ? payload.message : "",
    configuration,
  }
}

function normalizeSchedulerStartPayload(payload: unknown): AdminSchedulerStartResponse {
  if (!isRecord(payload)) {
    throw new Error("Invalid scheduler start response payload.")
  }

  const message = typeof payload.message === "string" ? payload.message : ""
  const triggeredAt =
    typeof payload.triggered_at === "string"
      ? payload.triggered_at
      : typeof payload.triggeredAt === "string"
        ? payload.triggeredAt
        : null
  const tickAccepted =
    typeof payload.tick_accepted === "boolean"
      ? payload.tick_accepted
      : typeof payload.tickAccepted === "boolean"
        ? payload.tickAccepted
        : false
  const requestedJobNameRaw =
    typeof payload.requested_job_name === "string"
      ? payload.requested_job_name
      : typeof payload.requestedJobName === "string"
        ? payload.requestedJobName
        : null
  const requestedJobName =
    requestedJobNameRaw === "card_generation" || requestedJobNameRaw === "emotion_generation"
      ? requestedJobNameRaw
      : null
  const requestedUserIdsRaw =
    Array.isArray(payload.requested_user_ids) && payload.requested_user_ids.every((value) => typeof value === "string")
      ? payload.requested_user_ids
      : Array.isArray(payload.requestedUserIds) && payload.requestedUserIds.every((value) => typeof value === "string")
        ? payload.requestedUserIds
        : null

  if (!triggeredAt || requestedJobName === null || requestedUserIdsRaw === null) {
    throw new Error("Invalid scheduler start response payload.")
  }

  return {
    message,
    triggered_at: triggeredAt,
    tick_accepted: tickAccepted,
    requested_job_name: requestedJobName,
    requested_user_ids: requestedUserIdsRaw,
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
  async create(data: AdminCreateUserRequest): Promise<AdminUser> {
    const body = adminSchemas.AdminCreateUserRequest.parse(data)
    const response = await adminAxios.post<unknown>("/admin/users/create", body)
    const payload =
      isRecord(response.data) && isRecord(response.data.user)
        ? response.data.user
        : response.data
    const user = coerceAdminUser(payload)
    if (!user) {
      throw new Error("Invalid admin user create response payload.")
    }

    clearCachedRequest("admin-users:list")
    return user
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
    const body = adminSchemas.AdminPromptUpsertRequest.parse(
      normalizePromptUpsertPayload(data)
    )
    const response = await adminAxios.post<unknown>("/admin/prompts/create", body)
    const parsed = normalizePromptMutationPayload(response.data)
    clearCachedRequest("admin-prompts:list")
    return parsed
  },
  async update(
    id: string,
    data: AdminPromptUpsertRequest
  ): Promise<AdminPromptMutationResponse> {
    const body = adminSchemas.AdminPromptUpsertRequest.parse(
      normalizePromptUpsertPayload(data)
    )
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

export const adminSchedulerApi = {
  async list(force = false): Promise<AdminSchedulerResponse> {
    return memoizedRequest({
      key: "admin-scheduler:list",
      force,
      request: async () => {
        const response = await adminAxios.get<unknown>("/admin/scheduler")
        const normalized = normalizeSchedulerPayload(response.data)
        const parsed = adminSchemas.AdminSchedulerResponse.safeParse(normalized)
        return parsed.success ? (parsed.data as AdminSchedulerResponse) : normalized
      },
    })
  },
  async start(data: AdminSchedulerStartRequest): Promise<AdminSchedulerStartResponse> {
    const sanitizedUserIds = Array.isArray(data.user_ids)
      ? data.user_ids
          .map((value) => (typeof value === "string" ? value.trim() : ""))
          .filter((value) => value.length > 0)
      : []
    const body = adminSchemas.AdminSchedulerStartRequest.parse({
      job_name: data.job_name,
      user_ids: sanitizedUserIds,
    })
    const response = await adminAxios.post<unknown>("/admin/scheduler/start", body)
    const responseData = response.data
    const normalized = normalizeSchedulerStartPayload(responseData)
    const parsed = adminSchemas.AdminSchedulerStartResponse.safeParse(normalized)
    clearCachedRequest("admin-scheduler:list")
    return parsed.success ? (parsed.data as AdminSchedulerStartResponse) : normalized
  },
  async update(
    id: string,
    data: AdminSchedulerUpdateRequest
  ): Promise<AdminSchedulerMutationResponse> {
    const body = adminSchemas.AdminSchedulerUpdateRequest.parse(data)
    const response = await adminAxios.put<unknown>(`/admin/scheduler/${id}`, body)
    const normalized = normalizeSchedulerMutationPayload(response.data)
    const parsed = adminSchemas.AdminSchedulerMutationResponse.safeParse(normalized)
    clearCachedRequest("admin-scheduler:list")
    return parsed.success ? (parsed.data as AdminSchedulerMutationResponse) : normalized
  },
}
