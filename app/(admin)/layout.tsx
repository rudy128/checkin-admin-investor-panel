import { AppHeader } from "@/components/app-header"
import { AuthGate } from "@/components/auth-gate"
import { AppShell } from "@/components/app-shell"

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1">
        <AuthGate>
          <AppShell>{children}</AppShell>
        </AuthGate>
      </main>
    </div>
  )
}
