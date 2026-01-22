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

// Cloudflare account IDs are 32 character lowercase hexadecimal strings
const CloudflareAccountIdSchema = z
  .string()
  .refine((val) => /^[a-f0-9]{32}$/.test(val), {
    message:
      "cloudflareAccountId must be a 32 character hexadecimal string (lowercase a-f, 0-9). You can find this in your Cloudflare dashboard url: dash.cloudflare.com/<cloudflareAccountId>",
    path: ["cloudflareAccountId"],
  })

const ApiTokenSchema = z
  .string()
  .min(1, { message: "appwardenApiToken is required" })
  .min(16, {
    message:
      "appwardenApiToken appears to be invalid (too short). Please check your API token.",
  })

export const ConfigSchema = z.object({
  hostname: z.string().refine((val) => isValidHostname(val), {
    message: "`hostname` must be a valid domain name. (e.g. `app.example.com`)",
    path: ["hostname"],
  }),
  cloudflareAccountId: CloudflareAccountIdSchema,
  appwardenApiToken: ApiTokenSchema,
  debug: OptionalBooleanSchema.default(false),
})
