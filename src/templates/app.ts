export const appTemplate = `
import {
  useContentSecurityPolicy,
  createAppwardenMiddleware,
} from "@appwarden/middleware/cloudflare"
import { config } from './generated-config.mjs'

export default {
  fetch: createAppwardenMiddleware((context) => ({
    debug: context.env.DEBUG,
    appwardenApiToken: context.env.APPWARDEN_API_TOKEN,
    appwardenApiHostname: context.env.APPWARDEN_API_HOSTNAME,
    multidomainConfig: config.appwarden,
    middleware: {
      before: [
        ...Object.entries(config.csp || {}).map(([hostname, cspConfig]) =>
          useContentSecurityPolicy({
            hostname,
            mode: cspConfig.mode,
            directives: cspConfig.directives,
          })
        ),
      ],
    },
  })),
}
`
