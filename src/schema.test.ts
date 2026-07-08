import { describe, expect, it } from "vitest"
import { ConfigSchema } from "./schema"

describe("schema", () => {
  const validConfig = {
    cloudflareAccountId: "1234567890abcdef1234567890abcdef",
    appwardenApiToken: "test-api-token-1234567890",
    debug: false,
  }

  describe("hostnames", () => {
    it("should accept undefined hostnames", async () => {
      const result = await ConfigSchema.safeParseAsync({
        ...validConfig,
        hostnames: undefined,
      })

      expect(result.success).toBe(true)
      expect(result.data?.hostnames).toBeUndefined()
    })

    it("should accept empty string hostnames as undefined", async () => {
      const result = await ConfigSchema.safeParseAsync({
        ...validConfig,
        hostnames: "",
      })

      expect(result.success).toBe(true)
      expect(result.data?.hostnames).toBeUndefined()
    })

    it("should parse a single hostname", async () => {
      const result = await ConfigSchema.safeParseAsync({
        ...validConfig,
        hostnames: "app.example.com",
      })

      expect(result.success).toBe(true)
      expect(result.data?.hostnames).toEqual(["app.example.com"])
    })

    it("should parse comma-separated hostnames with whitespace", async () => {
      const result = await ConfigSchema.safeParseAsync({
        ...validConfig,
        hostnames: "  app.example.com , staging.example.com  ",
      })

      expect(result.success).toBe(true)
      expect(result.data?.hostnames).toEqual([
        "app.example.com",
        "staging.example.com",
      ])
    })

    it("should reject invalid hostnames", async () => {
      const result = await ConfigSchema.safeParseAsync({
        ...validConfig,
        hostnames: "not a valid hostname",
      })

      expect(result.success).toBe(false)
    })

    it("should reject when at least one hostname is invalid", async () => {
      const result = await ConfigSchema.safeParseAsync({
        ...validConfig,
        hostnames: "app.example.com,not valid",
      })

      expect(result.success).toBe(false)
    })
  })
})
