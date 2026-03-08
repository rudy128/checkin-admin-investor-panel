"use client"

import * as React from "react"
import { EyeIcon, LoaderCircleIcon, RefreshCwIcon, SendIcon } from "lucide-react"
import { toast } from "sonner"

import {
  adminManualCardApi,
  adminNotificationApi,
  type AdminManualCardPushRequest,
  type AdminManualCardUser,
  type AdminUserCard,
} from "@/lib/api/admin-browser"
import { buildCardHtml, buildParsedCardFromFields } from "@/lib/card-html-builder"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

// ─── Constants ───────────────────────────────────────────────────────────────

const CARD_TYPES = [
  { value: "health", label: "Health" },
  { value: "spotify", label: "Spotify" },
  { value: "location", label: "Location" },
  { value: "map", label: "Map" },
  { value: "song", label: "Song" },
  { value: "custom", label: "Custom" },
] as const

// ─── Types ───────────────────────────────────────────────────────────────────

type CardForm = {
  user_id: string
  card_type: string
  title: string
  subtitle: string
  body: string
  ai_confidence: string
}

const EMPTY_FORM: CardForm = {
  user_id: "",
  card_type: "",
  title: "",
  subtitle: "",
  body: "",
  ai_confidence: "",
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function displayName(user: AdminManualCardUser) {
  return user.name ?? `${user.country_code} ${user.phone_no}`
}

function buildPreviewHtml(form: CardForm, timezone?: string): string {
  const parsed = buildParsedCardFromFields({
    title: form.title || "Untitled",
    subtitle: form.subtitle || undefined,
    body: form.body,
  })
  return buildCardHtml(parsed, {
    theme: form.card_type || undefined,
    label: form.card_type || undefined,
    generatedAt: new Date(),
    timeZone: timezone,
  })
}

// ─── Card Preview iframe ─────────────────────────────────────────────────────

function CardPreview({ html }: { html: string }) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null)

  React.useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    const doc = iframe.contentDocument ?? iframe.contentWindow?.document
    if (!doc) return
    doc.open()
    doc.write(html)
    doc.close()
  }, [html])

  return (
    <iframe
      ref={iframeRef}
      title="Card Preview"
      className="h-full w-full border-0"
      sandbox="allow-same-origin"
    />
  )
}

