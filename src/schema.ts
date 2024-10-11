import { z } from "zod"

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
  hostname: z
    .string()
    .refine((val) => !!val, {
      message:
        "Please provide the hostname of your domain (e.g. app.example.com)",
      path: ["hostname"],
    })
    .refine(
      (val) => {
        try {
          new URL(`https://${val}`)
          return true
        } catch (err) {
          return false
        }
      },
      {
        message: "hostname must be a valid domain name. (e.g. app.example.com)",
        path: ["hostname"],
      },
    ),
  lockPageSlug: z.string(),
  cloudflareAccountId: z.string().refine((val) => val.length === 32, {
    message:
      "cloudflareAccountId must be a 32 character string. You can find this in your Cloudflare dashboard url: dash.cloudflare.com/<cloudflareAccountId>",
    path: ["cloudflareAccountId"],
  }),
  debug: OptionalBooleanSchema.default(false),
})
