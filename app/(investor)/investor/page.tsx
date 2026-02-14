import { ArrowUpRightIcon, BriefcaseBusinessIcon, ChartLineIcon, LandmarkIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const stats = [
  {
    label: "Total Portfolio Value",
    value: "$4.2M",
    delta: "+2.1% today",
    icon: LandmarkIcon,
  },
  {
    label: "Active Positions",
    value: "19",
    delta: "3 pending updates",
    icon: BriefcaseBusinessIcon,
  },
  {
    label: "Monthly Return",
    value: "+8.4%",
    delta: "vs +6.3% benchmark",
    icon: ChartLineIcon,
  },
]

export default function InvestorPage() {
  return (
    <div className="mx-auto w-full max-w-[1400px] p-4 md:p-6">
      <section className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-sm">Investor Overview</p>
          <h1 className="text-2xl font-semibold tracking-tight">Investor Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Portfolio Healthy</Badge>
          <Button>
            Open Portfolio
            <ArrowUpRightIcon data-icon="inline-end" />
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {stats.map((item) => (
          <Card key={item.label}>
            <CardHeader>
              <CardDescription className="flex items-center justify-between">
                {item.label}
                <item.icon className="text-muted-foreground size-4" />
              </CardDescription>
              <CardTitle className="text-3xl">{item.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">{item.delta}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  )
}
