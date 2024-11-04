import { ApiMiddlewareOptions } from "./types"

const protocolRegex = /^https?:\/\//i

export const ensureProtocol = (maybeFQDN: string) => {
  const hasProtocol = protocolRegex.test(maybeFQDN)
  if (!hasProtocol) {
    return `https://${maybeFQDN}`
  }

  return maybeFQDN
}

export const ignoreProtocol = (maybeFQDN: string) => {
  const hasProtocol = protocolRegex.test(maybeFQDN)
  if (hasProtocol) {
    return maybeFQDN.replace(protocolRegex, "")
  }

  return maybeFQDN
}

export const getMiddlewareOptions = (
  hostname: string,
  apiToken: string,
): Promise<ApiMiddlewareOptions | undefined> =>
  fetch(
    new URL(
      `/v1/middleware-config?monitorHostname=${hostname}`,
      // @ts-expect-error tsup config
      ensureProtocol(API_HOSTNAME),
    ),
    { headers: { "appwarden-token": apiToken } },
  )
    .then((res) => {
      if ([403, 401].includes(res.status)) {
        throw new Error("BAD_AUTH")
      }

      return res
    })
    .then((res) => res.json())
    .then((result: any) => {
      const config = result.content[0] as { options: ApiMiddlewareOptions }
      return config ? config.options : undefined
    })
