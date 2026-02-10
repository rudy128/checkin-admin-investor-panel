"use client"

import * as React from "react"
import {
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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

  const [createName, setCreateName] = React.useState("")
  const [createPrompt, setCreatePrompt] = React.useState("")
  const [creating, setCreating] = React.useState(false)

  const [editingId, setEditingId] = React.useState<string | null>(null)
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
      setEditingId(null)
      await loadPrompts(true)
    } catch {
      setError("Failed to create prompt.")
    } finally {
      setCreating(false)
    }
  }

  function startEdit(prompt: AdminPromptTableRow) {
    setEditingId(prompt.id)
    setEditName(prompt.name)
    setEditPrompt(prompt.prompt)
    setMessage("")
    setError("")
  }

  async function onSaveEdit(id: string) {
    setSavingId(id)
    setMessage("")
    setError("")

    try {
      const payload: AdminPromptUpsertRequest = {
        name: editName,
        prompt: editPrompt,
      }
      const result = await adminPromptsApi.update(id, payload)
      setMessage(result.message || "Prompt updated.")
      setEditingId(null)
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
      if (editingId === id) {
        setEditingId(null)
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
      <div className="grid items-start gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Create Prompt</CardTitle>
            <CardDescription>Uses `AdminPromptUpsertRequest` on submit.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={onCreate}>
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Name</p>
                <Input
                  value={createName}
                  onChange={(event) => setCreateName(event.target.value)}
                  placeholder="Prompt name"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Prompt</p>
                <Textarea
                  value={createPrompt}
                  onChange={(event) => setCreatePrompt(event.target.value)}
                  placeholder="Write prompt text..."
                  required
                  rows={5}
                />
              </div>
              <Button type="submit" className="w-full" disabled={creating}>
                {creating ? (
                  <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />
                ) : (
                  <PlusIcon data-icon="inline-start" />
                )}
                Create
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <CardTitle>Prompts</CardTitle>
              <CardDescription>
                Uses `/admin/prompts`, `/admin/prompts/create`, `/admin/prompts/:id`.
              </CardDescription>
            </div>
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
          </CardHeader>

          <CardContent>
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
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-muted/40 text-left">
                    <tr>
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">Prompt</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Created</th>
                      <th className="px-3 py-2 font-medium">Updated</th>
                      <th className="px-3 py-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prompts.map((prompt) => {
                      const isEditing = editingId === prompt.id
                      const isSaving = savingId === prompt.id
                      const isDeleting = deletingId === prompt.id

                      return (
                        <tr key={prompt.id} className="border-t align-top">
                          <td className="px-3 py-2">
                            {isEditing ? (
                              <Input
                                value={editName}
                                onChange={(event) => setEditName(event.target.value)}
                              />
                            ) : (
                              prompt.name
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {isEditing ? (
                              <Textarea
                                rows={4}
                                value={editPrompt}
                                onChange={(event) => setEditPrompt(event.target.value)}
                              />
                            ) : (
                              <p className="max-w-[420px] whitespace-pre-wrap">{prompt.prompt}</p>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant={prompt.is_active ? "secondary" : "outline"}>
                              {prompt.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">{formatDate(prompt.created_at)}</td>
                          <td className="px-3 py-2">{formatDate(prompt.updated_at)}</td>
                          <td className="px-3 py-2">
                            <div className="flex flex-col gap-1.5">
                              {isEditing ? (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => void onSaveEdit(prompt.id)}
                                    disabled={isSaving || isDeleting}
                                  >
                                    {isSaving && (
                                      <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />
                                    )}
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditingId(null)}
                                    disabled={isSaving || isDeleting}
                                  >
                                    Cancel
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => startEdit(prompt)}
                                  disabled={isDeleting}
                                >
                                  <PencilLineIcon data-icon="inline-start" />
                                  Edit
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => void onDelete(prompt.id)}
                                disabled={isSaving || isDeleting}
                              >
                                {isDeleting ? (
                                  <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />
                                ) : (
                                  <Trash2Icon data-icon="inline-start" />
                                )}
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