export default function ManualCardsPage() {
  const [users, setUsers] = React.useState<AdminManualCardUser[]>([])
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [userSearch, setUserSearch] = React.useState("")

  const [userCards, setUserCards] = React.useState<AdminUserCard[]>([])
  const [cardsLoading, setCardsLoading] = React.useState(false)

  const [form, setForm] = React.useState<CardForm>(EMPTY_FORM)
  const [previewHtml, setPreviewHtml] = React.useState<string>(() => buildPreviewHtml(EMPTY_FORM))
  const [showPreview, setShowPreview] = React.useState(false)

  const [submitting, setSubmitting] = React.useState(false)
  const [resultOpen, setResultOpen] = React.useState(false)
  const [resultCardId, setResultCardId] = React.useState<string | null>(null)

  const [notificationTitle, setNotificationTitle] = React.useState("")
  const [notificationBody, setNotificationBody] = React.useState("")
  const [sendingNotification, setSendingNotification] = React.useState(false)

  // ── Data fetching ────────────────────────────────────────────────────────

  const fetchUsers = React.useCallback(async (force = false) => {
    try {
      const data = await adminManualCardApi.listUsers(force)
      setUsers(data.users)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load users.")
    }
  }, [])

  React.useEffect(() => {
    setLoading(true)
    fetchUsers(false).finally(() => setLoading(false))
  }, [fetchUsers])

  async function handleRefresh() {
    setRefreshing(true)
    await fetchUsers(true).finally(() => setRefreshing(false))
    toast.success("User list refreshed.")
  }

  // ── Form helpers ─────────────────────────────────────────────────────────

  function setField(field: keyof CardForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  React.useEffect(() => {
    const selectedUser = users.find((u) => u.id === form.user_id)
    setPreviewHtml(buildPreviewHtml(form, selectedUser?.timezone || undefined))
  }, [form, users])

  // Fetch cards when user is selected
  React.useEffect(() => {
    if (!form.user_id) {
      setUserCards([])
      return
    }
    setCardsLoading(true)
    adminManualCardApi
      .getUserCards(form.user_id, false)
      .then((data) => setUserCards(data.cards))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load cards."))
      .finally(() => setCardsLoading(false))
  }, [form.user_id])

  // ── Submit ───────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.user_id) {
      toast.error("Please select a user.")
      return
    }
    if (!form.title.trim()) {
      toast.error("Title is required.")
      return
    }
    if (!form.body.trim()) {
      toast.error("Body content is required.")
      return
    }

    const aiConfidenceRaw = form.ai_confidence.trim()
    const aiConfidenceParsed = aiConfidenceRaw !== "" ? parseInt(aiConfidenceRaw, 10) : undefined
    if (
      aiConfidenceRaw !== "" &&
      (Number.isNaN(aiConfidenceParsed) ||
        (aiConfidenceParsed !== undefined &&
          (aiConfidenceParsed < 0 || aiConfidenceParsed > 100)))
    ) {
      toast.error("AI Confidence must be an integer between 0 and 100.")
      return
    }

    const parsed = buildParsedCardFromFields({
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || undefined,
      body: form.body.trim(),
    })

    const selectedUser = users.find((u) => u.id === form.user_id)
    const html_content = buildCardHtml(parsed, {
      theme: form.card_type.trim() || undefined,
      label: form.card_type.trim() || undefined,
      generatedAt: new Date(),
      timeZone: selectedUser?.timezone || undefined,
    })

    const payload: AdminManualCardPushRequest = {
      user_id: form.user_id,
      html_content,
    }
    if (form.card_type.trim()) payload.card_type = form.card_type.trim()
    if (form.title.trim()) payload.title = form.title.trim()
    if (form.subtitle.trim()) payload.subtitle = form.subtitle.trim()
    if (form.body.trim()) payload.summary = form.body.trim()
    if (aiConfidenceParsed !== undefined) payload.ai_confidence = aiConfidenceParsed

    setSubmitting(true)
    try {
      const result = await adminManualCardApi.push(payload)
      setResultCardId(result.card_id)
      setResultOpen(true)
      toast.success(result.message || "Card pushed successfully.")
      
      // Refresh cards list
      if (form.user_id) {
        adminManualCardApi
          .getUserCards(form.user_id, true)
          .then((data) => setUserCards(data.cards))
          .catch(() => {})
      }
      
      setForm(EMPTY_FORM)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to push card.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSendNotification(e: React.FormEvent) {
    e.preventDefault()
    
    if (!form.user_id) {
      toast.error("Please select a user first.")
      return
    }
    
    if (!notificationTitle.trim() || !notificationBody.trim()) {
      toast.error("Both title and body are required.")
      return
    }
    
    setSendingNotification(true)
    try {
      const result = await adminNotificationApi.send(form.user_id, {
        title: notificationTitle.trim(),
        body: notificationBody.trim(),
      })
      toast.success(result.message || "Notification sent successfully.")
      setNotificationTitle("")
      setNotificationBody("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send notification.")
    } finally {
      setSendingNotification(false)
    }
  }

  // ── Derived ──────────────────────────────────────────────────────────────

  const filteredUsers = React.useMemo(() => {
    const q = userSearch.toLowerCase()
    if (!q) return users
    return users.filter((u) => {
      const name = (u.name ?? "").toLowerCase()
      const phone = `${u.country_code}${u.phone_no}`.toLowerCase()
      return name.includes(q) || phone.includes(q)
    })
  }, [users, userSearch])

  const selectedUser = users.find((u) => u.id === form.user_id) ?? null

  const canSubmit =
    !!form.user_id &&
    form.title.trim().length > 0 &&
    form.body.trim().length > 0

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col">
      {/* ── Top bar ── */}
      <div className="border-b px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold">Manual Card Push</h1>
          <p className="text-muted-foreground text-sm">
            Inject a card directly into the database for a specific user.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview((v) => !v)}
          >
            <EyeIcon className="mr-2 size-4" />
            {showPreview ? "Hide Preview" : "Show Preview"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing || loading}
          >
            <RefreshCwIcon className={`mr-2 size-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── User list sidebar ── */}
        <aside className="bg-muted/10 w-56 shrink-0 border-r flex flex-col overflow-hidden">
          <div className="p-3 border-b shrink-0">
            <Input
              placeholder="Search users…"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {loading ? (
              <div className="text-muted-foreground flex items-center gap-2 p-3 text-sm">
                <LoaderCircleIcon className="size-4 animate-spin" />
                Loading…
              </div>
            ) : filteredUsers.length === 0 ? (
              <p className="text-muted-foreground p-3 text-center text-sm">No users found.</p>
            ) : (
              filteredUsers.map((user) => {
                const active = form.user_id === user.id
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setField("user_id", user.id)}
                    className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="font-medium truncate">{displayName(user)}</div>
                    <div
                      className={`text-xs truncate ${
                        active ? "text-primary-foreground/70" : "text-muted-foreground"
                      }`}
                    >
                      {user.country_code} {user.phone_no}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </aside>

        {/* ── Form + Preview ── */}
        <div className="flex flex-1 overflow-hidden">
          {/* Form column */}
          <div className="flex-1 overflow-y-auto p-6">
            <form onSubmit={handleSubmit} className="mx-auto max-w-xl space-y-5">
              {/* Selected user indicator */}
              {selectedUser ? (
                <div className="bg-muted/40 flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm">
                  <span className="text-muted-foreground">Pushing to:</span>
                  <span className="font-medium">{displayName(selectedUser)}</span>
                  <Badge variant="outline" className="ml-auto text-xs">
                    {selectedUser.notifications_enabled ? "Notifs on" : "Notifs off"}
                  </Badge>
                </div>
              ) : (
                <div className="border border-dashed rounded-lg px-4 py-2.5 text-sm text-muted-foreground">
                  ← Select a user from the sidebar
                </div>
              )}

              {/* Card Type + Title */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="card_type">Card Type</Label>
                  <Select
                    value={form.card_type}
                    onValueChange={(value) => setField("card_type", value)}
                  >
                    <SelectTrigger id="card_type">
                      <SelectValue placeholder="Select card type" />
                    </SelectTrigger>
                    <SelectContent>
                      {CARD_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="title">
                    Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder="Card title"
                    value={form.title}
                    onChange={(e) => setField("title", e.target.value)}
                  />
                </div>
              </div>

              {/* Subtitle + AI Confidence */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="subtitle">Subtitle</Label>
                  <Input
                    id="subtitle"
                    placeholder="Optional subtitle"
                    value={form.subtitle}
                    onChange={(e) => setField("subtitle", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ai_confidence">AI Confidence (0–100)</Label>
                  <Input
                    id="ai_confidence"
                    type="number"
                    min={0}
                    max={100}
                    placeholder="e.g. 85"
                    value={form.ai_confidence}
                    onChange={(e) => setField("ai_confidence", e.target.value)}
                  />
                </div>
              </div>

              {/* Body */}
              <div className="space-y-1.5">
                <Label htmlFor="body">
                  Body <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="body"
                  placeholder="Enter the card content…"
                  rows={10}
                  value={form.body}
                  onChange={(e) => setField("body", e.target.value)}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={submitting || !canSubmit}
              >
                {submitting ? (
                  <LoaderCircleIcon className="mr-2 size-4 animate-spin" />
                ) : (
                  <SendIcon className="mr-2 size-4" />
                )}
                {submitting ? "Pushing…" : "Push Card"}
              </Button>
            </form>

            {/* Send Notification */}
            {form.user_id && (
              <form onSubmit={handleSendNotification} className="mt-8 space-y-4 rounded-lg border bg-muted/40 p-4">
                <h3 className="text-sm font-semibold">Send Push Notification</h3>
                
                <div className="space-y-1.5">
                  <Label htmlFor="notification_title">Title</Label>
                  <Input
                    id="notification_title"
                    placeholder="Notification title"
                    value={notificationTitle}
                    onChange={(e) => setNotificationTitle(e.target.value)}
                    disabled={sendingNotification}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="notification_body">Body</Label>
                  <Textarea
                    id="notification_body"
                    placeholder="Notification message"
                    value={notificationBody}
                    onChange={(e) => setNotificationBody(e.target.value)}
                    disabled={sendingNotification}
                    rows={3}
                  />
                </div>

                <Button
                  type="submit"
                  size="sm"
                  disabled={sendingNotification || !notificationTitle.trim() || !notificationBody.trim()}
                >
                  {sendingNotification ? (
                    <LoaderCircleIcon className="mr-2 size-4 animate-spin" />
                  ) : (
                    <SendIcon className="mr-2 size-4" />
                  )}
                  {sendingNotification ? "Sending…" : "Send Notification"}
                </Button>
              </form>
            )}

            {/* User's existing cards */}
            {form.user_id && (
              <div className="mt-8 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Existing Cards</h3>
                  {cardsLoading && <LoaderCircleIcon className="size-4 animate-spin text-muted-foreground" />}
                </div>
                {!cardsLoading && userCards.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No cards yet.</p>
                ) : (
                  <div className="space-y-2">
                    {userCards.map((card) => (
                      <div
                        key={card.id}
                        className="border rounded-lg p-3 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm truncate">
                                {card.title || "Untitled"}
                              </p>
                              {card.card_type && (
                                <Badge variant="outline" className="text-xs shrink-0">
                                  {card.card_type}
                                </Badge>
                              )}
                              <Badge
                                variant={card.show ? "default" : "secondary"}
                                className="text-xs shrink-0"
                              >
                                {card.show ? "Visible" : "Hidden"}
                              </Badge>
                            </div>
                            {card.subtitle && (
                              <p className="text-muted-foreground text-xs mt-0.5 truncate">
                                {card.subtitle}
                              </p>
                            )}
                          </div>
                        </div>
                        {card.html_content && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                              Preview HTML
                            </summary>
                            <div className="mt-2 border rounded-md overflow-hidden">
                              <iframe
                                srcDoc={card.html_content}
                                title={`Card ${card.id}`}
                                className="w-full h-96 border-0"
                                sandbox="allow-same-origin"
                              />
                            </div>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Preview panel */}
          {showPreview && (
            <div className="w-105 shrink-0 border-l flex flex-col overflow-hidden">
              <div className="border-b px-4 py-2.5 shrink-0">
                <p className="text-sm font-medium">Live Preview</p>
                <p className="text-muted-foreground text-xs">Updates as you type</p>
              </div>
              <div className="flex-1 overflow-hidden bg-neutral-950">
                <CardPreview html={previewHtml} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Success dialog */}
      <AlertDialog open={resultOpen} onOpenChange={setResultOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Card Pushed Successfully</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>The card has been injected into the database and will be served immediately.</p>
                {resultCardId && (
                  <div className="bg-muted rounded-md p-3">
                    <p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
                      Card ID
                    </p>
                    <p className="font-mono text-sm break-all">{resultCardId}</p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end pt-2">
            <Button onClick={() => setResultOpen(false)}>Done</Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
