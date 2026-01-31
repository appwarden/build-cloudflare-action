import { z } from "zod"
import { HostnameMiddlewareOptions } from "./templates/generated-config"
import { APIResponse } from "./types"


const MiddlewareConfigResponseSchema = z.object({
  content: z.array(z.any()),
})

export type DebugLogger = (msg: unknown) => void

const isWellFormedToken = (token: string): boolean => {
  // Check if token exists and has a reasonable length (at least 16 chars)
  return typeof token === "string" && token.length >= 16
}

/**
 * Fetches all middleware configurations for the account.
 * Returns a map of hostname -> middleware options.
 */
export const getMiddlewareOptions = async (
  apiToken: string,
  debug: DebugLogger = () => {},
): Promise<Map<string, HostnameMiddlewareOptions>> => {
  const url = new URL(
    `/v1/middleware-config`,
    // @ts-expect-error tsup config
    API_HOSTNAME,
  )

  debug(`[middleware-config] Request URL: ${url.toString()}`)
  debug(
    `[middleware-config] Token well-formed: ${isWellFormedToken(apiToken)} (length: ${apiToken?.length ?? 0})`,
  )

  let res: Response
  try {
    res = await fetch(url, {
      headers: { Authorization: apiToken },
    })
  } catch (error) {
    // Network-level errors (DNS, connection refused, etc.)
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to fetch middleware configuration: ${message}`)
  }

  debug(`[middleware-config] Response status: ${res.status}`)

  if (res.status >= 400) {
    if (res.headers.get("content-type")?.includes("application/json")) {
      const result = (await res.json()) as APIResponse
      debug(
        `[middleware-config] Error response body: ${JSON.stringify(result, null, 2)}`,
      )
      if (result.error?.code) {
        throw new Error(result.error.code)
      }
      if (result.error?.message) {
        throw new Error(result.error.message)
      }
    }

    throw new Error("BAD_AUTH")
  }

  const result: unknown = await res.json()
  debug(`[middleware-config] Response body: ${JSON.stringify(result, null, 2)}`)

  const parsed = MiddlewareConfigResponseSchema.safeParse(result)

  if (!parsed.success) {
    // If parsing fails, the API response structure is unexpected
    const formattedError = JSON.stringify(parsed.error.format(), null, 2)
    // Throw an error with validation details so users can identify the issue
    throw new Error(
      `API response validation failed. The middleware configuration contains invalid data:\n${formattedError}`,
    )
  }

  const middlewareOptionsMap = new Map<string, HostnameMiddlewareOptions>()

  for (const item of parsed.data.content) {
    middlewareOptionsMap.set(item.hostname, item.options)
  }

  return middlewareOptionsMap
}
