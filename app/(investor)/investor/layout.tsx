import { InvestorAuthGate } from "@/components/investor-auth-gate"
import { InvestorHeader } from "@/components/investor-header"
import { InvestorShell } from "@/components/investor-shell"

export default function InvestorLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="flex min-h-screen flex-col">
      <InvestorHeader />
      <main className="flex-1">
        <InvestorAuthGate>
          <InvestorShell>{children}</InvestorShell>
        </InvestorAuthGate>
      </main>
    </div>
  )
}
