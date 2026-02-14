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
import { investorAuthApi, setInvestorAuthToken } from "@/lib/api/investor-browser"
import { clearSession, storeSignInSession } from "@/lib/auth/investor-session"

export default function InvestorSignInPage() {
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
      const response = await investorAuthApi.postInvestorauthsignin({
        username,
        password,
      })

      storeSignInSession(response.auth_token, response.refresh_token)
      setInvestorAuthToken(response.auth_token)
      router.replace("/investor")
    } catch (error) {
      clearSession()
      setInvestorAuthToken(null)

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
            Sign in to continue to your investor dashboard
          </h1>
          <p className="text-muted-foreground mt-3 max-w-md text-sm leading-relaxed">
            Track portfolio health, watch performance shifts, and review investor activity in one place.
          </p>
        </section>

        <Card className="w-full self-center">
          <CardHeader>
            <CardTitle>Investor Sign in</CardTitle>
            <CardDescription>
              Use your investor credentials to access this panel.
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
                  placeholder="investor_user"
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

            <Separator />

            <p className="text-muted-foreground text-center text-sm">
              Need the admin panel?{" "}
              <Link href="/admin/signin" className="text-primary font-medium">
                Go to Admin Sign In
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
