import { z } from "zod"
import { isValidHostname } from "./parse-domain"

const OptionalBooleanSchema = z
  .union([z.string(), z.boolean(), z.undefined()])
  .transform((val) => {
    if (val === undefined) {
      return val
    }

    if (val === "true" || val === true) {
      return true
    } else if (val === "false" || val === false) {
      return false
    }

    throw new Error("Invalid value")
  })

export const ConfigSchema = z.object({
  hostname: z.string().refine((val) => isValidHostname(val), {
    message: "`hostname` must be a valid domain name. (e.g. `app.example.com`)",
    path: ["hostname"],
  }),
  cloudflareAccountId: z.string().refine((val) => val.length === 32, {
    message:
      "cloudflareAccountId must be a 32 character string. You can find this in your Cloudflare dashboard url: dash.cloudflare.com/<cloudflareAccountId>",
    path: ["cloudflareAccountId"],
  }),
  appwardenApiToken: z.string(),
  debug: OptionalBooleanSchema.default(false),
})
