import { makeApi, Zodios, type ZodiosOptions } from "@zodios/core"
import { z } from "zod"

const ErrorResponse = z
  .object({
    error: z
      .object({
        code: z.number().int(),
        message: z.string(),
        details: z.union([
          z.string(),
          z.object({}).partial().passthrough(),
          z.null(),
        ]),
        metadata: z.object({}).partial().passthrough().optional(),
      })
      .passthrough(),
  })
  .passthrough()

const InvestorSignInResponse = z
  .object({
    investor_id: z.string().uuid(),
    auth_token: z.string(),
    refresh_token: z.string(),
  })
  .passthrough()
const InvestorSignInRequest = z
  .object({ username: z.string(), password: z.string() })
  .passthrough()
const InvestorRefreshResponse = z
  .object({ investor_id: z.string().uuid(), auth_token: z.string() })
  .passthrough()

const endpoints = makeApi([
  {
    method: "post",
    path: "/investor/auth/signin",
    alias: "postInvestorauthsignin",
    description: `Validates investor username/password and returns investor auth + refresh tokens.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: InvestorSignInRequest,
      },
    ],
    response: InvestorSignInResponse,
    errors: [
      {
        status: 400,
        description: `Validation error`,
        schema: ErrorResponse,
      },
      {
        status: 401,
        description: `Invalid credentials`,
        schema: ErrorResponse,
      },
      {
        status: 409,
        description: `Duplicate investor username conflict`,
        schema: ErrorResponse,
      },
      {
        status: 500,
        description: `Server error`,
        schema: ErrorResponse,
      },
    ],
  },
  {
    method: "post",
    path: "/investor/auth/refresh",
    alias: "postInvestorauthrefresh",
    description: `Validates investor refresh token from header and returns a new investor auth token.`,
    requestFormat: "json",
    parameters: [
      {
        name: "X-Refresh-Token",
        type: "Header",
        schema: z.string(),
      },
    ],
    response: InvestorRefreshResponse,
    errors: [
      {
        status: 401,
        description: `Invalid or expired refresh token`,
        schema: ErrorResponse,
      },
      {
        status: 500,
        description: `Server error`,
        schema: ErrorResponse,
      },
    ],
  },
])

export function createInvestorAuthApiClient(baseUrl: string, options?: ZodiosOptions) {
  return new Zodios(baseUrl, endpoints, options)
}
