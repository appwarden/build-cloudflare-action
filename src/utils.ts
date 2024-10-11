import { ApiMiddlewareOptions } from "./types"

const protocolRegex = /^https?:\/\//i

export const disableContentSecurityPolicy = "disable-content-security-policy"

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
): Promise<ApiMiddlewareOptions> =>
  fetch(
    new URL(
      `/v1/middleware-config?monitorHostname=${hostname}`,
      // @ts-expect-error tsup config
      ensureProtocol(API_HOSTNAME),
    ),
    { headers: { "appwarden-api-token": apiToken } },
  )
    .then((res) => res.json())
    .then((configs: any) => {
      const config = configs[0] as { options: ApiMiddlewareOptions }
      if (!config) {
        throw new Error(
          `Could not find Appwarden middleware configuration for hostname: ${hostname}`,
        )
      }

      return {
        ...config.options,
        "csp-directives":
          typeof config.options["csp-directives"] === "string"
            ? JSON.parse(config.options["csp-directives"])
            : config.options["csp-directives"],
      }
    })
