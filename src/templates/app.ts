export const appTemplate = `
import {
  useContentSecurityPolicy,
  createAppwardenMiddleware,
} from "@appwarden/middleware/cloudflare"
import { config } from './generated-config.mjs'

// Compute global debug value from config - if ANY hostname has debug enabled, enable it globally
const debugEnabled = Object.values(config).some(hostnameConfig => hostnameConfig.debug === true)

export default {
  fetch: createAppwardenMiddleware((context) => ({
    debug: debugEnabled,
    appwardenApiToken: context.env.APPWARDEN_API_TOKEN,
    appwardenApiHostname: context.env.APPWARDEN_API_HOSTNAME,
    multidomainConfig: config,
    middleware: {
      before: [
        ...Object.entries(config)
          .filter(([, hostnameConfig]) => hostnameConfig.contentSecurityPolicy)
          .map(([hostname, hostnameConfig]) =>
            useContentSecurityPolicy({
              hostname,
              mode: hostnameConfig.contentSecurityPolicy.mode,
              directives: hostnameConfig.contentSecurityPolicy.directives,
            })
          ),
      ],
    },
  })),
}
`
