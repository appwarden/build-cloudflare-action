import jsesc from "jsesc"
import { ApiMiddlewareOptions, Config } from "../types"
import { disableContentSecurityPolicy } from "../utils"

export const hydrateWranglerTemplate = (
  template: string,
  data: Config,
  middlewareConfig: ApiMiddlewareOptions,
) =>
  template
    .replaceAll("{{DOMAIN_HOSTNAME}}", data.hostname)
    .replaceAll("{{ACCOUNT_ID}}", data.cloudflareAccountId)
    .replaceAll("{{LOCK_PAGE_SLUG}}", data.lockPageSlug)
    .replaceAll("{{PATTERN}}", `*${data.hostname}/*`)
    .replaceAll("{{ZONE_NAME}}", data.hostname)
    .replaceAll(
      "{{CSP_ENFORCE}}",
      middlewareConfig?.["csp-enforced"]
        ? middlewareConfig["csp-enforced"].toString()
        : disableContentSecurityPolicy,
    )
    .replaceAll(
      "{{CSP_DIRECTIVES}}",
      middlewareConfig?.["csp-directives"]
        ? jsesc(JSON.stringify(middlewareConfig["csp-directives"]), {
            quotes: "double",
          })
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

[env.staging.route]
pattern = "{{PATTERN}}"
zone_name = "{{ZONE_NAME}}"

[env.staging.vars]
CSP_ENFORCE = {{CSP_ENFORCE}}
LOCK_PAGE_SLUG = "{{LOCK_PAGE_SLUG}}"
CSP_DIRECTIVES = "{{CSP_DIRECTIVES}}"

[env.production.route]
pattern = "{{PATTERN}}"
zone_name = "{{ZONE_NAME}}"

[env.production.vars]
CSP_ENFORCE = {{CSP_ENFORCE}}
LOCK_PAGE_SLUG = "{{LOCK_PAGE_SLUG}}"
CSP_DIRECTIVES = "{{CSP_DIRECTIVES}}"
`
