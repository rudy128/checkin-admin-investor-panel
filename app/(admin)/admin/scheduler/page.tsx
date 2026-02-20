"use client"

import * as React from "react"
import {
  CalendarClockIcon,
  LoaderCircleIcon,
  PencilLineIcon,
  PlayIcon,
  RefreshCwIcon,
} from "lucide-react"
import { toast } from "sonner"

import {
  adminSchedulerApi,
  type AdminSchedulerConfigRow,
  type AdminSchedulerLogRow,
  type AdminSchedulerStartRequest,
  type AdminSchedulerUpdateRequest,
} from "@/lib/api/admin-browser"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

type SchedulerEditForm = {
  job_name: string
  display_name: string
  description: string
  cron_expression: string
  is_enabled: boolean
  model: string
  cards_per_user: string
  batch_size: string
  delay_between_batches_ms: string
  target_users_input: string
  skip_inactive_days: string
}

function formatDate(value?: string | null) {
  if (!value) {
    return "-"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

function formatTargetUsers(value: unknown) {
  if (value === null || value === undefined) {
    return ""
  }

  if (typeof value === "string") {
    return value
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return ""
  }
}

function parseTargetUsersInput(input: string): AdminSchedulerUpdateRequest["target_users"] {
  const trimmed = input.trim()
  if (!trimmed) {
    return {}
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown

    if (typeof parsed === "string") {
      return parsed
    }

    if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
      return parsed
    }

    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, unknown>
    }
  } catch {
    return trimmed
  }

  return trimmed
}

