"use client"

import Link from "next/link"
import { LayoutDashboardIcon } from "lucide-react"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const navItems = [
  {
    href: "/investor",
    label: "Dashboard",
    icon: LayoutDashboardIcon,
  },
] as const

export function InvestorSidebar() {
  const pathname = usePathname()

  return (
    <>
      <aside className="bg-muted/20 sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-60 shrink-0 overflow-y-auto border-r md:block">
        <nav className="flex flex-col gap-1 p-3">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "hover:bg-muted inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  active ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-foreground"
                )}
              >
                <item.icon className="size-4" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      <div className="bg-background sticky top-14 z-20 border-b px-3 py-2 md:hidden">
        <nav className="flex gap-2 overflow-x-auto">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-medium",
                  active ? "bg-primary text-primary-foreground border-primary" : "bg-background"
                )}
              >
                <item.icon className="size-3.5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </>
  )
}
