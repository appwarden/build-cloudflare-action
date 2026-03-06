import { getRootDomain } from "../parse-domain"

export interface WranglerTemplateConfig {
  cloudflareAccountId: string
  hostnames: string[]
}

const generateRoutes = (hostnames: string[], env: string) =>
  hostnames
    .map(
      (hostname) =>
        `[[env.${env}.routes]]
pattern = "${hostname}/*"
zone_name = "${getRootDomain(hostname)}"`,
    )
    .join("\n\n")

export const hydrateWranglerTemplate = (
  template: string,
  config: WranglerTemplateConfig,
) =>
  template
    .replaceAll("{{ACCOUNT_ID}}", config.cloudflareAccountId)
    .replaceAll(
      "{{STAGING_ROUTES}}",
      generateRoutes(config.hostnames, "staging"),
    )
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

[env.staging.vars]
APPWARDEN_API_HOSTNAME = "https://staging-api.appwarden.io"

{{PRODUCTION_ROUTES}}

[env.production.vars]
APPWARDEN_API_HOSTNAME = "https://api.appwarden.io"
`
