export const appTemplate = `
import {
  useContentSecurityPolicy,
  withAppwarden,
} from "@appwarden/middleware/cloudflare"

export default {
  fetch: withAppwarden((context) => ({
    debug: context.env.DEBUG,
    lockPageSlug: context.env.LOCK_PAGE_SLUG,
    appwardenApiToken: context.env.APPWARDEN_API_TOKEN,
    middleware: {
      before: [
        useContentSecurityPolicy({
          mode: context.env.CSP_MODE,
          directives: context.env.CSP_DIRECTIVES,
        }),
      ]
    },
  })),
}
`
