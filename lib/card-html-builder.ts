type CardThemeCategory = "narrative" | "health" | "music" | "location"

type ParsedCardResponse = {
  title: string
  subtitle: string
  body: string
  sections: ParsedCardSection[]
  raw: string
}

type ParsedCardSection = {
  heading: string
  content: string
  children: ParsedCardSection[]
}

type BuildCardHtmlOptions = {
  theme?: string | undefined
  label?: string | undefined
  generatedAt?: Date | undefined
  timeZone?: string | undefined
  tzOffsetMinutes?: number | undefined
  /** Override accent color (e.g. subtitle, section headings) */
  overrideAccent?: string | undefined
  /** Override background gradient */
  overrideGradient?: string | undefined
}

type CardTheme = {
  gradient: string
  accent: string
}

type CardDefinition = {
  key: string
  label: string
  category: CardThemeCategory
}

const CARD_THEMES: Record<CardThemeCategory, CardTheme> = {
  narrative: {
    gradient: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
    accent: "#a78bfa",
  },
  health: {
    gradient: "linear-gradient(135deg, #0d1b2a 0%, #1b2838 50%, #1a3a4a 100%)",
    accent: "#2dd4bf",
  },
  music: {
    gradient: "linear-gradient(135deg, #1a1a2e 0%, #1e3a2f 50%, #162b1e 100%)",
    accent: "#34d399",
  },
  location: {
    gradient: "linear-gradient(135deg, #1a1a2e 0%, #1e2a3a 50%, #162545 100%)",
    accent: "#818cf8",
  },
}

const CARD_DEFINITIONS: CardDefinition[] = [
  { key: "health_stats", label: "Health", category: "health" },
  { key: "spotify", label: "Spotify", category: "music" },
  { key: "location", label: "Location", category: "location" },
  { key: "map", label: "Map", category: "location" },
]

function normalizeTzOffsetMinutes(value: number): number {
  if (!Number.isFinite(value)) return 0
  const rounded = Math.round(value)
  if (rounded < -720) return -720
  if (rounded > 840) return 840
  return rounded
}

function parseOffsetTimezoneMinutes(value: string): number | null {
  const trimmed = value.trim()
  const offsetMatch = /^([+-])(\d{2}):(\d{2})$/.exec(trimmed)
  if (offsetMatch) {
    const sign = offsetMatch[1] === "-" ? -1 : 1
    const hours = Number.parseInt(offsetMatch[2] ?? "0", 10)
    const minutes = Number.parseInt(offsetMatch[3] ?? "0", 10)
    return normalizeTzOffsetMinutes(sign * (hours * 60 + minutes))
  }

  const utcMatch = /^(?:UTC|GMT)([+-])(\d{1,2})(?::?(\d{2}))?$/i.exec(trimmed)
  if (utcMatch) {
    const sign = utcMatch[1] === "-" ? -1 : 1
    const hours = Number.parseInt(utcMatch[2] ?? "0", 10)
    const minutes = Number.parseInt(utcMatch[3] ?? "0", 10)
    return normalizeTzOffsetMinutes(sign * (hours * 60 + minutes))
  }

  const numeric = Number.parseInt(trimmed, 10)
  if (!Number.isNaN(numeric)) return normalizeTzOffsetMinutes(numeric)

  return null
}

function isValidIanaTimezone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone })
    return true
  } catch {
    return false
  }
}

function inferOffsetFromIanaTimezone(date: Date, timeZone: string): number | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(date)

    const getPart = (type: Intl.DateTimeFormatPartTypes): number => {
      const value = parts.find((part) => part.type === type)?.value ?? "0"
      return Number.parseInt(value, 10)
    }

    const year = getPart("year")
    const month = getPart("month")
    const day = getPart("day")
    const hour = getPart("hour")
    const minute = getPart("minute")
    const second = getPart("second")
    const utcMillis = Date.UTC(year, month - 1, day, hour, minute, second)
    return normalizeTzOffsetMinutes((utcMillis - date.getTime()) / 60_000)
  } catch {
    return null
  }
}

function resolveTzOffsetMinutes(
  timeZone?: string,
  fallbackOffsetMinutes?: number,
  date = new Date(),
): number {
  if (typeof fallbackOffsetMinutes === "number" && Number.isFinite(fallbackOffsetMinutes)) {
    return normalizeTzOffsetMinutes(fallbackOffsetMinutes)
  }

  if (typeof timeZone === "string" && timeZone.trim().length > 0) {
    const parsedOffset = parseOffsetTimezoneMinutes(timeZone)
    if (parsedOffset !== null) return parsedOffset

    if (isValidIanaTimezone(timeZone)) {
      const inferred = inferOffsetFromIanaTimezone(date, timeZone)
      if (inferred !== null) return inferred
    }
  }

  return normalizeTzOffsetMinutes(-date.getTimezoneOffset())
}

