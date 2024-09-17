export const appTemplate = `
import {
  useContentSecurityPolicy,
  withAppwardenOnCloudflare,
} from "@appwarden/middleware/cloudflare"

export default {
  fetch: withAppwardenOnCloudflare((context) => ({
    debug: context.env.DEBUG,
    lockPageSlug: context.env.LOCK_PAGE_SLUG,
    appwardenApiToken: context.env.APPWARDEN_API_TOKEN,
    middleware: {
      before:
        typeof context.env.CSP_ENFORCE === undefined
          ? []
          : [
              useContentSecurityPolicy({
                enforce: context.env.CSP_ENFORCE,
                directives: context.env.CSP_DIRECTIVES,
              }),
            ],
    },
  })),
}
`
