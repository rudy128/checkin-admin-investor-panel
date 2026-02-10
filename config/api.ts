const rawApiUrl = process.env.NEXT_PUBLIC_API_URL

if (!rawApiUrl) {
  throw new Error("Missing NEXT_PUBLIC_API_URL.")
}

export const API_URL = rawApiUrl.replace(/\/+$/, "")
