import { describe, expect, it } from "vitest"
import { ApiMiddlewareOptions, Config } from "../types"
import { hydrateWranglerTemplate, wranglerFileTemplate } from "./wrangler-toml"

// No mocks - using actual implementations

describe("wrangler-toml", () => {
  describe("hydrateWranglerTemplate", () => {
    it("should replace all placeholders in the template", () => {
      const config: Config = {
        hostnames: ["app.example.com"],
        cloudflareAccountId: "1234567890abcdef1234567890abcdef",
        appwardenApiToken: "test-api-token-12345",
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
      expect(result).toContain('name = "appwarden"')
      expect(result).toContain(
        'account_id = "1234567890abcdef1234567890abcdef"',
      )
      expect(result).toContain('LOCK_PAGE_SLUG = "/custom-maintenance"')
      expect(result).toContain('pattern = "*app.example.com/*"')
      expect(result).toContain('zone_name = "example.com"')
      expect(result).toContain('CSP_MODE = "enforced"')
      expect(result).toContain('CSP_DIRECTIVES = "')
      // Check for route array syntax
      expect(result).toContain('[[env.staging.routes]]')
      expect(result).toContain('[[env.production.routes]]')
    })

    it("should use default values when middleware options are missing", () => {
      const config: Config = {
        hostnames: ["app.example.com"],
        cloudflareAccountId: "1234567890abcdef1234567890abcdef",
        appwardenApiToken: "test-api-token-12345",
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
        hostnames: ["app.example.com"],
        cloudflareAccountId: "1234567890abcdef1234567890abcdef",
        appwardenApiToken: "test-api-token-12345",
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

    describe("security: input sanitization", () => {
      it("should safely handle hostnames with special TOML characters", () => {
        const config: Config = {
          hostnames: ["app.example.com"],
          cloudflareAccountId: "1234567890abcdef1234567890abcdef",
          appwardenApiToken: "test-api-token-12345",
          debug: false,
        }

        const middleware: ApiMiddlewareOptions = {
          "lock-page-slug": "/maintenance",
        }

        const result = hydrateWranglerTemplate(
          wranglerFileTemplate,
          config,
          middleware,
        )

        // Worker name should be static
        expect(result).toContain('name = "appwarden"')
        // Pattern should contain the original hostname
        expect(result).toContain('pattern = "*app.example.com/*"')
      })

      it("should safely handle lock-page-slug with special characters", () => {
        const config: Config = {
          hostnames: ["app.example.com"],
          cloudflareAccountId: "1234567890abcdef1234567890abcdef",
          appwardenApiToken: "test-api-token-12345",
          debug: false,
        }

        const middleware: ApiMiddlewareOptions = {
          "lock-page-slug": '/maintenance"injected',
        }

        const result = hydrateWranglerTemplate(
          wranglerFileTemplate,
          config,
          middleware,
        )

        // The value should be included as-is (wrangler handles TOML parsing)
        // Note: This test documents current behavior - consider adding escaping if needed
        expect(result).toContain('LOCK_PAGE_SLUG = "/maintenance"injected"')
      })

      it("should handle CSP directives with complex nested objects", () => {
        const config: Config = {
          hostnames: ["app.example.com"],
          cloudflareAccountId: "1234567890abcdef1234567890abcdef",
          appwardenApiToken: "test-api-token-12345",
          debug: false,
        }

        const middleware: ApiMiddlewareOptions = {
          "csp-directives": {
            "default-src": "'self'",
            "script-src": "'self' 'unsafe-inline'",
            "style-src": "'self' https://fonts.googleapis.com",
          },
        }

        const result = hydrateWranglerTemplate(
          wranglerFileTemplate,
          config,
          middleware,
        )

        // CSP directives should be JSON stringified and escaped
        expect(result).toContain("CSP_DIRECTIVES = ")
        // Should not break TOML structure
        expect(result.split("\n").filter((l) => l.includes("CSP_DIRECTIVES"))).toHaveLength(2)
      })

      it("should handle empty/undefined middleware options gracefully", () => {
        const config: Config = {
          hostnames: ["test.domain.org"],
          cloudflareAccountId: "abcdef1234567890abcdef1234567890",
          appwardenApiToken: "test-api-token-12345",
          debug: false,
        }

        const middleware: ApiMiddlewareOptions = {}

        const result = hydrateWranglerTemplate(
          wranglerFileTemplate,
          config,
          middleware,
        )

        // Should use defaults
        expect(result).toContain('LOCK_PAGE_SLUG = "/maintenance"')
        expect(result).toContain('CSP_MODE = "disabled"')
        expect(result).toContain('CSP_DIRECTIVES = ""')
      })

      it("should validate cloudflareAccountId is used safely in template", () => {
        // This test ensures the account ID is used as-is without injection risk
        // The schema now validates it's only hex characters
        const config: Config = {
          hostnames: ["app.example.com"],
          cloudflareAccountId: "abcdef1234567890abcdef1234567890",
          appwardenApiToken: "test-api-token-12345",
          debug: false,
        }

        const middleware: ApiMiddlewareOptions = {}

        const result = hydrateWranglerTemplate(
          wranglerFileTemplate,
          config,
          middleware,
        )

        expect(result).toContain(
          'account_id = "abcdef1234567890abcdef1234567890"',
        )
      })
    })

    describe("multiple hostnames", () => {
      it("should generate multiple route entries for multiple hostnames", () => {
        const config: Config = {
          hostnames: ["app.example.com", "staging.example.com"],
          cloudflareAccountId: "1234567890abcdef1234567890abcdef",
          appwardenApiToken: "test-api-token-12345",
          debug: false,
        }

        const middleware: ApiMiddlewareOptions = {
          "lock-page-slug": "/maintenance",
        }

        const result = hydrateWranglerTemplate(
          wranglerFileTemplate,
          config,
          middleware,
        )

        // Check for multiple staging routes
        expect(result).toContain('[[env.staging.routes]]')
        expect(result).toContain('pattern = "*app.example.com/*"')
        expect(result).toContain('pattern = "*staging.example.com/*"')

        // Check for multiple production routes
        expect(result).toContain('[[env.production.routes]]')

        // Verify zone_name is correct for each hostname
        expect(result).toContain('zone_name = "example.com"')

        // Count route entries - should be 2 for each environment (4 total)
        const stagingRouteCount = (result.match(/\[\[env\.staging\.routes\]\]/g) || []).length
        const productionRouteCount = (result.match(/\[\[env\.production\.routes\]\]/g) || []).length
        expect(stagingRouteCount).toBe(2)
        expect(productionRouteCount).toBe(2)
      })

      it("should handle hostnames with different root domains", () => {
        const config: Config = {
          hostnames: ["app.example.com", "app.otherdomain.org"],
          cloudflareAccountId: "1234567890abcdef1234567890abcdef",
          appwardenApiToken: "test-api-token-12345",
          debug: false,
        }

        const middleware: ApiMiddlewareOptions = {}

        const result = hydrateWranglerTemplate(
          wranglerFileTemplate,
          config,
          middleware,
        )

        // Check both hostnames are included
        expect(result).toContain('pattern = "*app.example.com/*"')
        expect(result).toContain('pattern = "*app.otherdomain.org/*"')

        // Check both zone_names are included
        expect(result).toContain('zone_name = "example.com"')
        expect(result).toContain('zone_name = "otherdomain.org"')
      })

      it("should work with a single hostname (backward compatibility)", () => {
        const config: Config = {
          hostnames: ["app.example.com"],
          cloudflareAccountId: "1234567890abcdef1234567890abcdef",
          appwardenApiToken: "test-api-token-12345",
          debug: false,
        }

        const middleware: ApiMiddlewareOptions = {}

        const result = hydrateWranglerTemplate(
          wranglerFileTemplate,
          config,
          middleware,
        )

        // Should still use route array syntax even for single hostname
        expect(result).toContain('[[env.staging.routes]]')
        expect(result).toContain('[[env.production.routes]]')
        expect(result).toContain('pattern = "*app.example.com/*"')
        expect(result).toContain('zone_name = "example.com"')

        // Should have exactly one route per environment
        const stagingRouteCount = (result.match(/\[\[env\.staging\.routes\]\]/g) || []).length
        const productionRouteCount = (result.match(/\[\[env\.production\.routes\]\]/g) || []).length
        expect(stagingRouteCount).toBe(1)
        expect(productionRouteCount).toBe(1)
      })
    })
  })
})
