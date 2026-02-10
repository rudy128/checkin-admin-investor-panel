"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { AppSidebar } from "@/components/app-sidebar"

const SIGN_IN_PATH = "/signin"

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (pathname === SIGN_IN_PATH) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] w-full flex-1 items-start">
      <AppSidebar />
      <section className="min-w-0 flex-1 overflow-x-hidden">{children}</section>
    </div>
  )
}
