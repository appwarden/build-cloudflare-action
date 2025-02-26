import jsesc from "jsesc"
import { getRootDomain } from "../parse-domain"
import { ApiMiddlewareOptions, Config } from "../types"

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
    .replaceAll("{{PATTERN}}", `*${config.hostname}/*`)
    .replaceAll("{{ZONE_NAME}}", getRootDomain(config.hostname))
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
name = "appwarden-middleware"
account_id = "{{ACCOUNT_ID}}"
compatibility_date = "2024-08-18"

workers_dev = false
send_metrics = false

main = "app.mjs"

[observability.logs]
enabled = true
head_sampling_rate = 1

[env.staging.route]
pattern = "{{PATTERN}}"
zone_name = "{{ZONE_NAME}}"

[env.staging.vars]
CSP_MODE = "{{CSP_MODE}}"
LOCK_PAGE_SLUG = "{{LOCK_PAGE_SLUG}}"
CSP_DIRECTIVES = "{{CSP_DIRECTIVES}}"

[env.production.route]
pattern = "{{PATTERN}}"
zone_name = "{{ZONE_NAME}}"

[env.production.vars]
CSP_MODE = "{{CSP_MODE}}"
LOCK_PAGE_SLUG = "{{LOCK_PAGE_SLUG}}"
CSP_DIRECTIVES = "{{CSP_DIRECTIVES}}"
`
