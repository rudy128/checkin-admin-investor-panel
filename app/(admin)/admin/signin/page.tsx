"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AxiosError } from "axios"
import { LoaderCircleIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { adminAuthApi, setAdminAuthToken } from "@/lib/api/admin-browser"
import { clearSession, storeSignInSession } from "@/lib/auth/admin-session"

export default function SignInPage() {
  const router = useRouter()
  const [username, setUsername] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState("")

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage("")
    setSubmitting(true)

    try {
      const response = await adminAuthApi.postAdminauthsignin({
        username,
        password,
      })

      storeSignInSession(response.auth_token, response.refresh_token)
      setAdminAuthToken(response.auth_token)
      router.replace("/admin")
    } catch (error) {
      clearSession()
      setAdminAuthToken(null)

      if (error instanceof AxiosError) {
        const responseMessage = error.response?.data?.message
        setErrorMessage(
          typeof responseMessage === "string"
            ? responseMessage
            : "Sign in failed. Check your credentials and try again."
        )
      } else {
        setErrorMessage("Sign in failed. Check your credentials and try again.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-6xl items-center px-4 py-6">
      <div className="grid w-full gap-6 md:grid-cols-[1.2fr_1fr]">
        <section className="hidden rounded-2xl border bg-gradient-to-br from-primary/15 to-background p-8 md:block">
          <p className="text-muted-foreground text-sm">Welcome back</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Sign in to continue to your dashboard
          </h1>
          <p className="text-muted-foreground mt-3 max-w-md text-sm leading-relaxed">
            Manage panels, track team check-ins, and keep operations running from
            one place.
          </p>
        </section>

        <Card className="w-full self-center">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>
              Use your account credentials to access Panels.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="admin"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              {errorMessage && (
                <p className="text-destructive text-sm">{errorMessage}</p>
              )}

              <Button className="w-full" type="submit" disabled={submitting}>
                {submitting && <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />}
                Sign in
              </Button>
            </form>

            <div className="space-y-2">
              <Button variant="link" className="h-auto px-0 text-sm" type="button">
                Forgot password?
              </Button>
            </div>

            <Separator />

            <p className="text-muted-foreground text-center text-sm">
              Need a dashboard preview?{" "}
              <Link href="/" className="text-primary font-medium">
                Go to Home
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
