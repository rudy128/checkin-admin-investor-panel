"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { InvestorSidebar } from "@/components/investor-sidebar"

const SIGN_IN_PATH = "/investor/signin"

export function InvestorShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (pathname === SIGN_IN_PATH) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] w-full flex-1 items-start">
      <InvestorSidebar />
      <section className="min-w-0 flex-1 overflow-x-hidden">{children}</section>
    </div>
  )
}
