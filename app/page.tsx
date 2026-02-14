"use client"

import * as React from "react"
import Link from "next/link"
import { Building2Icon, LoaderCircleIcon, TrendingUpIcon } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  getAuthToken as getAdminAuthToken,
  getRefreshToken as getAdminRefreshToken,
  getRefreshTokenExpiresAt as getAdminRefreshTokenExpiresAt,
  isAuthTokenExpired as isAdminAuthTokenExpired,
  isRefreshTokenExpired as isAdminRefreshTokenExpired,
} from "@/lib/auth/admin-session"
import {
  getAuthToken as getInvestorAuthToken,
  getRefreshToken as getInvestorRefreshToken,
  getRefreshTokenExpiresAt as getInvestorRefreshTokenExpiresAt,
  isAuthTokenExpired as isInvestorAuthTokenExpired,
  isRefreshTokenExpired as isInvestorRefreshTokenExpired,
} from "@/lib/auth/investor-session"

export default function HomePage() {
  const router = useRouter()
  const [checkingSession, setCheckingSession] = React.useState(true)

  React.useEffect(() => {
    const adminAuthToken = getAdminAuthToken()
    const adminRefreshToken = getAdminRefreshToken()
    const investorAuthToken = getInvestorAuthToken()
    const investorRefreshToken = getInvestorRefreshToken()
    const hasAdminSession =
      (typeof adminAuthToken === "string" && !isAdminAuthTokenExpired()) ||
      (typeof adminRefreshToken === "string" && !isAdminRefreshTokenExpired())
    const hasInvestorSession =
      (typeof investorAuthToken === "string" && !isInvestorAuthTokenExpired()) ||
      (typeof investorRefreshToken === "string" && !isInvestorRefreshTokenExpired())

    if (hasAdminSession && !hasInvestorSession) {
      router.replace("/admin")
      return
    }

    if (hasInvestorSession && !hasAdminSession) {
      router.replace("/investor")
      return
    }

    if (hasAdminSession && hasInvestorSession) {
      const adminExpiry = getAdminRefreshTokenExpiresAt() ?? 0
      const investorExpiry = getInvestorRefreshTokenExpiresAt() ?? 0
      router.replace(investorExpiry > adminExpiry ? "/investor" : "/admin")
      return
    }

    setCheckingSession(false)
  }, [router])

  if (checkingSession) {
    return (
      <div className="text-muted-foreground flex min-h-screen items-center justify-center gap-2 text-sm">
        <LoaderCircleIcon className="size-4 animate-spin" />
        <span>Checking sessions...</span>
      </div>
    )
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-4 py-10">
      <section className="mb-8 space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight">Panels Portal</h1>
        <p className="text-muted-foreground max-w-2xl">
          Choose your workspace to continue. Admin and Investor panels use separate
          authentication and layout flows.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2Icon className="size-4" />
              Admin Panel
            </CardTitle>
            <CardDescription>Users, prompts, scheduler, and operational controls.</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button asChild>
              <Link href="/admin/signin">Admin Sign In</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin">Open Admin</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUpIcon className="size-4" />
              Investor Panel
            </CardTitle>
            <CardDescription>Investor authentication and portfolio dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button asChild>
              <Link href="/investor/signin">Investor Sign In</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/investor">Open Investor</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
