"use client"

import * as React from "react"
import { LoaderCircleIcon, LogOutIcon } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"

import { setAdminAuthToken } from "@/lib/api/admin-browser"
import {
  clearSession as clearAdminSession,
  getAuthToken as getAdminAuthToken,
  getRefreshToken as getAdminRefreshToken,
  isAuthTokenExpired as isAdminAuthTokenExpired,
  isRefreshTokenExpired as isAdminRefreshTokenExpired,
} from "@/lib/auth/admin-session"
import { Button } from "@/components/ui/button"

const SIGN_IN_PATH = "/admin/signin"

function hasActiveSession() {
  const authToken = getAdminAuthToken()
  const refreshToken = getAdminRefreshToken()
  return (
    (typeof authToken === "string" && !isAdminAuthTokenExpired()) ||
    (typeof refreshToken === "string" && !isAdminRefreshTokenExpired())
  )
}

export function PanelLogoutButton() {
  const router = useRouter()
  const pathname = usePathname()
  const [loggingOut, setLoggingOut] = React.useState(false)
  const [hasSession, setHasSession] = React.useState(false)

  React.useEffect(() => {
    const syncSessionState = () => {
      const active = hasActiveSession()
      setHasSession(active)
      if (!active) {
        setLoggingOut(false)
      }
    }

    syncSessionState()

    function onStorage() {
      syncSessionState()
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        syncSessionState()
      }
    }

    window.addEventListener("storage", onStorage)
    document.addEventListener("visibilitychange", onVisibilityChange)

    return () => {
      window.removeEventListener("storage", onStorage)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [pathname])

  function onLogout() {
    setLoggingOut(true)

    clearAdminSession()
    setAdminAuthToken(null)

    setHasSession(false)
    router.replace(SIGN_IN_PATH)
  }

  if (!hasSession) {
    return null
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onLogout}
      disabled={loggingOut}
      aria-label="Log out from admin"
    >
      {loggingOut ? (
        <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />
      ) : (
        <LogOutIcon data-icon="inline-start" />
      )}
      Logout
    </Button>
  )
}
