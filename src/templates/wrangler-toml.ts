import jsesc from "jsesc"
import { getRootDomain } from "../parse-domain"
import { ApiMiddlewareOptions, Config } from "../types"

const generateRoutes = (hostnames: string[], env: string): string => {
  return hostnames
    .map(
      (hostname) =>
        `[[env.${env}.routes]]
pattern = "*${hostname}/*"
zone_name = "${getRootDomain(hostname)}"`,
    )
    .join("\n\n")
}

export const hydrateWranglerTemplate = (
  template: string,
  config: Config,
  middleware: ApiMiddlewareOptions,
) =>
  template
    .replaceAll("{{ACCOUNT_ID}}", config.cloudflareAccountId)
    .replaceAll(
      "{{LOCK_PAGE_SLUG}}",
      middleware?.["lock-page-slug"] ?? "/maintenance",
    )
    .replaceAll("{{STAGING_ROUTES}}", generateRoutes(config.hostnames, "staging"))
    .replaceAll("{{PRODUCTION_ROUTES}}", generateRoutes(config.hostnames, "production"))
    .replaceAll("{{CSP_MODE}}", middleware?.["csp-mode"] ?? "disabled")
    .replaceAll(
      "{{CSP_DIRECTIVES}}",
      middleware?.["csp-directives"]
        ? jsesc(
            typeof middleware?.["csp-directives"] === "object"
              ? JSON.stringify(middleware["csp-directives"])
              : middleware["csp-directives"],
            { quotes: "double" },
          )
        : "",
    )

export const wranglerFileTemplate = `
#:schema ../../node_modules/wrangler/config-schema.json
name = "appwarden"
account_id = "{{ACCOUNT_ID}}"
compatibility_date = "2025-01-01"

workers_dev = false
send_metrics = false

main = "app.mjs"

[observability.logs]
enabled = true
head_sampling_rate = 1

{{STAGING_ROUTES}}

[env.staging.vars]
CSP_MODE = "{{CSP_MODE}}"
LOCK_PAGE_SLUG = "{{LOCK_PAGE_SLUG}}"
CSP_DIRECTIVES = "{{CSP_DIRECTIVES}}"

{{PRODUCTION_ROUTES}}

[env.production.vars]
CSP_MODE = "{{CSP_MODE}}"
LOCK_PAGE_SLUG = "{{LOCK_PAGE_SLUG}}"
CSP_DIRECTIVES = "{{CSP_DIRECTIVES}}"
`
