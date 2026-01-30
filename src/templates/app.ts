export const appTemplate = `
import {
  useContentSecurityPolicy,
  withAppwarden,
} from "@appwarden/middleware/cloudflare"
import { config } from './generated-config.mjs'

export default {
  fetch: withAppwarden((context) => ({
    debug: context.env.DEBUG,
    lockPageSlug: context.env.LOCK_PAGE_SLUG,
    appwardenApiToken: context.env.APPWARDEN_API_TOKEN,
    ...(config.appwarden && { multidomainConfig: config.appwarden }),
    middleware: {
      before: [
        ...(config.csp
          ? Object.entries(config.csp).map(([hostname, cspConfig]) =>
              useContentSecurityPolicy({
                hostname,
                mode: cspConfig.mode,
                directives: cspConfig.directives,
              })
            )
          : [
              useContentSecurityPolicy({
                mode: context.env.CSP_MODE,
                directives: context.env.CSP_DIRECTIVES,
              }),
            ]),
      ],
    },
  })),
}
`
