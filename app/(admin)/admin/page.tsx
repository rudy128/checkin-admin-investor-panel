import { ActivityIcon, ArrowUpRightIcon, FolderKanbanIcon, UsersIcon } from "lucide-react"

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
    label: "Active Panels",
    value: "26",
    delta: "+12% this week",
    icon: FolderKanbanIcon,
  },
  {
    label: "Daily Check-ins",
    value: "1,842",
    delta: "+7% today",
    icon: ActivityIcon,
  },
  {
    label: "Team Members",
    value: "134",
    delta: "8 pending invites",
    icon: UsersIcon,
  },
]

export default function DashboardPage() {
  return (
    <div className="mx-auto w-full max-w-[1400px] p-4 md:p-6">
      <section className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-sm">Overview</p>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">System Healthy</Badge>
          <Button>
            Open Workspace
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

      <section className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates from your panel teams.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-muted/40 rounded-lg border p-3">
              Ops panel completed deployment checklist.
            </div>
            <div className="bg-muted/40 rounded-lg border p-3">
              Customer Success posted 42 new check-ins.
            </div>
            <div className="bg-muted/40 rounded-lg border p-3">
              Finance dashboard sync finished successfully.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next Actions</CardTitle>
            <CardDescription>Focus items for today.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span>Review blocked check-ins</span>
              <Badge variant="outline">Priority</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span>Invite 3 new managers</span>
              <Badge variant="outline">Pending</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span>Close onboarding setup</span>
              <Badge variant="outline">Due Today</Badge>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
