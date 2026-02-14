"use client"

import * as React from "react"
import { MinusIcon, PlusIcon, RotateCcwIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

const MERMAID_SCRIPT_ID = "mermaid-runtime-script"
const MERMAID_SCRIPT_SRC =
  "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"

type MermaidConfig = {
  startOnLoad?: boolean
  securityLevel?: "strict" | "loose" | "antiscript" | "sandbox"
  theme?: "default" | "neutral" | "dark" | "forest" | "base"
  themeVariables?: Record<string, string | number>
}

type MermaidApi = {
  initialize: (config: MermaidConfig) => void
  render: (
    id: string,
    graphDefinition: string
  ) =>
    | Promise<{ svg: string; bindFunctions?: (element: Element) => void }>
    | { svg: string; bindFunctions?: (element: Element) => void }
}

declare global {
  interface Window {
    mermaid?: MermaidApi
  }
}

function loadMermaidRuntime(): Promise<MermaidApi> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Mermaid is only available in the browser."))
  }

  if (window.mermaid) {
    return Promise.resolve(window.mermaid)
  }

  const existingScript = document.getElementById(
    MERMAID_SCRIPT_ID
  ) as HTMLScriptElement | null

  return new Promise((resolve, reject) => {
    const onReady = () => {
      if (window.mermaid) {
        resolve(window.mermaid)
      } else {
        reject(new Error("Mermaid runtime loaded but unavailable."))
      }
    }

    if (existingScript) {
      if (
        existingScript.dataset.loaded === "true"
      ) {
        onReady()
        return
      }

      const onLoad = () => {
        cleanup()
        onReady()
      }
      const onError = () => {
        cleanup()
        reject(new Error("Failed to load Mermaid runtime."))
      }
      const cleanup = () => {
        existingScript.removeEventListener("load", onLoad)
        existingScript.removeEventListener("error", onError)
      }

      existingScript.addEventListener("load", onLoad)
      existingScript.addEventListener("error", onError)
      return
    }

    const script = document.createElement("script")
    script.id = MERMAID_SCRIPT_ID
    script.async = true
    script.src = MERMAID_SCRIPT_SRC
    script.onload = () => {
      script.dataset.loaded = "true"
      onReady()
    }
    script.onerror = () => reject(new Error("Failed to load Mermaid runtime."))
    document.head.appendChild(script)
  })
}

function parseAbsoluteSvgDimension(value: string | null) {
  if (!value) {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed || trimmed.endsWith("%")) {
    return null
  }

  const parsed = Number.parseFloat(trimmed)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null
  }

  return parsed
}

