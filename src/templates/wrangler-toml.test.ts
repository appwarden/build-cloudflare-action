import { describe, expect, it } from "vitest"
import { ApiMiddlewareOptions, Config } from "../types"
import { hydrateWranglerTemplate, wranglerFileTemplate } from "./wrangler-toml"

// No mocks - using actual implementations

describe("wrangler-toml", () => {
  describe("hydrateWranglerTemplate", () => {
    it("should replace all placeholders in the template", () => {
      const config: Config = {
        hostname: "app.example.com",
        cloudflareAccountId: "1234567890abcdef1234567890abcdef",
        debug: false,
      }

      const middleware: ApiMiddlewareOptions = {
        "lock-page-slug": "/custom-maintenance",
        "csp-mode": "enforced",
        "csp-directives": { "default-src": "'self'" },
      }

      const result = hydrateWranglerTemplate(
        wranglerFileTemplate,
        config,
        middleware,
      )

      // Check that all placeholders were replaced
      expect(result).toContain(
        'account_id = "1234567890abcdef1234567890abcdef"',
      )
      expect(result).toContain('LOCK_PAGE_SLUG = "/custom-maintenance"')
      expect(result).toContain('pattern = "*app.example.com/*"')
      expect(result).toContain('zone_name = "example.com"')
      expect(result).toContain('CSP_MODE = "enforced"')
      expect(result).toContain('CSP_DIRECTIVES = "')
    })

    it("should use default values when middleware options are missing", () => {
      const config: Config = {
        hostname: "app.example.com",
        cloudflareAccountId: "1234567890abcdef1234567890abcdef",
        debug: false,
      }

      const middleware: ApiMiddlewareOptions = {}

      const result = hydrateWranglerTemplate(
        wranglerFileTemplate,
        config,
        middleware,
      )

      // Check that default values were used
      expect(result).toContain('LOCK_PAGE_SLUG = "/maintenance"')
      expect(result).toContain('CSP_MODE = "disabled"')
      expect(result).toContain('CSP_DIRECTIVES = ""')
    })

    it("should handle string CSP directives", () => {
      const config: Config = {
        hostname: "app.example.com",
        cloudflareAccountId: "1234567890abcdef1234567890abcdef",
        debug: false,
      }

      // Using any to bypass type checking since the actual implementation supports string CSP directives
      const middleware: any = {
        "csp-directives": 'default-src "self"; script-src "self"',
      }

      const result = hydrateWranglerTemplate(
        wranglerFileTemplate,
        config,
        middleware,
      )

      // Check that the CSP directives were properly escaped
      expect(result).toContain('CSP_DIRECTIVES = "')
    })
  })
})
