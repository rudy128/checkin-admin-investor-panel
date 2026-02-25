"use client"

import * as React from "react"

import { InvestorSidebar } from "@/components/investor-sidebar"

export function InvestorShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] w-full flex-1 items-start">
      <InvestorSidebar />
      <section className="min-w-0 flex-1 overflow-x-hidden">{children}</section>
    </div>
  )
}
