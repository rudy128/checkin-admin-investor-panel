"use client"

import * as React from "react"
import { AxiosError } from "axios"
import Link from "next/link"
import { ArrowLeftIcon, LoaderCircleIcon, UserRoundIcon } from "lucide-react"
import { useParams } from "next/navigation"

import { adminUsersApi, type AdminUserDetails } from "@/lib/api/admin-browser"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

function formatDate(value?: string) {
  if (!value) {
    return "-"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function getHtmlContent(value: unknown): string | null {
  if (!isRecord(value)) {
    return null
  }

  const candidates = [value.html_content, value.htmlContent, value.html]
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim() !== "") {
      return candidate
    }
  }

  return null
}

function stripHtmlContent(value: unknown): unknown {
  if (!isRecord(value)) {
    return value
  }

  const rest = { ...value }
  delete rest.html_content
  delete rest.htmlContent
  delete rest.html
  return rest
}

function hasRenderableRawPayload(value: unknown): boolean {
  if (!isRecord(value)) {
    return true
  }

  return Object.keys(value).length > 0
}

function buildHtmlPreviewDocument(htmlContent: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html, body { margin: 0; padding: 0; }
      body {
        padding: 12px;
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
        line-height: 1.45;
      }
      img, video, canvas, svg { max-width: 100%; height: auto; }
      pre, code { white-space: pre-wrap; word-break: break-word; }
    </style>
  </head>
  <body>${htmlContent}</body>
</html>`
}

function DataSection({
  title,
  items,
}: {
  title: string
  items: unknown[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{items.length} record(s)</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">No records found.</p>
        ) : (
          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={`${title}-${index}`} className="space-y-2">
                {(() => {
                  const htmlContent = getHtmlContent(item)
                  const rawPayload = stripHtmlContent(item)
                  const showRawPayload = hasRenderableRawPayload(rawPayload)

                  return (
                    <>
                      {htmlContent ? (
                        <div className="overflow-x-auto rounded-lg border p-3">
                          <p className="text-muted-foreground mb-2 text-[11px] font-medium tracking-wide uppercase">
                            Rendered HTML (Isolated)
                          </p>
                          <iframe
                            title={`${title}-${index}-preview`}
                            className="bg-background h-[560px] w-full rounded-md border"
                            srcDoc={buildHtmlPreviewDocument(htmlContent)}
                            sandbox=""
                            loading="lazy"
                          />
                        </div>
                      ) : null}
                      {showRawPayload || !htmlContent ? (
                        <pre className="bg-muted/40 overflow-x-auto rounded-lg border p-3 text-xs">
                          {JSON.stringify(rawPayload, null, 2)}
                        </pre>
                      ) : null}
                    </>
                  )
                })()}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function UserDetailsPage() {
  const params = useParams<{ id: string }>()
  const userId = Array.isArray(params.id) ? params.id[0] : params.id

  const [details, setDetails] = React.useState<AdminUserDetails | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    let active = true

    async function loadDetails() {
      if (!userId) {
        setError("Invalid user id.")
        setLoading(false)
        return
      }

      setLoading(true)
      setError("")

      try {
        const payload = await adminUsersApi.getById(userId)
        if (active) {
          setDetails(payload)
        }
      } catch (errorValue) {
        if (active) {
          let message = "Failed to load user details."

          if (errorValue instanceof AxiosError) {
            const responseMessage = errorValue.response?.data?.message
            if (typeof responseMessage === "string" && responseMessage.trim()) {
              message = responseMessage
            }
          } else if (errorValue instanceof Error && errorValue.message.trim()) {
            message = errorValue.message
          }

          setError(message)
          setDetails(null)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadDetails()
    return () => {
      active = false
    }
  }, [userId])

  return (
    <div className="mx-auto w-full max-w-[1400px] p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/users">
            <ArrowLeftIcon data-icon="inline-start" />
            Back to Users
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <LoaderCircleIcon className="size-4 animate-spin" />
          Loading user details...
        </div>
      ) : error ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : !details ? (
        <p className="text-muted-foreground text-sm">No details found.</p>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRoundIcon className="size-4" />
                User Overview
              </CardTitle>
              <CardDescription>Complete user information from backend.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground text-xs">ID</p>
                  <p className="font-mono text-xs">{details.user.id}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground text-xs">Name</p>
                  <p className="text-sm">{details.user.name || "-"}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground text-xs">Username</p>
                  <p className="text-sm">{details.user.username || "-"}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground text-xs">Phone</p>
                  <p className="text-sm">
                    {details.user.phoneNo
                      ? `${details.user.countryCode || ""} ${details.user.phoneNo}`.trim()
                      : "-"}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground text-xs">Timezone</p>
                  <p className="text-sm">{details.user.timezone || "-"}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground text-xs">Created At</p>
                  <p className="text-sm">{formatDate(details.user.createdAt)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground text-xs">Updated At</p>
                  <p className="text-sm">{formatDate(details.user.updatedAt)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground text-xs">Location Permission</p>
                  <p className="text-sm">{details.user.locationPermission || "-"}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground text-xs">Health Permission</p>
                  <p className="text-sm">{details.user.healthPermission || "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <DataSection title="Cards" items={details.cards} />
            <DataSection title="Generated Cards" items={details.generatedCards} />
            <DataSection title="Emotional Timeline" items={details.emotionalTimeline} />
            <DataSection title="Follow Request" items={details.followRequest} />
            <DataSection title="Followers" items={details.followers} />
            <DataSection title="Health" items={details.health} />
            <DataSection title="Location" items={details.location} />
            <DataSection title="Spotify" items={details.spotify} />
          </div>
        </div>
      )}
    </div>
  )
}
