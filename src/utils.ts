import { z } from "zod"
import { getRootDomain } from "./parse-domain"
import { ApiMiddlewareOptions, APIResponse } from "./types"

// Schema for validating the API response structure
const ApiMiddlewareOptionsSchema = z.object({
  debug: z.boolean().optional(),
  "lock-page-slug": z.string().optional(),
  "csp-mode": z.enum(["disabled", "report-only", "enforced"]).optional(),
  "csp-directives": z.record(z.string(), z.string()).optional(),
})

const MiddlewareConfigResponseSchema = z.object({
  content: z.array(
    z.object({
      options: ApiMiddlewareOptionsSchema,
    }),
  ),
})

export const getMiddlewareOptions = async (
  hostname: string,
  apiToken: string,
): Promise<ApiMiddlewareOptions | undefined> => {
  const rootDomain = getRootDomain(hostname)

  let res: Response
  try {
    res = await fetch(
      new URL(
        `/v1/middleware-config?monitorHostname=${rootDomain}`,
        // @ts-expect-error tsup config
        API_HOSTNAME,
      ),
      {
        headers: { Authorization: apiToken },
      },
    )
  } catch (error) {
    // Network-level errors (DNS, connection refused, etc.)
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(
      `Failed to fetch middleware configuration for hostname "${hostname}": ${message}`,
    )
  }

  if (res.status >= 400) {
    if (res.headers.get("content-type")?.includes("application/json")) {
      const result = (await res.json()) as APIResponse
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
  const parsed = MiddlewareConfigResponseSchema.safeParse(result)

  if (!parsed.success) {
    // If parsing fails, the API response structure is unexpected
    // Return undefined to trigger the "could not find configuration" error
    return undefined
  }

  const config = parsed.data.content[0]
  return config ? config.options : undefined
}