export function MermaidDiagram({ chart }: { chart: string }) {
  const [svg, setSvg] = React.useState("")
  const [error, setError] = React.useState("")
  const [zoom, setZoom] = React.useState(1)
  const [themeMode, setThemeMode] = React.useState<"light" | "dark">("light")
  const contentRef = React.useRef<HTMLDivElement>(null)
  const baseDimensionsRef = React.useRef<{ width: number; height: number } | null>(null)
  const viewportRef = React.useRef<HTMLDivElement>(null)

  function clampZoom(value: number) {
    return Math.max(0.4, Math.min(3, value))
  }

  React.useEffect(() => {
    const root = document.documentElement
    const syncTheme = () => {
      setThemeMode(root.classList.contains("dark") ? "dark" : "light")
    }

    syncTheme()

    const observer = new MutationObserver(syncTheme)
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["class"],
    })

    return () => {
      observer.disconnect()
    }
  }, [])

  React.useEffect(() => {
    let canceled = false

    async function renderChart() {
      setError("")
      setSvg("")
      baseDimensionsRef.current = null
      setZoom(1)

      try {
        const mermaid = await loadMermaidRuntime()
        if (canceled) {
          return
        }

        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "loose",
          theme: themeMode === "dark" ? "dark" : "default",
          themeVariables: {
            fontSize: "20px",
          },
        })

        const renderResult = await mermaid.render(
          `investor-schema-${Date.now()}`,
          chart
        )

        if (!canceled) {
          setSvg(renderResult.svg)
        }
      } catch {
        if (!canceled) {
          setError("Unable to render Mermaid diagram.")
        }
      }
    }

    void renderChart()
    return () => {
      canceled = true
    }
  }, [chart, themeMode])

  React.useEffect(() => {
    if (!svg) {
      return
    }

    const container = contentRef.current
    if (!container) {
      return
    }

    const svgElement = container.querySelector("svg") as SVGSVGElement | null
    if (!svgElement) {
      return
    }

    if (!baseDimensionsRef.current) {
      const viewBox = svgElement.viewBox?.baseVal
      const widthFromViewBox =
        viewBox && viewBox.width > 0 ? viewBox.width : null
      const heightFromViewBox =
        viewBox && viewBox.height > 0 ? viewBox.height : null

      const widthFromAttribute = parseAbsoluteSvgDimension(
        svgElement.getAttribute("width")
      )
      const heightFromAttribute = parseAbsoluteSvgDimension(
        svgElement.getAttribute("height")
      )

      const groupBounds =
        typeof svgElement.getBBox === "function" ? svgElement.getBBox() : null
      const widthFromBounds =
        groupBounds && Number.isFinite(groupBounds.width) && groupBounds.width > 0
          ? groupBounds.width
          : null
      const heightFromBounds =
        groupBounds && Number.isFinite(groupBounds.height) && groupBounds.height > 0
          ? groupBounds.height
          : null

      const rect = svgElement.getBoundingClientRect()

      const baseWidth =
        widthFromViewBox ||
        widthFromBounds ||
        widthFromAttribute ||
        rect.width ||
        1
      const baseHeight =
        heightFromViewBox ||
        heightFromBounds ||
        heightFromAttribute ||
        rect.height ||
        1

      baseDimensionsRef.current = {
        width: baseWidth,
        height: baseHeight,
      }
    }

    const base = baseDimensionsRef.current
    if (!base) {
      return
    }

    svgElement.style.width = `${base.width * zoom}px`
    svgElement.style.height = `${base.height * zoom}px`
    svgElement.style.maxWidth = "none"
    svgElement.style.display = "block"
  }, [svg, zoom])

  React.useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) {
      return
    }

    viewport.scrollTo({ left: 0, top: 0 })
  }, [svg, themeMode])

  if (error) {
    return (
      <p className="text-destructive text-sm">{error}</p>
    )
  }

  if (!svg) {
    return (
      <div className="text-muted-foreground flex h-[78vh] items-center justify-center text-sm">
        Rendering Mermaid diagram...
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setZoom((value) => clampZoom(value - 0.15))}
        >
          <MinusIcon data-icon="inline-start" />
          Zoom Out
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setZoom(1)
            const viewport = viewportRef.current
            if (viewport) {
              viewport.scrollTo({ left: 0, top: 0 })
            }
          }}
        >
          <RotateCcwIcon data-icon="inline-start" />
          Reset
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setZoom((value) => clampZoom(value + 0.15))}
        >
          <PlusIcon data-icon="inline-start" />
          Zoom In
        </Button>
        <span className="text-muted-foreground text-sm font-medium">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      <div
        ref={viewportRef}
        className="schema-mermaid-scroll h-[78vh] w-full overflow-auto rounded-lg border bg-muted/20 p-3"
        onWheel={(event) => {
          if (!event.ctrlKey && !event.metaKey) {
            return
          }
          event.preventDefault()
          const delta = event.deltaY < 0 ? 0.1 : -0.1
          setZoom((value) => clampZoom(value + delta))
        }}
      >
        <div ref={contentRef} className="min-w-max" dangerouslySetInnerHTML={{ __html: svg }} />
      </div>
    </div>
  )
}
