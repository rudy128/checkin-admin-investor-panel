"use client"

import * as React from "react"
import {
  ArrowUpRightIcon,
  ChartLineIcon,
  LoaderCircleIcon,
  RefreshCwIcon,
  UsersIcon,
} from "lucide-react"

import { InvestorPerformanceChart } from "@/components/investor-performance-chart"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { investorStatsApi, type InvestorStatsResponse } from "@/lib/api/investor-browser"

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value)
}

export default function InvestorPage() {
  const [stats, setStats] = React.useState<InvestorStatsResponse | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState("")

  const loadStats = React.useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError("")

    try {
      const payload = await investorStatsApi.get()
      setStats(payload)
    } catch {
      setError("Failed to load investor stats.")
      setStats(null)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  React.useEffect(() => {
    void loadStats()
  }, [loadStats])

  const totalUsers = stats?.total_users ?? 0
  const activeUsers = stats?.active_users ?? 0
  const activeRatio = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0

  return (
    <div className="mx-auto w-full max-w-[1400px] p-4 md:p-6">
      <section className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-sm">Investor Overview</p>
          <h1 className="text-2xl font-semibold tracking-tight">Investor Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Live Stats</Badge>
          <Button variant="outline" size="sm" onClick={() => void loadStats(true)} disabled={loading || refreshing}>
            {refreshing ? (
              <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <RefreshCwIcon data-icon="inline-start" />
            )}
            Refresh
          </Button>
          <Button size="sm">
            Investor Activity
            <ArrowUpRightIcon data-icon="inline-end" />
          </Button>
        </div>
      </section>

      {error && <p className="text-destructive mb-4 text-sm">{error}</p>}

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription className="flex items-center justify-between">
              Total Users
              <UsersIcon className="text-muted-foreground size-4" />
            </CardDescription>
            <CardTitle className="text-3xl">
              {loading ? "..." : formatNumber(totalUsers)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">All users in `users`.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription className="flex items-center justify-between">
              Active Users (30 Days)
              <ChartLineIcon className="text-muted-foreground size-4" />
            </CardDescription>
            <CardTitle className="text-3xl">
              {loading ? "..." : formatNumber(activeUsers)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">Users refreshed in the last 30 days.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription className="flex items-center justify-between">
              Active Rate
              <ArrowUpRightIcon className="text-muted-foreground size-4" />
            </CardDescription>
            <CardTitle className="text-3xl">
              {loading ? "..." : `${activeRatio.toFixed(1)}%`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">Active / Total users.</p>
          </CardContent>
        </Card>

        <InvestorPerformanceChart lineChart={stats?.line_chart ?? {}} />
      </section>
    </div>
  )
}
