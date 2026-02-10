"use client"

export const AUTH_TOKEN_TTL_MS = 15 * 60 * 1000
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000
const REFRESH_BUFFER_MS = 60 * 1000

const STORAGE_KEYS = {
  authToken: "admin.auth_token",
  authTokenExpiresAt: "admin.auth_token_expires_at",
  refreshToken: "admin.refresh_token",
  refreshTokenExpiresAt: "admin.refresh_token_expires_at",
} as const

function canUseStorage() {
  return typeof window !== "undefined"
}

function readNumber(key: string): number | null {
  if (!canUseStorage()) {
    return null
  }

  const value = window.localStorage.getItem(key)
  if (!value) {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function getAuthToken() {
  if (!canUseStorage()) {
    return null
  }

  return window.localStorage.getItem(STORAGE_KEYS.authToken)
}

export function getRefreshToken() {
  if (!canUseStorage()) {
    return null
  }

  return window.localStorage.getItem(STORAGE_KEYS.refreshToken)
}

export function getAuthTokenExpiresAt() {
  return readNumber(STORAGE_KEYS.authTokenExpiresAt)
}

export function getRefreshTokenExpiresAt() {
  return readNumber(STORAGE_KEYS.refreshTokenExpiresAt)
}

export function isAuthTokenExpired(bufferMs = REFRESH_BUFFER_MS) {
  const token = getAuthToken()
  if (!token) {
    return true
  }

  const expiresAt = getAuthTokenExpiresAt()
  if (!expiresAt) {
    return true
  }

  return Date.now() >= expiresAt - bufferMs
}

export function isRefreshTokenExpired() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    return true
  }

  const expiresAt = getRefreshTokenExpiresAt()
  if (!expiresAt) {
    return false
  }

  return Date.now() >= expiresAt
}

export function storeSignInSession(authToken: string, refreshToken: string) {
  if (!canUseStorage()) {
    return
  }

  const now = Date.now()
  window.localStorage.setItem(STORAGE_KEYS.authToken, authToken)
  window.localStorage.setItem(
    STORAGE_KEYS.authTokenExpiresAt,
    String(now + AUTH_TOKEN_TTL_MS)
  )
  window.localStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken)
  window.localStorage.setItem(
    STORAGE_KEYS.refreshTokenExpiresAt,
    String(now + REFRESH_TOKEN_TTL_MS)
  )
}

export function storeRefreshedAuthToken(authToken: string) {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.setItem(STORAGE_KEYS.authToken, authToken)
  window.localStorage.setItem(
    STORAGE_KEYS.authTokenExpiresAt,
    String(Date.now() + AUTH_TOKEN_TTL_MS)
  )
}

export function clearSession() {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.removeItem(STORAGE_KEYS.authToken)
  window.localStorage.removeItem(STORAGE_KEYS.authTokenExpiresAt)
  window.localStorage.removeItem(STORAGE_KEYS.refreshToken)
  window.localStorage.removeItem(STORAGE_KEYS.refreshTokenExpiresAt)
}