function parseIntegerField(value: string, label: string): number {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} must be a valid integer.`)
  }
  return parsed
}

function parseStartUserIds(input: string): string[] {
  const trimmed = input.trim()
  if (!trimmed) {
    return []
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (Array.isArray(parsed) && parsed.every((value) => typeof value === "string")) {
      return [...new Set(parsed.map((value) => value.trim()).filter((value) => value.length > 0))]
    }
  } catch {
    // Fallback to delimiter parsing.
  }

  const uniqueUserIds = new Set<string>()
  const parts = trimmed
    .split(/[\s,]+/g)
    .map((value) => value.trim())
    .filter((value) => value.length > 0)

  for (const id of parts) {
    uniqueUserIds.add(id)
  }

  return [...uniqueUserIds]
}

export default function SchedulerPage() {
  const [configuration, setConfiguration] = React.useState<AdminSchedulerConfigRow[]>([])
  const [logs, setLogs] = React.useState<AdminSchedulerLogRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [starting, setStarting] = React.useState(false)
  const [error, setError] = React.useState("")
  const [startDialogOpen, setStartDialogOpen] = React.useState(false)
  const [startJobName, setStartJobName] =
    React.useState<AdminSchedulerStartRequest["job_name"]>("emotion_generation")
  const [startUserIdsInput, setStartUserIdsInput] = React.useState("")

  const [editingConfig, setEditingConfig] = React.useState<AdminSchedulerConfigRow | null>(null)
  const [editForm, setEditForm] = React.useState<SchedulerEditForm | null>(null)
  const [savingId, setSavingId] = React.useState<string | null>(null)

  const loadScheduler = React.useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError("")

    try {
      const data = await adminSchedulerApi.list(isRefresh)
      setConfiguration(data.configuration)
      setLogs(data.scheduler_logs)
    } catch {
      setError("Failed to load scheduler data.")
      toast.error("Failed to load scheduler data.")
      setConfiguration([])
      setLogs([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  React.useEffect(() => {
    void loadScheduler()
  }, [loadScheduler])

  async function onStartScheduler(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const userIds = parseStartUserIds(startUserIdsInput)
    if (userIds.length === 0) {
      toast.error("At least one user ID is required.")
      return
    }

    setStarting(true)
    setError("")

    try {
      const response = await adminSchedulerApi.start({
        job_name: startJobName,
        user_ids: userIds,
      })
      const message = response.message || "Scheduler triggered."
      toast.success(`${message} ${formatDate(response.triggered_at)}`)
      setStartDialogOpen(false)
      setStartJobName("emotion_generation")
      setStartUserIdsInput("")
      await loadScheduler(true)
    } catch {
      setError("Failed to trigger scheduler.")
      toast.error("Failed to trigger scheduler.")
    } finally {
      setStarting(false)
    }
  }

  function openEditDialog(row: AdminSchedulerConfigRow) {
    setEditingConfig(row)
    setEditForm({
      job_name: row.jobName,
      display_name: row.displayName,
      description: row.description,
      cron_expression: row.cronExpression,
      is_enabled: row.isEnabled,
      model: row.model,
      cards_per_user: String(row.cardsPerUser),
      batch_size: String(row.batchSize),
      delay_between_batches_ms: String(row.delayBetweenBatchesMs),
      target_users_input: formatTargetUsers(row.targetUsers),
      skip_inactive_days: String(row.skipInactiveDays),
    })
  }

  async function onSaveConfig(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingConfig || !editForm) {
      return
    }

    try {
      const payload: AdminSchedulerUpdateRequest = {
        job_name: editForm.job_name.trim(),
        display_name: editForm.display_name.trim(),
        description: editForm.description.trim(),
        cron_expression: editForm.cron_expression.trim(),
        is_enabled: editForm.is_enabled,
        model: editForm.model.trim(),
        cards_per_user: parseIntegerField(editForm.cards_per_user, "Cards per user"),
        batch_size: parseIntegerField(editForm.batch_size, "Batch size"),
        delay_between_batches_ms: parseIntegerField(
          editForm.delay_between_batches_ms,
          "Delay between batches"
        ),
        target_users: parseTargetUsersInput(editForm.target_users_input),
        skip_inactive_days: parseIntegerField(editForm.skip_inactive_days, "Skip inactive days"),
      }

      setSavingId(editingConfig.id)
      setError("")
      const response = await adminSchedulerApi.update(editingConfig.id, payload)
      toast.success(response.message || "Scheduler configuration updated.")
      setEditingConfig(null)
      setEditForm(null)
      await loadScheduler(true)
    } catch (errorValue) {
      const message =
        errorValue instanceof Error ? errorValue.message : "Failed to update scheduler configuration."
      setError(message)
      toast.error(message)
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] p-4 md:p-6">
      <section className="mb-4 border-b pb-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Scheduler</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => void loadScheduler(true)} disabled={loading || refreshing}>
              {refreshing ? (
                <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />
              ) : (
                <RefreshCwIcon data-icon="inline-start" />
              )}
              Refresh
            </Button>
            <Button size="sm" onClick={() => setStartDialogOpen(true)} disabled={starting}>
              {starting ? (
                <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />
              ) : (
                <PlayIcon data-icon="inline-start" />
              )}
              Run Now
            </Button>
          </div>
        </div>
      </section>

      {error && <p className="text-destructive mb-3 text-sm">{error}</p>}

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClockIcon className="size-4" />
              Scheduler Configuration
            </CardTitle>
            <CardDescription>Routes: `/admin/scheduler`, `/admin/scheduler/:id`.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-muted-foreground flex items-center gap-2 py-4 text-sm">
                <LoaderCircleIcon className="size-4 animate-spin" />
                Loading configuration...
              </div>
            ) : configuration.length === 0 ? (
              <p className="text-muted-foreground py-2 text-sm">No scheduler configuration found.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[1000px] text-sm">
                  <thead className="bg-muted/40 text-left">
                    <tr>
                      <th className="px-3 py-2 font-medium">Job</th>
                      <th className="px-3 py-2 font-medium">Cron</th>
                      <th className="px-3 py-2 font-medium">Model</th>
                      <th className="px-3 py-2 font-medium">Enabled</th>
                      <th className="px-3 py-2 font-medium">Cards/User</th>
                      <th className="px-3 py-2 font-medium">Batch</th>
                      <th className="px-3 py-2 font-medium">Delay (ms)</th>
                      <th className="px-3 py-2 font-medium">Next Run</th>
                      <th className="px-3 py-2 font-medium">Runs</th>
                      <th className="px-3 py-2 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {configuration.map((row) => (
                      <tr key={row.id} className="border-t">
                        <td className="px-3 py-2">
                          <p className="font-medium">{row.displayName}</p>
                          <p className="text-muted-foreground line-clamp-1 text-xs">{row.jobName}</p>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{row.cronExpression}</td>
                        <td className="px-3 py-2">{row.model}</td>
                        <td className="px-3 py-2">
                          <Badge variant={row.isEnabled ? "default" : "outline"}>
                            {row.isEnabled ? "Enabled" : "Disabled"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">{row.cardsPerUser}</td>
                        <td className="px-3 py-2">{row.batchSize}</td>
                        <td className="px-3 py-2">{row.delayBetweenBatchesMs}</td>
                        <td className="px-3 py-2">{formatDate(row.nextRunAt)}</td>
                        <td className="px-3 py-2">{row.totalRuns}</td>
                        <td className="px-3 py-2">
                          <Button size="sm" variant="outline" onClick={() => openEditDialog(row)}>
                            <PencilLineIcon data-icon="inline-start" />
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader>
            <CardTitle>Scheduler Logs</CardTitle>
            <CardDescription>Latest entries from `scheduler_logs`.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-muted-foreground flex items-center gap-2 py-4 text-sm">
                <LoaderCircleIcon className="size-4 animate-spin" />
                Loading logs...
              </div>
            ) : logs.length === 0 ? (
              <p className="text-muted-foreground py-2 text-sm">No scheduler logs found.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="bg-muted/40 text-left">
                    <tr>
                      <th className="px-3 py-2 font-medium">Run At</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Summary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-t align-top">
                        <td className="px-3 py-2">{formatDate(log.lastRunAt)}</td>
                        <td className="px-3 py-2">
                          <Badge variant={log.lastRunStatus.toLowerCase() === "failed" ? "destructive" : "secondary"}>
                            {log.lastRunStatus}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <p className="text-muted-foreground line-clamp-3 max-w-[26rem] text-xs whitespace-pre-wrap [overflow-wrap:anywhere]">
                            {log.lastRunSummary
                              ? JSON.stringify(log.lastRunSummary)
                              : "-"}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog
        open={startDialogOpen}
        onOpenChange={(open) => {
          if (starting) {
            return
          }
          setStartDialogOpen(open)
          if (!open) {
            setStartJobName("emotion_generation")
            setStartUserIdsInput("")
          }
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Run Scheduler</AlertDialogTitle>
            <AlertDialogDescription>
              Select a job and provide one or more user IDs for `/admin/scheduler/start`.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <form className="space-y-3" onSubmit={onStartScheduler}>
            <Select
              value={startJobName}
              onValueChange={(value) =>
                setStartJobName(value as AdminSchedulerStartRequest["job_name"])
              }
              disabled={starting}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select scheduler job" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="card_generation">Card Generation</SelectItem>
                  <SelectItem value="emotion_generation">Emotion Generation</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            <Textarea
              value={startUserIdsInput}
              onChange={(event) => setStartUserIdsInput(event.target.value)}
              placeholder="Enter UUIDs separated by commas, spaces, or new lines"
              rows={4}
              autoFocus
              required
              disabled={starting}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" disabled={starting} onClick={() => setStartDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={starting}>
                {starting && <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />}
                Run
              </Button>
            </div>
          </form>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(editingConfig)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingConfig(null)
            setEditForm(null)
          }
        }}
      >
        <AlertDialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Scheduler</AlertDialogTitle>
            <AlertDialogDescription>
              Update scheduler configuration and submit to `/admin/scheduler/:id`.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {editForm && (
            <form className="space-y-3" onSubmit={onSaveConfig}>
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  value={editForm.job_name}
                  onChange={(event) =>
                    setEditForm((prev) => (prev ? { ...prev, job_name: event.target.value } : prev))
                  }
                  placeholder="Job name"
                  required
                />
                <Input
                  value={editForm.display_name}
                  onChange={(event) =>
                    setEditForm((prev) => (prev ? { ...prev, display_name: event.target.value } : prev))
                  }
                  placeholder="Display name"
                  required
                />
              </div>

              <Textarea
                value={editForm.description}
                onChange={(event) =>
                  setEditForm((prev) => (prev ? { ...prev, description: event.target.value } : prev))
                }
                placeholder="Description"
                rows={3}
                required
              />

              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  value={editForm.cron_expression}
                  onChange={(event) =>
                    setEditForm((prev) => (prev ? { ...prev, cron_expression: event.target.value } : prev))
                  }
                  placeholder="Cron expression"
                  required
                />
                <Input
                  value={editForm.model}
                  onChange={(event) =>
                    setEditForm((prev) => (prev ? { ...prev, model: event.target.value } : prev))
                  }
                  placeholder="Model"
                  required
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  type="number"
                  value={editForm.cards_per_user}
                  onChange={(event) =>
                    setEditForm((prev) => (prev ? { ...prev, cards_per_user: event.target.value } : prev))
                  }
                  placeholder="Cards per user"
                  required
                />
                <Input
                  type="number"
                  value={editForm.batch_size}
                  onChange={(event) =>
                    setEditForm((prev) => (prev ? { ...prev, batch_size: event.target.value } : prev))
                  }
                  placeholder="Batch size"
                  required
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  type="number"
                  value={editForm.delay_between_batches_ms}
                  onChange={(event) =>
                    setEditForm((prev) =>
                      prev ? { ...prev, delay_between_batches_ms: event.target.value } : prev
                    )
                  }
                  placeholder="Delay between batches (ms)"
                  required
                />
                <Input
                  type="number"
                  value={editForm.skip_inactive_days}
                  onChange={(event) =>
                    setEditForm((prev) =>
                      prev ? { ...prev, skip_inactive_days: event.target.value } : prev
                    )
                  }
                  placeholder="Skip inactive days"
                  required
                />
              </div>

              <Textarea
                value={editForm.target_users_input}
                onChange={(event) =>
                  setEditForm((prev) => (prev ? { ...prev, target_users_input: event.target.value } : prev))
                }
                placeholder='Target users JSON, string, or ["uuid"]'
                rows={4}
              />

              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editForm.is_enabled}
                  onChange={(event) =>
                    setEditForm((prev) => (prev ? { ...prev, is_enabled: event.target.checked } : prev))
                  }
                />
                Scheduler enabled
              </label>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={savingId !== null}
                  onClick={() => {
                    setEditingConfig(null)
                    setEditForm(null)
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={savingId !== null}>
                  {savingId !== null && (
                    <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />
                  )}
                  Save
                </Button>
              </div>
            </form>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
