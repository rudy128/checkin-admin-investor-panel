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
import { toast } from "sonner"
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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

const PROMPT_CATEGORIES = [
  { value: "health", label: "Health" },
  { value: "location", label: "Location" },
  { value: "spotify", label: "Spotify" },
] as const

const PROMPT_SCOPES = [
  { value: "card_generation", label: "Card Generation" },
  { value: "emotion_generation", label: "Emotion Generation" },
] as const

type PromptScope = AdminPromptUpsertRequest["prompt_scope"]
type PromptCategory = NonNullable<AdminPromptUpsertRequest["category"]>

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

function buildPromptPayload({
  name,
  prompt,
  promptScope,
  category,
}: {
  name: string
  prompt: string
  promptScope: PromptScope
  category: PromptCategory
}): AdminPromptUpsertRequest {
  const payload: AdminPromptUpsertRequest = {
    name: name.trim(),
    prompt: prompt.trim(),
    prompt_scope: promptScope,
  }

  if (promptScope === "card_generation") {
    payload.category = category
  }

  return payload
}

export default function PromptsPage() {
  const [prompts, setPrompts] = React.useState<AdminPromptTableRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState("")

  const [createOpen, setCreateOpen] = React.useState(false)
  const [createName, setCreateName] = React.useState("")
  const [createPrompt, setCreatePrompt] = React.useState("")
  const [createCategory, setCreateCategory] = React.useState<PromptCategory>("health")
  const [createPromptScope, setCreatePromptScope] = React.useState<PromptScope>("card_generation")
  const [creating, setCreating] = React.useState(false)

  const [editingPrompt, setEditingPrompt] = React.useState<AdminPromptTableRow | null>(null)
  const [editName, setEditName] = React.useState("")
  const [editPrompt, setEditPrompt] = React.useState("")
  const [editCategory, setEditCategory] = React.useState<PromptCategory>("health")
  const [editPromptScope, setEditPromptScope] = React.useState<PromptScope>("card_generation")
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
      toast.error("Failed to load prompts.")
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
    setError("")

    try {
      const payload = buildPromptPayload({
        name: createName,
        prompt: createPrompt,
        promptScope: createPromptScope,
        category: createCategory,
      })
      const result = await adminPromptsApi.create(payload)
      toast.success(result.message || "Prompt created.")
      setCreateName("")
      setCreatePrompt("")
      setCreateCategory("health")
      setCreatePromptScope("card_generation")
      setCreateOpen(false)
      await loadPrompts(true)
    } catch {
      setError("Failed to create prompt.")
      toast.error("Failed to create prompt.")
    } finally {
      setCreating(false)
    }
  }

  function openEditDialog(prompt: AdminPromptTableRow) {
    setEditingPrompt(prompt)
    setEditName(prompt.name)
    setEditPrompt(prompt.prompt)
    setEditCategory(prompt.category ?? "health")
    setEditPromptScope(prompt.prompt_scope)
    setError("")
  }

  async function onSaveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingPrompt) {
      return
    }

    setSavingId(editingPrompt.id)
    setError("")

    try {
      const payload = buildPromptPayload({
        name: editName,
        prompt: editPrompt,
        promptScope: editPromptScope,
        category: editCategory,
      })
      const result = await adminPromptsApi.update(editingPrompt.id, payload)
      toast.success(result.message || "Prompt updated.")
      setEditingPrompt(null)
      await loadPrompts(true)
    } catch {
      setError("Failed to update prompt.")
      toast.error("Failed to update prompt.")
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
    setError("")

    try {
      const result = await adminPromptsApi.remove(id)
      toast.success(result.message || "Prompt deleted.")
      if (editingPrompt?.id === id) {
        setEditingPrompt(null)
      }
      await loadPrompts(true)
    } catch {
      setError("Failed to delete prompt.")
      toast.error("Failed to delete prompt.")
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

                  <div className="space-y-2">
                    <Label htmlFor="create-prompt-scope">Prompt Scope</Label>
                    <Select
                      value={createPromptScope}
                      onValueChange={(value) => setCreatePromptScope(value as PromptScope)}
                    >
                      <SelectTrigger id="create-prompt-scope" className="w-full">
                        <SelectValue placeholder="Select prompt scope" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {PROMPT_SCOPES.map((scope) => (
                            <SelectItem key={scope.value} value={scope.value}>
                              {scope.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  {createPromptScope === "card_generation" && (
                    <div className="space-y-2">
                      <Label htmlFor="create-prompt-category">Category</Label>
                      <Select
                        value={createCategory}
                        onValueChange={(value) => setCreateCategory(value as PromptCategory)}
                      >
                        <SelectTrigger id="create-prompt-category" className="w-full">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {PROMPT_CATEGORIES.map((category) => (
                              <SelectItem key={category.value} value={category.value}>
                                {category.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

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
                className={cn("h-[270px]", !prompt.is_active && "opacity-60")}
              >
                <CardHeader className="pb-2">
                  <div className="flex min-w-0 items-start gap-2">
                    <CardTitle className="min-h-[2.75rem] min-w-0 max-w-full flex-1 overflow-hidden text-ellipsis text-base leading-snug [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [overflow-wrap:anywhere]">
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
                  <p className="text-muted-foreground max-w-full overflow-hidden text-ellipsis whitespace-pre-wrap text-sm leading-relaxed [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:8] [overflow-wrap:anywhere]">
                    {prompt.prompt}
                  </p>
                </CardContent>

                <CardFooter className="text-muted-foreground justify-start px-4 py-2 text-left text-xs">
                  <div className="flex w-full flex-col items-start gap-1">
                    <p className="text-[11px] uppercase tracking-wide">
                      {prompt.category ? `${prompt.category} · ` : ""}
                      {prompt.prompt_scope}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <Clock3Icon className="size-3.5" />
                      <span>{formatDate(prompt.updated_at)}</span>
                    </div>
                  </div>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      <AlertDialog
        open={Boolean(editingPrompt)}
        onOpenChange={(open) => !open && setEditingPrompt(null)}
      >
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

            <div className="space-y-2">
              <Label htmlFor="edit-prompt-scope">Prompt Scope</Label>
              <Select
                value={editPromptScope}
                onValueChange={(value) => setEditPromptScope(value as PromptScope)}
              >
                <SelectTrigger id="edit-prompt-scope" className="w-full">
                  <SelectValue placeholder="Select prompt scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {PROMPT_SCOPES.map((scope) => (
                      <SelectItem key={scope.value} value={scope.value}>
                        {scope.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {editPromptScope === "card_generation" && (
              <div className="space-y-2">
                <Label htmlFor="edit-prompt-category">Category</Label>
                <Select
                  value={editCategory}
                  onValueChange={(value) => setEditCategory(value as PromptCategory)}
                >
                  <SelectTrigger id="edit-prompt-category" className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {PROMPT_CATEGORIES.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            )}

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
