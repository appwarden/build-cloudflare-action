import { z } from "zod"
import { canonicalizeHostname } from "./parse-domain"

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

// Optional comma-separated list of hostnames to filter which domains are built.
// Each hostname is canonicalized (lower case, no port, no trailing dot) so it
// can be used verbatim as the API's `?fqdn=` query parameter, and a token that
// is not a bare hostname is rejected.
const HostnamesSchema = z
  .union([z.string(), z.undefined()])
  .transform((val) => {
    if (val === undefined || val.trim() === "") {
      return undefined
    }

    const hostnames = val
      .split(",")
      .map((h) => h.trim())
      .filter((h) => h.length > 0)

    return hostnames.length > 0 ? hostnames : undefined
  })
  .transform((hostnames) => hostnames?.map(canonicalizeHostname))
  .refine(
    (hostnames) =>
      hostnames === undefined || hostnames.every((h) => h !== null),
    {
      message:
        "All hostnames must be valid domain names. (e.g. `app.example.com,staging.example.com`)",
    },
  )
  // The refine above guarantees no nulls remain.
  .transform((hostnames) => hostnames as string[] | undefined)

export const ConfigSchema = z.object({
  cloudflareAccountId: CloudflareAccountIdSchema,
  appwardenApiToken: ApiTokenSchema,
  debug: OptionalBooleanSchema.default(false),
  hostnames: HostnamesSchema.optional(),
})
