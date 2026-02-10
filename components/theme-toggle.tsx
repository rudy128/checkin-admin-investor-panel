"use client"

import * as React from "react"
import { MoonIcon, SunIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

type Theme = "light" | "dark"

const THEME_STORAGE_KEY = "panels-theme"

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark")
}

export function ThemeToggle() {
  const [mounted, setMounted] = React.useState(false)
  const [theme, setTheme] = React.useState<Theme>("light")

  React.useEffect(() => {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
    const initialTheme: Theme =
      storedTheme === "dark" || storedTheme === "light"
        ? storedTheme
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"

    setTheme(initialTheme)
    applyTheme(initialTheme)
    setMounted(true)
  }, [])

  function onThemeToggle() {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark"
    setTheme(nextTheme)
    applyTheme(nextTheme)
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
  }

  if (!mounted) {
    return (
      <Button variant="outline" size="sm" disabled className="w-20">
        Theme
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="min-w-20"
      onClick={onThemeToggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
    >
      {theme === "dark" ? (
        <MoonIcon data-icon="inline-start" />
      ) : (
        <SunIcon data-icon="inline-start" />
      )}
      {theme === "dark" ? "Dark" : "Light"}
    </Button>
  )
}
