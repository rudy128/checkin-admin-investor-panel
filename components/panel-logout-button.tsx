"use client"

import * as React from "react"
import { LoaderCircleIcon, LogOutIcon } from "lucide-react"
import { useRouter } from "next/navigation"

import { setAdminAuthToken } from "@/lib/api/admin-browser"
import { setInvestorAuthToken } from "@/lib/api/investor-browser"
import { clearSession as clearAdminSession } from "@/lib/auth/admin-session"
import { clearSession as clearInvestorSession } from "@/lib/auth/investor-session"
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

export function PanelLogoutButton({ panel }: { panel: Panel }) {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = React.useState(false)

  function onLogout() {
    setLoggingOut(true)

    if (panel === "admin") {
      clearAdminSession()
      setAdminAuthToken(null)
    } else {
      clearInvestorSession()
      setInvestorAuthToken(null)
    }

    router.replace(PANEL_CONFIG[panel].signInPath)
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
