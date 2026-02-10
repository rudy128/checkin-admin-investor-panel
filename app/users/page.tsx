"use client"

import * as React from "react"
import { LoaderCircleIcon, RefreshCwIcon, UsersIcon } from "lucide-react"
import { useRouter } from "next/navigation"

import { adminUsersApi, type AdminUser } from "@/lib/api/admin-browser"
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

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = React.useState<AdminUser[]>([])
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState("")

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
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadUsers(true)}
            disabled={loading || refreshing}
          >
            {refreshing && <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />}
            {!refreshing && <RefreshCwIcon data-icon="inline-start" />}
            Refresh
          </Button>
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
                      onClick={() => router.push(`/users/${user.id}`)}
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
