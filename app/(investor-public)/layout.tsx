import { InvestorHeader } from "@/components/investor-header"
import { InvestorShell } from "@/components/investor-shell"

export default function InvestorPublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="flex min-h-screen flex-col">
      <InvestorHeader />
      <main className="flex-1">
        <InvestorShell>{children}</InvestorShell>
      </main>
    </div>
  )
}
