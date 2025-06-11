import { ApiMiddlewareOptions, APIResponse } from "./types"

export const getMiddlewareOptions = (
  hostname: string,
  apiToken: string,
): Promise<ApiMiddlewareOptions | undefined> =>
  fetch(
    new URL(
      `/v1/middleware-config?monitorHostname=${hostname}`,
      // @ts-expect-error tsup config
      API_HOSTNAME,
    ),
    {
      headers: { Authorization: apiToken },
    },
  )
    .then(async (res) => {
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

      return res
    })
    .then((res) => res.json())
    .then((result: any) => {
      const config = result.content[0] as { options: ApiMiddlewareOptions }
      return config ? config.options : undefined
    })
