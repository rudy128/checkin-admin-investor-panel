"use client"

import * as React from "react"
import {
  Clock3Icon,
  LoaderCircleIcon,
  PencilLineIcon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
} from "lucide-react"

import {
  adminPromptsApi,
  type AdminPromptTableRow,
  type AdminPromptUpsertRequest,
} from "@/lib/api/admin-browser"
import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

export default function PromptsPage() {
  const [prompts, setPrompts] = React.useState<AdminPromptTableRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState("")
  const [message, setMessage] = React.useState("")

  const [createOpen, setCreateOpen] = React.useState(false)
  const [createName, setCreateName] = React.useState("")
  const [createPrompt, setCreatePrompt] = React.useState("")
  const [creating, setCreating] = React.useState(false)

  const [editingPrompt, setEditingPrompt] = React.useState<AdminPromptTableRow | null>(null)
  const [editName, setEditName] = React.useState("")
  const [editPrompt, setEditPrompt] = React.useState("")
  const [savingId, setSavingId] = React.useState<string | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  const loadPrompts = React.useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError("")

    try {
      const data = await adminPromptsApi.list(isRefresh)
      setPrompts(data)
    } catch {
      setError("Failed to load prompts.")
      setPrompts([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  React.useEffect(() => {
    void loadPrompts()
  }, [loadPrompts])

  async function onCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCreating(true)
    setMessage("")
    setError("")

    try {
      const payload: AdminPromptUpsertRequest = {
        name: createName,
        prompt: createPrompt,
      }
      const result = await adminPromptsApi.create(payload)
      setMessage(result.message || "Prompt created.")
      setCreateName("")
      setCreatePrompt("")
      setCreateOpen(false)
      await loadPrompts(true)
    } catch {
      setError("Failed to create prompt.")
    } finally {
      setCreating(false)
    }
  }

  function openEditDialog(prompt: AdminPromptTableRow) {
    setEditingPrompt(prompt)
    setEditName(prompt.name)
    setEditPrompt(prompt.prompt)
    setMessage("")
    setError("")
  }

  async function onSaveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingPrompt) {
      return
    }

    setSavingId(editingPrompt.id)
    setMessage("")
    setError("")

    try {
      const payload: AdminPromptUpsertRequest = {
        name: editName,
        prompt: editPrompt,
      }
      const result = await adminPromptsApi.update(editingPrompt.id, payload)
      setMessage(result.message || "Prompt updated.")
      setEditingPrompt(null)
      await loadPrompts(true)
    } catch {
      setError("Failed to update prompt.")
    } finally {
      setSavingId(null)
    }
  }

  async function onDelete(id: string) {
    const confirmed = window.confirm("Delete this prompt?")
    if (!confirmed) {
      return
    }

    setDeletingId(id)
    setMessage("")
    setError("")

    try {
      const result = await adminPromptsApi.remove(id)
      setMessage(result.message || "Prompt deleted.")
      if (editingPrompt?.id === id) {
        setEditingPrompt(null)
      }
      await loadPrompts(true)
    } catch {
      setError("Failed to delete prompt.")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] p-4 md:p-6">
      <section className="mb-4 border-b pb-2">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Prompts</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadPrompts(true)}
              disabled={loading || refreshing}
            >
              {refreshing ? (
                <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />
              ) : (
                <RefreshCwIcon data-icon="inline-start" />
              )}
              Refresh
            </Button>

            <AlertDialog open={createOpen} onOpenChange={setCreateOpen}>
              <AlertDialogTrigger asChild>
                <Button size="sm">
                  <PlusIcon data-icon="inline-start" />
                  Create
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle>Create Prompt</AlertDialogTitle>
                  <AlertDialogDescription>
                    Add a new prompt using the prompt upsert payload.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <form className="space-y-3" onSubmit={onCreate}>
                  <Input
                    value={createName}
                    onChange={(event) => setCreateName(event.target.value)}
                    placeholder="Prompt name"
                    required
                  />
                  <Textarea
                    value={createPrompt}
                    onChange={(event) => setCreatePrompt(event.target.value)}
                    placeholder="Write prompt text..."
                    rows={6}
                    required
                  />

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={creating}
                      onClick={() => setCreateOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={creating}>
                      {creating && (
                        <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />
                      )}
                      Create
                    </Button>
                  </div>
                </form>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </section>

      {message && <p className="mb-3 text-sm text-green-600">{message}</p>}
      {error && <p className="text-destructive mb-3 text-sm">{error}</p>}

      {loading ? (
        <div className="text-muted-foreground flex items-center gap-2 py-4 text-sm">
          <LoaderCircleIcon className="size-4 animate-spin" />
          Loading prompts...
        </div>
      ) : prompts.length === 0 ? (
        <p className="text-muted-foreground py-2 text-sm">No prompts found.</p>
      ) : (
        <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {prompts.map((prompt) => {
            const isDeleting = deletingId === prompt.id

            return (
              <Card
                key={prompt.id}
                className={cn(
                  "h-[270px]",
                  !prompt.is_active && "opacity-60"
                )}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-2">
                    <CardTitle className="min-h-[2.75rem] flex-1 text-base leading-snug [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden break-words">
                      {prompt.name}
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon-xs"
                        variant="outline"
                        onClick={() => openEditDialog(prompt)}
                        disabled={isDeleting}
                      >
                        <PencilLineIcon />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        size="icon-xs"
                        variant="destructive"
                        onClick={() => void onDelete(prompt.id)}
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <LoaderCircleIcon className="animate-spin" />
                        ) : (
                          <Trash2Icon />
                        )}
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 overflow-hidden pt-0">
                  <p className="text-muted-foreground text-sm leading-relaxed [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:8] overflow-hidden break-words">
                    {prompt.prompt}
                  </p>
                </CardContent>

                <CardFooter className="text-muted-foreground justify-start px-4 py-2 text-left text-xs">
                  <div className="flex w-full items-center justify-start gap-1.5">
                    <Clock3Icon className="size-3.5" />
                    <span>{formatDate(prompt.updated_at)}</span>
                  </div>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      <AlertDialog open={Boolean(editingPrompt)} onOpenChange={(open) => !open && setEditingPrompt(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Prompt</AlertDialogTitle>
            <AlertDialogDescription>
              Update prompt name and content.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <form className="space-y-3" onSubmit={onSaveEdit}>
            <Input
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              placeholder="Prompt name"
              required
            />
            <Textarea
              value={editPrompt}
              onChange={(event) => setEditPrompt(event.target.value)}
              placeholder="Write prompt text..."
              rows={6}
              required
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={savingId !== null}
                onClick={() => setEditingPrompt(null)}
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
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
