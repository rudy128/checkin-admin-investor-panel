"use client"

import * as React from "react"
import { LoaderCircleIcon } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"

import { investorAuthApi, setInvestorAuthToken } from "@/lib/api/investor-browser"
import {
  clearSession,
  getAuthToken,
  getRefreshToken,
  isAuthTokenExpired,
  isRefreshTokenExpired,
  storeRefreshedAuthToken,
} from "@/lib/auth/investor-session"

const SIGN_IN_PATH = "/investor/signin"
const HOME_PATH = "/investor"
const REFRESH_CHECK_INTERVAL_MS = 30 * 1000

function isProtectedPath(pathname: string) {
  return pathname !== SIGN_IN_PATH
}

export function InvestorAuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [authState, setAuthState] = React.useState<
    "checking" | "authorized" | "unauthorized"
  >("checking")
  const refreshPromiseRef = React.useRef<Promise<boolean> | null>(null)

  const refreshAuthToken = React.useCallback(async () => {
    const refreshToken = getRefreshToken()
    if (!refreshToken || isRefreshTokenExpired()) {
      clearSession()
      setInvestorAuthToken(null)
      return false
    }

    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current
    }

    refreshPromiseRef.current = (async () => {
      try {
        const response = await investorAuthApi.postInvestorauthrefresh(undefined, {
          headers: {
            "X-Refresh-Token": refreshToken,
          },
        })

        storeRefreshedAuthToken(response.auth_token)
        setInvestorAuthToken(response.auth_token)
        return true
      } catch {
        clearSession()
        setInvestorAuthToken(null)
        return false
      } finally {
        refreshPromiseRef.current = null
      }
    })()

    return refreshPromiseRef.current
  }, [])

  React.useEffect(() => {
    let isMounted = true

    async function bootstrapSession() {
      const protectedPath = isProtectedPath(pathname)
      const refreshToken = getRefreshToken()

      if (!refreshToken || isRefreshTokenExpired()) {
        clearSession()
        setInvestorAuthToken(null)

        if (protectedPath) {
          router.replace(SIGN_IN_PATH)
        }

        if (isMounted) {
          setAuthState("unauthorized")
        }
        return
      }

      const authToken = getAuthToken()
      if (authToken) {
        setInvestorAuthToken(authToken)
      }

      if (!authToken || isAuthTokenExpired()) {
        const refreshed = await refreshAuthToken()
        if (!refreshed) {
          if (protectedPath) {
            router.replace(SIGN_IN_PATH)
          }

          if (isMounted) {
            setAuthState("unauthorized")
          }
          return
        }
      }

      if (isMounted) {
        setAuthState("authorized")
      }

      if (!protectedPath) {
        router.replace(HOME_PATH)
      }
    }

    setAuthState("checking")
    void bootstrapSession()

    return () => {
      isMounted = false
    }
  }, [pathname, refreshAuthToken, router])

  React.useEffect(() => {
    if (authState !== "authorized") {
      return
    }

    let canceled = false

    async function checkAndRefresh() {
      if (canceled) {
        return
      }

      const refreshToken = getRefreshToken()
      if (!refreshToken) {
        return
      }

      if (!isAuthTokenExpired()) {
        return
      }

      const refreshed = await refreshAuthToken()
      if (!refreshed && isProtectedPath(pathname)) {
        setAuthState("unauthorized")
        router.replace(SIGN_IN_PATH)
      }
    }

    const intervalId = window.setInterval(() => {
      void checkAndRefresh()
    }, REFRESH_CHECK_INTERVAL_MS)

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        void checkAndRefresh()
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange)

    return () => {
      canceled = true
      window.clearInterval(intervalId)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [authState, pathname, refreshAuthToken, router])

  if (pathname === SIGN_IN_PATH) {
    if (authState === "checking" || authState === "authorized") {
      return (
        <div className="text-muted-foreground flex min-h-[calc(100vh-3.5rem)] items-center justify-center gap-2 text-sm">
          <LoaderCircleIcon className="size-4 animate-spin" />
          <span>Checking session...</span>
        </div>
      )
    }

    return <>{children}</>
  }

  if (authState !== "authorized") {
    return (
      <div className="text-muted-foreground flex min-h-[calc(100vh-3.5rem)] items-center justify-center gap-2 text-sm">
        <LoaderCircleIcon className="size-4 animate-spin" />
        <span>Authorizing...</span>
      </div>
    )
  }

  return <>{children}</>
}
