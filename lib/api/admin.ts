import "server-only"

import axios from "axios"
import { revalidateTag, unstable_cache } from "next/cache"

import { createApiClient as createAdminApiClient } from "@/types/generated/admin/Admin"
import { createApiClient as createAdminAuthApiClient } from "@/types/generated/admin/Admin_Auth"

const ADMIN_ME_CACHE_TAG = "admin:me"
const ADMIN_ME_REVALIDATE_SECONDS = 60

function resolveApiBaseUrl(): string {
  const rawUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL

  if (!rawUrl) {
    throw new Error("Missing API_URL (or NEXT_PUBLIC_API_URL) for admin API client.")
  }

  const hasProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(rawUrl)
  const normalized = hasProtocol ? rawUrl : `http://${rawUrl}`

  return normalized.replace(/\/+$/, "")
}

const apiBaseUrl = resolveApiBaseUrl()

export const adminAxios = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10_000,
  headers: {
    Accept: "application/json",
  },
})

export const adminApi = createAdminApiClient(apiBaseUrl, {
  axiosInstance: adminAxios,
})

export const adminAuthApi = createAdminAuthApiClient(apiBaseUrl, {
  axiosInstance: adminAxios,
})

const getAdminMeCached = unstable_cache(
  async (authToken: string) =>
    adminApi.getAdminme({
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    }),
  ["admin", "me"],
  {
    revalidate: ADMIN_ME_REVALIDATE_SECONDS,
    tags: [ADMIN_ME_CACHE_TAG],
  }
)

export function getCachedAdminMe(authToken: string) {
  return getAdminMeCached(authToken)
}

export function revalidateAdminMeCache() {
  revalidateTag(ADMIN_ME_CACHE_TAG)
}

export function signInAdmin(username: string, password: string) {
  return adminAuthApi.postAdminauthsignin({ username, password })
}

export function refreshAdminAuthToken(refreshToken: string) {
  return adminAuthApi.postAdminauthrefresh(undefined, {
    headers: {
      "X-Refresh-Token": refreshToken,
    },
  })
}
