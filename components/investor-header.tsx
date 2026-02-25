import Link from "next/link"

import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"

export function InvestorHeader() {
  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/75 sticky top-0 z-30 border-b backdrop-blur">
      <div className="flex h-14 w-full items-center justify-between gap-3 px-4 md:px-6">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/">Investor Dashboard</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/table-schema">Table Schema</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin">Admin</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/signin">Admin Login</Link>
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
