"use client"

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

type InvestorPerformanceChartProps = {
  lineChart: Record<string, number>
}

const chartConfig = {
  signups: {
    label: "Monthly Signups",
    color: "var(--color-chart-2)",
    valueFormatter: (value: number | string) => {
      if (typeof value === "number") {
        return new Intl.NumberFormat("en-US").format(value)
      }
      return value
    },
  },
} satisfies ChartConfig

function toMonthTimestamp(value: string) {
  const parsed = Date.parse(`${value} 1`)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeChartData(lineChart: Record<string, number>) {
  return Object.entries(lineChart)
    .map(([month, signups]) => ({
      month,
      signups,
    }))
    .sort((a, b) => {
      const aTs = toMonthTimestamp(a.month)
      const bTs = toMonthTimestamp(b.month)
      if (aTs !== null && bTs !== null) {
        return aTs - bTs
      }
      return a.month.localeCompare(b.month)
    })
}

export function InvestorPerformanceChart({ lineChart }: InvestorPerformanceChartProps) {
  const chartData = normalizeChartData(lineChart)

  return (
    <Card className="md:col-span-3">
      <CardHeader>
        <CardTitle>Monthly Signups</CardTitle>
        <CardDescription>User signup trend from `/investor/stats`.</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-muted-foreground py-4 text-sm">No signup data available.</p>
        ) : (
          <ChartContainer config={chartConfig} className="h-[320px] w-full">
            <LineChart data={chartData} margin={{ top: 10, right: 12, left: 12, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="4 4" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis
                width={44}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value: number) => new Intl.NumberFormat("en-US").format(value)}
              />
              <ChartTooltip content={<ChartTooltipContent />} cursor={false} />
              <Line
                dataKey="signups"
                type="monotone"
                stroke="var(--color-signups)"
                strokeWidth={2.5}
                dot={{
                  fill: "var(--background)",
                  r: 4.5,
                  stroke: "var(--color-signups)",
                  strokeWidth: 2.5,
                }}
                activeDot={{
                  r: 6,
                  fill: "var(--color-signups)",
                  stroke: "var(--background)",
                  strokeWidth: 2,
                }}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
