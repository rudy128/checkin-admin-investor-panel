"use client"

import * as React from "react"
import { AxiosError } from "axios"
import { LoaderCircleIcon, PlusIcon, RefreshCwIcon, UsersIcon } from "lucide-react"
import { useRouter } from "next/navigation"

import { adminUsersApi, type AdminUser } from "@/lib/api/admin-browser"
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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

function toDateTimeLocalInputValue(date: Date) {
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 16)
}

type CountryPhoneRule = {
  code: string
  label: string
  minDigits: number
  maxDigits: number
}

const COUNTRY_PHONE_RULES: CountryPhoneRule[] = [
  { code: "+1", label: "United States / Canada", minDigits: 10, maxDigits: 10 },
  { code: "+44", label: "United Kingdom", minDigits: 10, maxDigits: 10 },
  { code: "+61", label: "Australia", minDigits: 9, maxDigits: 9 },
  { code: "+81", label: "Japan", minDigits: 10, maxDigits: 10 },
  { code: "+91", label: "India", minDigits: 10, maxDigits: 10 },
  { code: "+33", label: "France", minDigits: 9, maxDigits: 9 },
  { code: "+49", label: "Germany", minDigits: 10, maxDigits: 11 },
  { code: "+39", label: "Italy", minDigits: 9, maxDigits: 10 },
  { code: "+34", label: "Spain", minDigits: 9, maxDigits: 9 },
  { code: "+52", label: "Mexico", minDigits: 10, maxDigits: 10 },
  { code: "+55", label: "Brazil", minDigits: 10, maxDigits: 11 },
  { code: "+65", label: "Singapore", minDigits: 8, maxDigits: 8 },
  { code: "+971", label: "United Arab Emirates", minDigits: 9, maxDigits: 9 },
]

const DEFAULT_PHONE_RULE: CountryPhoneRule = {
  code: "+1",
  label: "Default",
  minDigits: 6,
  maxDigits: 15,
}

const FALLBACK_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Toronto",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
]

function getPhoneRule(countryCode: string) {
  return (
    COUNTRY_PHONE_RULES.find((rule) => rule.code === countryCode) ?? DEFAULT_PHONE_RULE
  )
}

function getTimezoneOptions() {
  const intlWithSupportedValuesOf = Intl as unknown as {
    supportedValuesOf?: (key: string) => string[]
  }
  const supported = intlWithSupportedValuesOf.supportedValuesOf?.("timeZone")
  if (Array.isArray(supported) && supported.length > 0) {
    return supported
  }

  return FALLBACK_TIMEZONES
}

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

