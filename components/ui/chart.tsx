"use client"

import * as React from "react"
import * as RechartsPrimitive from "recharts"

import { cn } from "@/lib/utils"

export type ChartConfig = {
  [k: string]: {
    label?: React.ReactNode
    color?: string
    valueFormatter?: (value: number | string) => React.ReactNode
  }
}

type ChartContextProps = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error("useChart must be used inside a <ChartContainer />")
  }

  return context
}

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const colorEntries = Object.entries(config).filter(([, value]) => value.color)

  if (!colorEntries.length) {
    return null
  }

  const cssVars = colorEntries
    .map(([key, value]) => `  --color-${key}: ${value.color};`)
    .join("\n")

  return <style dangerouslySetInnerHTML={{ __html: `[data-chart="${id}"] {\n${cssVars}\n}` }} />
}

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"]
}) {
  const uniqueId = React.useId().replace(/:/g, "")
  const chartId = id ?? `chart-${uniqueId}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        className={cn(
          "[&_.recharts-cartesian-grid_line]:stroke-border/60 [&_.recharts-layer.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-tooltip-cursor]:stroke-border [&_.recharts-reference-line_line]:stroke-border [&_.recharts-sector[stroke='none']]:stroke-transparent [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

const ChartTooltip = RechartsPrimitive.Tooltip

type ChartTooltipContentProps = React.ComponentProps<"div"> & {
  active?: boolean
  payload?: {
    color?: string
    dataKey?: string
    name?: string
    value?: number | string
  }[]
  label?: number | string
}

function ChartTooltipContent({
  active,
  payload,
  label,
  className,
}: ChartTooltipContentProps) {
  const { config } = useChart()

  if (!active || !payload?.length) {
    return null
  }

  return (
    <div
      className={cn(
        "bg-background/98 ring-border/70 grid min-w-[10rem] gap-2 rounded-lg p-2.5 text-xs shadow-md ring-1 backdrop-blur-sm",
        className
      )}
    >
      {label ? <p className="text-muted-foreground px-1">{label}</p> : null}
      {payload.map((item, index) => {
        const dataKey = item.dataKey ?? item.name ?? "value"
        const itemConfig = config[dataKey]
        const labelText = itemConfig?.label ?? item.name ?? dataKey
        const color = item.color ?? itemConfig?.color ?? "var(--muted-foreground)"
        const value = item.value
        const valueText =
          itemConfig?.valueFormatter
            ? itemConfig.valueFormatter(value ?? "")
            : typeof value === "number"
              ? new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                  maximumFractionDigits: 0,
                }).format(value)
              : value

        return (
          <div key={`${dataKey}-${index}`} className="flex items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-muted-foreground">{labelText}</span>
            </div>
            <span className="font-medium tabular-nums">{valueText}</span>
          </div>
        )
      })}
    </div>
  )
}

export { ChartContainer, ChartTooltip, ChartTooltipContent }
