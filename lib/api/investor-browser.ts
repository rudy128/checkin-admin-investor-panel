"use client"

import axios from "axios"

import { API_URL } from "@/config/api"
import { createInvestorAuthApiClient } from "@/lib/api/investor-auth"

function resolveApiUrl() {
  if (!API_URL) {
    throw new Error("Missing NEXT_PUBLIC_API_URL for browser investor API client.")
  }

  const hasProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(API_URL)
  const normalized = hasProtocol ? API_URL : `http://${API_URL}`
  return normalized.replace(/\/+$/, "")
}

const baseURL = resolveApiUrl()
let currentAuthToken: string | null = null

export const investorAxios = axios.create({
  baseURL,
  timeout: 10_000,
  headers: {
    Accept: "application/json",
  },
})

investorAxios.interceptors.request.use((config) => {
  if (currentAuthToken) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${currentAuthToken}`
  }

  return config
})

export function setInvestorAuthToken(token: string | null) {
  currentAuthToken = token
}

export const investorAuthApi = createInvestorAuthApiClient(baseURL, {
  axiosInstance: investorAxios,
})