function formatUtcOffsetLabel(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? "+" : "-"
  const absoluteMinutes = Math.abs(offsetMinutes)
  const hours = Math.floor(absoluteMinutes / 60)
  const minutes = absoluteMinutes % 60
  return `UTC${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

function getTimezoneLabel(
  date: Date,
  timeZone?: string,
  fallbackOffsetMinutes?: number,
): string {
  if (typeof timeZone === "string" && timeZone.trim().length > 0 && isValidIanaTimezone(timeZone)) {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        timeZoneName: "short",
      }).formatToParts(date)
      const zoneName = parts.find((part) => part.type === "timeZoneName")?.value?.trim() ?? ""
      if (zoneName.length > 0) return zoneName
    } catch {
      // fall through
    }

    const inferredOffset = inferOffsetFromIanaTimezone(date, timeZone)
    if (inferredOffset !== null) return formatUtcOffsetLabel(inferredOffset)
  }

  return formatUtcOffsetLabel(resolveTzOffsetMinutes(timeZone, fallbackOffsetMinutes, date))
}

function formatDateShortForUser(
  timeZone?: string,
  fallbackOffsetMinutes?: number,
  date = new Date(),
): string {
  if (typeof timeZone === "string" && timeZone.trim().length > 0 && isValidIanaTimezone(timeZone)) {
    const formatted = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone,
    }).format(date)
    const zoneLabel = getTimezoneLabel(date, timeZone, fallbackOffsetMinutes)
    return `${formatted} ${zoneLabel}`
  }

  const offsetMinutes = resolveTzOffsetMinutes(timeZone, fallbackOffsetMinutes, date)
  const shiftedDate = new Date(date.getTime() + offsetMinutes * 60_000)
  const formatted = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(shiftedDate)
  const zoneLabel = getTimezoneLabel(date, timeZone, fallbackOffsetMinutes)
  return `${formatted} ${zoneLabel}`
}

function resolveCardDefinition(cardType: string | undefined): CardDefinition {
  const normalized = (cardType ?? "").trim().toLowerCase()

  if (normalized === "health" || normalized === "health_stats") return CARD_DEFINITIONS[0] as CardDefinition
  if (normalized === "spotify") return CARD_DEFINITIONS[1] as CardDefinition
  if (normalized === "location") return CARD_DEFINITIONS[2] as CardDefinition
  if (normalized === "map") return CARD_DEFINITIONS[3] as CardDefinition

  return {
    key: normalized.length > 0 ? normalized : "manual",
    label: "Manual",
    category: "narrative",
  }
}

/**
 * Build a parsed card response from an admin-supplied "What It Is" + "What It Means" pair.
 * The title and subtitle are passed in directly from the form.
 */
export function buildParsedCardFromFields(fields: {
  title: string
  subtitle?: string
  body?: string
}): ParsedCardResponse {
  const { title, subtitle = "", body = "" } = fields

  const raw = [
    `TITLE: ${title}`,
    body.trim() ? `BODY:\n${body.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n")

  return {
    title,
    subtitle,
    body: body.trim(),
    sections: [],
    raw,
  }
}

export function buildCardHtml(
  parsed: ParsedCardResponse,
  options: BuildCardHtmlOptions = {},
): string {
  const cardDef = resolveCardDefinition(options.theme)
  const baseTheme = CARD_THEMES[cardDef.category] ?? CARD_THEMES.narrative
  const theme = {
    gradient: options.overrideGradient ?? baseTheme.gradient,
    accent: options.overrideAccent ?? baseTheme.accent,
  }
  const title = parsed.title || options.label || cardDef.label
  const subtitle = parsed.subtitle || ""
  const body = parsed.body || ""
  const dateLabel = formatDateShortForUser(
    options.timeZone,
    options.tzOffsetMinutes,
    options.generatedAt ?? new Date(),
  )

  // Render body by splitting on the two known section markers
  const whatItIsMatch = body.match(/WHAT IT IS:\n([\s\S]*?)(?=\n\nWHAT IT MEANS:|$)/)
  const whatItMeansMatch = body.match(/WHAT IT MEANS:\n([\s\S]*)$/)

  const whatItIsText = whatItIsMatch?.[1]?.trim() ?? ""
  const whatItMeansText = whatItMeansMatch?.[1]?.trim() ?? ""

  const renderedBody = [
    whatItIsText
      ? `<div class="section-heading">WHAT IT IS:</div><div class="section-body">${whatItIsText}</div>`
      : "",
    whatItMeansText
      ? `<br><div class="section-heading">WHAT IT MEANS:</div><div class="section-body">${whatItMeansText}</div>`
      : "",
  ]
    .filter(Boolean)
    .join("")

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display","Segoe UI",sans-serif;
  background:${theme.gradient};color:#fff;min-height:100vh;display:flex;align-items:center;
  justify-content:center;padding:24px 20px;}
.card{max-width:400px;width:100%;}
.card-title{font-size:22px;font-weight:600;letter-spacing:-0.4px;color:rgba(255,255,255,0.95);
  margin-bottom:6px;line-height:1.25;}
.card-subtitle{font-size:14px;color:${theme.accent};opacity:0.85;margin-bottom:24px;
  line-height:1.4;letter-spacing:0.1px;}
.card-body{font-size:15px;line-height:1.6;color:rgba(255,255,255,0.82);letter-spacing:0.15px;}
.section-heading{font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;
  color:${theme.accent};margin-top:1px;margin-bottom:0px;}
.section-heading:first-child{margin-top:0;}
.section-body{font-size:15px;line-height:1.6;color:rgba(255,255,255,0.82);}
.card-footer{margin-top:28px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.06);
  font-size:11px;color:rgba(255,255,255,0.28);letter-spacing:0.4px;
  display:flex;justify-content:space-between;}
</style></head>
<body>
<div class="card">
  <div class="card-title">${escapeHtml(title)}</div>
  ${subtitle ? `<div class="card-subtitle">${escapeHtml(subtitle)}</div>` : ""}
  <div class="card-body">${renderedBody}</div>
  <div class="card-footer">
    <span>${dateLabel}</span>
    <span>${escapeHtml(options.label ?? cardDef.label)}</span>
  </div>
</div>
</body></html>`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
