"use client"

import * as React from "react"
import { LoaderCircleIcon, LogOutIcon } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"

import { setAdminAuthToken } from "@/lib/api/admin-browser"
import { setInvestorAuthToken } from "@/lib/api/investor-browser"
import {
  clearSession as clearAdminSession,
  getAuthToken as getAdminAuthToken,
  getRefreshToken as getAdminRefreshToken,
  isAuthTokenExpired as isAdminAuthTokenExpired,
  isRefreshTokenExpired as isAdminRefreshTokenExpired,
} from "@/lib/auth/admin-session"
import {
  clearSession as clearInvestorSession,
  getAuthToken as getInvestorAuthToken,
  getRefreshToken as getInvestorRefreshToken,
  isAuthTokenExpired as isInvestorAuthTokenExpired,
  isRefreshTokenExpired as isInvestorRefreshTokenExpired,
} from "@/lib/auth/investor-session"
import { Button } from "@/components/ui/button"

type Panel = "admin" | "investor"

const PANEL_CONFIG: Record<Panel, { signInPath: string }> = {
  admin: {
    signInPath: "/admin/signin",
  },
  investor: {
    signInPath: "/investor/signin",
  },
}

function hasActiveSession(panel: Panel) {
  if (panel === "admin") {
    const authToken = getAdminAuthToken()
    const refreshToken = getAdminRefreshToken()
    return (
      (typeof authToken === "string" && !isAdminAuthTokenExpired()) ||
      (typeof refreshToken === "string" && !isAdminRefreshTokenExpired())
    )
  }

  const authToken = getInvestorAuthToken()
  const refreshToken = getInvestorRefreshToken()
  return (
    (typeof authToken === "string" && !isInvestorAuthTokenExpired()) ||
    (typeof refreshToken === "string" && !isInvestorRefreshTokenExpired())
  )
}

export function PanelLogoutButton({ panel }: { panel: Panel }) {
  const router = useRouter()
  const pathname = usePathname()
  const [loggingOut, setLoggingOut] = React.useState(false)
  const [hasSession, setHasSession] = React.useState(false)

  React.useEffect(() => {
    const syncSessionState = () => {
      const active = hasActiveSession(panel)
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
  }, [panel, pathname])

  function onLogout() {
    setLoggingOut(true)

    if (panel === "admin") {
      clearAdminSession()
      setAdminAuthToken(null)
    } else {
      clearInvestorSession()
      setInvestorAuthToken(null)
    }

    setHasSession(false)
    router.replace(PANEL_CONFIG[panel].signInPath)
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
      aria-label={`Log out from ${panel}`}
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