export default function UsersPage() {
  const router = useRouter()
  const timezoneOptions = React.useMemo(() => getTimezoneOptions(), [])
  const [users, setUsers] = React.useState<AdminUser[]>([])
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState("")
  const [createOpen, setCreateOpen] = React.useState(false)
  const [createName, setCreateName] = React.useState("")
  const [createNumber, setCreateNumber] = React.useState("")
  const [createCountryCode, setCreateCountryCode] = React.useState("+1")
  const [createTimezone, setCreateTimezone] = React.useState(() => {
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    return browserTimezone || "UTC"
  })
  const [createCreatedAt, setCreateCreatedAt] = React.useState(() =>
    toDateTimeLocalInputValue(new Date())
  )
  const [creating, setCreating] = React.useState(false)
  const currentPhoneRule = getPhoneRule(createCountryCode)

  const loadUsers = React.useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError("")

    try {
      const data = await adminUsersApi.list(isRefresh)
      setUsers(data)
    } catch {
      setError("Failed to load users from /admin/users.")
      setUsers([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  React.useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  React.useEffect(() => {
    if (timezoneOptions.includes(createTimezone)) {
      return
    }
    setCreateTimezone(timezoneOptions[0] ?? "UTC")
  }, [createTimezone, timezoneOptions])

  async function onCreateUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCreating(true)
    setError("")

    try {
      const createdAtDate = new Date(createCreatedAt)
      if (Number.isNaN(createdAtDate.getTime())) {
        throw new Error("Created At must be a valid datetime.")
      }

      const phoneDigits = createNumber.replace(/\D/g, "")
      if (
        phoneDigits.length < currentPhoneRule.minDigits ||
        phoneDigits.length > currentPhoneRule.maxDigits
      ) {
        throw new Error(
          `Phone number for ${createCountryCode} must be ${currentPhoneRule.minDigits}-${currentPhoneRule.maxDigits} digits.`
        )
      }

      if (!timezoneOptions.includes(createTimezone)) {
        throw new Error("Timezone must be selected from the list.")
      }

      await adminUsersApi.create({
        name: createName.trim(),
        number: phoneDigits,
        country_code: createCountryCode.trim(),
        timezone: createTimezone.trim(),
        created_at: createdAtDate.toISOString(),
      })

      toast.success("User created successfully.")
      setCreateName("")
      setCreateNumber("")
      setCreateCountryCode("+1")
      setCreateTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC")
      setCreateCreatedAt(toDateTimeLocalInputValue(new Date()))
      setCreateOpen(false)
      await loadUsers(true)
    } catch (errorValue) {
      let message = "Failed to create user."

      if (errorValue instanceof AxiosError) {
        const responseMessage = errorValue.response?.data?.message
        if (typeof responseMessage === "string" && responseMessage.trim()) {
          message = responseMessage
        }
      } else if (errorValue instanceof Error && errorValue.message.trim()) {
        message = errorValue.message
      }

      setError(message)
      toast.error(message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] p-4 md:p-6">
      <Card className="w-full">
        <CardHeader className="flex items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="size-4" />
              Users
            </CardTitle>
            <CardDescription>List of admin users from `/admin/users`.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadUsers(true)}
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
                  Create User
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle>Create User</AlertDialogTitle>
                  <AlertDialogDescription>
                    Submit `/admin/users/create` with name, number, country code, timezone, and created date.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <form className="space-y-3" onSubmit={onCreateUser}>
                  <div className="space-y-2">
                    <Label htmlFor="create-user-name">Name</Label>
                    <Input
                      id="create-user-name"
                      value={createName}
                      onChange={(event) => setCreateName(event.target.value)}
                      placeholder="John Doe"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="create-user-number">Phone Number</Label>
                    <Input
                      id="create-user-number"
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={currentPhoneRule.maxDigits}
                      value={createNumber}
                      onChange={(event) => {
                        const digitsOnly = event.target.value
                          .replace(/\D/g, "")
                          .slice(0, currentPhoneRule.maxDigits)
                        setCreateNumber(digitsOnly)
                      }}
                      placeholder={`Up to ${currentPhoneRule.maxDigits} digits`}
                      required
                    />
                    <p className="text-muted-foreground text-xs">
                      {currentPhoneRule.label}: {currentPhoneRule.minDigits}-{currentPhoneRule.maxDigits} digits
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="create-user-country">Country Code</Label>
                      <Select
                        value={createCountryCode}
                        onValueChange={(value) => {
                          setCreateCountryCode(value)
                          const rule = getPhoneRule(value)
                          setCreateNumber((previous) => previous.slice(0, rule.maxDigits))
                        }}
                      >
                        <SelectTrigger id="create-user-country" className="w-full">
                          <SelectValue placeholder="Select country code" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {COUNTRY_PHONE_RULES.map((option) => (
                              <SelectItem key={option.code} value={option.code}>
                                {option.code} - {option.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-user-timezone">Timezone</Label>
                      <Select value={createTimezone} onValueChange={setCreateTimezone}>
                        <SelectTrigger id="create-user-timezone" className="w-full">
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {timezoneOptions.map((timezone) => (
                              <SelectItem key={timezone} value={timezone}>
                                {timezone}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="create-user-created-at">Created At</Label>
                    <Input
                      id="create-user-created-at"
                      type="datetime-local"
                      value={createCreatedAt}
                      onChange={(event) => setCreateCreatedAt(event.target.value)}
                      required
                    />
                  </div>

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
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-muted-foreground flex items-center gap-2 py-4 text-sm">
              <LoaderCircleIcon className="size-4 animate-spin" />
              Loading users...
            </div>
          ) : error ? (
            <p className="text-destructive py-2 text-sm">{error}</p>
          ) : users.length === 0 ? (
            <p className="text-muted-foreground py-2 text-sm">No users found.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[680px] text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-3 py-2 font-medium">ID</th>
                    <th className="px-3 py-2 font-medium">Username</th>
                    <th className="px-3 py-2 font-medium">Phone</th>
                    <th className="px-3 py-2 font-medium">Timezone</th>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-muted/40 cursor-pointer border-t transition-colors"
                      onClick={() => router.push(`/admin/users/${user.id}`)}
                    >
                      <td className="px-3 py-2 font-mono text-xs">{user.id}</td>
                      <td className="px-3 py-2">{user.username || "-"}</td>
                      <td className="px-3 py-2">
                        {user.phoneNo ? `${user.countryCode || ""} ${user.phoneNo}`.trim() : "-"}
                      </td>
                      <td className="px-3 py-2">{user.timezone || "-"}</td>
                      <td className="px-3 py-2">{user.name || "-"}</td>
                      <td className="px-3 py-2">{formatDate(user.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
