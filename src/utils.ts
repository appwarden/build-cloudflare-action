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
 * Fetches one page of middleware configurations from the API.
 *
 * Passing `fqdn` sets `?fqdn=`, which scopes the response to that hostname and
 * lets a domain-restricted API token read it — such a token is refused a request
 * that names no domain (`403 DOMAIN_NOT_PERMITTED`).
 */
const fetchMiddlewareConfig = async (
  apiToken: string,
  fqdn: string | undefined,
  debug: DebugLogger,
): Promise<unknown> => {
  const url = new URL(
    `/v1/appwarden/config`,
    // @ts-expect-error tsup config
    APPWARDEN_API_HOSTNAME,
  )

  if (fqdn) {
    url.searchParams.set("fqdn", fqdn)
  }

  debug(`[config] Request URL: ${url.toString()}`)
  debug(
    `[config] Token well-formed: ${isWellFormedToken(apiToken)} (length: ${apiToken?.length ?? 0})`,
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

  debug(`[config] Response status: ${res.status}`)

  if (res.status >= 400) {
    if (res.headers.get("content-type")?.includes("application/json")) {
      const result = (await res.json()) as APIResponse
      debug(`[config] Error response body: ${JSON.stringify(result, null, 2)}`)
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
  debug(`[config] Response body: ${JSON.stringify(result, null, 2)}`)

  return result
}

/**
 * Fetches middleware configurations and returns a map of hostname -> options.
 *
 * When `hostnames` is provided, each hostname is fetched in its own request with
 * `?fqdn=` set, so a domain-restricted API token — which the API refuses on a
 * request that names no domain — can read it. When `hostnames` is omitted, the
 * whole account configuration is fetched in a single request, which only an
 * unrestricted token may read.
 */
export const getMiddlewareOptions = async (
  apiToken: string,
  debug: DebugLogger = () => {},
  hostnames?: string[],
): Promise<Map<string, HostnameMiddlewareOptions>> => {
  // One request per requested hostname; a single unscoped request otherwise.
  const targets: (string | undefined)[] =
    hostnames && hostnames.length > 0 ? hostnames : [undefined]

  const middlewareOptionsMap = new Map<string, HostnameMiddlewareOptions>()

  for (const fqdn of targets) {
    const result = await fetchMiddlewareConfig(apiToken, fqdn, debug)

    const parsed = MiddlewareConfigResponseSchema.safeParse(result)

    if (!parsed.success) {
      // If parsing fails, the API response structure is unexpected
      const formattedError = JSON.stringify(parsed.error.format(), null, 2)
      // Throw an error with validation details so users can identify the issue
      throw new Error(
        `API response validation failed. The middleware configuration contains invalid data:\n${formattedError}`,
      )
    }

    for (const item of parsed.data.content) {
      middlewareOptionsMap.set(item.url, item.options)
    }
  }

  return middlewareOptionsMap
}
