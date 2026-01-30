import { getRootDomain } from "../parse-domain"
import { Config } from "../types"

const generateRoutes = (hostnames: string[], env: string) => 
   hostnames
    .map(
      (hostname) =>
        `[[env.${env}.routes]]
pattern = "*${hostname}*"
zone_name = "${getRootDomain(hostname)}"`,
    )
    .join("\n\n")

export const hydrateWranglerTemplate = (template: string, config: Config) =>
  template
    .replaceAll("{{ACCOUNT_ID}}", config.cloudflareAccountId)
    .replaceAll("{{STAGING_ROUTES}}", generateRoutes(config.hostnames, "staging"))
    .replaceAll(
      "{{PRODUCTION_ROUTES}}",
      generateRoutes(config.hostnames, "production"),
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

{{PRODUCTION_ROUTES}}
`
