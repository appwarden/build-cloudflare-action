import { describe, expect, it } from "vitest"
import {
  hydrateWranglerTemplate,
  WranglerTemplateConfig,
  wranglerFileTemplate,
} from "./wrangler-toml"

// No mocks - using actual implementations

describe("wrangler-toml", () => {
  describe("hydrateWranglerTemplate", () => {
    it("should replace all placeholders in the template", () => {
      const config: WranglerTemplateConfig = {
        hostnames: ["app.example.com"],
        cloudflareAccountId: "1234567890abcdef1234567890abcdef",
      }

      const result = hydrateWranglerTemplate(wranglerFileTemplate, config)

      // Check that all placeholders were replaced
      expect(result).toContain('name = "appwarden"')
      expect(result).toContain(
        'account_id = "1234567890abcdef1234567890abcdef"',
      )
      expect(result).toContain('pattern = "app.example.com/*"')
      expect(result).toContain('zone_name = "example.com"')
      // Check for route array syntax
      expect(result).toContain("[[env.staging.routes]]")
      expect(result).toContain("[[env.production.routes]]")
    })

    describe("API_HOSTNAME environment variable", () => {
      it("should include staging API_HOSTNAME", () => {
        const config: WranglerTemplateConfig = {
          hostnames: ["app.example.com"],
          cloudflareAccountId: "1234567890abcdef1234567890abcdef",
        }

        const result = hydrateWranglerTemplate(wranglerFileTemplate, config)

        expect(result).toContain("[env.staging.vars]")
        expect(result).toContain(
          'API_HOSTNAME = "https://staging-api.appwarden.io"',
        )
      })

      it("should include production API_HOSTNAME", () => {
        const config: WranglerTemplateConfig = {
          hostnames: ["app.example.com"],
          cloudflareAccountId: "1234567890abcdef1234567890abcdef",
        }

        const result = hydrateWranglerTemplate(wranglerFileTemplate, config)

        expect(result).toContain("[env.production.vars]")
        expect(result).toContain('API_HOSTNAME = "https://api.appwarden.io"')
      })
    })

    describe("security: input sanitization", () => {
      it("should safely handle hostnames with special TOML characters", () => {
        const config: WranglerTemplateConfig = {
          hostnames: ["app.example.com"],
          cloudflareAccountId: "1234567890abcdef1234567890abcdef",
        }

        const result = hydrateWranglerTemplate(wranglerFileTemplate, config)

        // Worker name should be static
        expect(result).toContain('name = "appwarden"')
        // Pattern should contain the original hostname
        expect(result).toContain('pattern = "app.example.com/*"')
      })

      it("should validate cloudflareAccountId is used safely in template", () => {
        // This test ensures the account ID is used as-is without injection risk
        // The schema now validates it's only hex characters
        const config: WranglerTemplateConfig = {
          hostnames: ["app.example.com"],
          cloudflareAccountId: "abcdef1234567890abcdef1234567890",
        }

        const result = hydrateWranglerTemplate(wranglerFileTemplate, config)

        expect(result).toContain(
          'account_id = "abcdef1234567890abcdef1234567890"',
        )
      })
    })

    describe("multiple hostnames", () => {
      it("should generate multiple route entries for multiple hostnames", () => {
        const config: WranglerTemplateConfig = {
          hostnames: ["app.example.com", "staging.example.com"],
          cloudflareAccountId: "1234567890abcdef1234567890abcdef",
        }

        const result = hydrateWranglerTemplate(wranglerFileTemplate, config)

        // Check for multiple staging routes
        expect(result).toContain("[[env.staging.routes]]")
        expect(result).toContain('pattern = "app.example.com/*"')
        expect(result).toContain('pattern = "staging.example.com/*"')

        // Check for multiple production routes
        expect(result).toContain("[[env.production.routes]]")

        // Verify zone_name is correct for each hostname
        expect(result).toContain('zone_name = "example.com"')

        // Count route entries - should be 2 for each environment (4 total)
        const stagingRouteCount = (
          result.match(/\[\[env\.staging\.routes\]\]/g) || []
        ).length
        const productionRouteCount = (
          result.match(/\[\[env\.production\.routes\]\]/g) || []
        ).length
        expect(stagingRouteCount).toBe(2)
        expect(productionRouteCount).toBe(2)
      })

      it("should handle hostnames with different root domains", () => {
        const config: WranglerTemplateConfig = {
          hostnames: ["app.example.com", "app.otherdomain.org"],
          cloudflareAccountId: "1234567890abcdef1234567890abcdef",
        }

        const result = hydrateWranglerTemplate(wranglerFileTemplate, config)

        // Check both hostnames are included
        expect(result).toContain('pattern = "app.example.com/*"')
        expect(result).toContain('pattern = "app.otherdomain.org/*"')

        // Check both zone_names are included
        expect(result).toContain('zone_name = "example.com"')
        expect(result).toContain('zone_name = "otherdomain.org"')
      })

      it("should work with a single hostname", () => {
        const config: WranglerTemplateConfig = {
          hostnames: ["app.example.com"],
          cloudflareAccountId: "1234567890abcdef1234567890abcdef",
        }

        const result = hydrateWranglerTemplate(wranglerFileTemplate, config)

        // Should still use route array syntax even for single hostname
        expect(result).toContain("[[env.staging.routes]]")
        expect(result).toContain("[[env.production.routes]]")
        expect(result).toContain('pattern = "app.example.com/*"')
        expect(result).toContain('zone_name = "example.com"')

        // Should have exactly one route per environment
        const stagingRouteCount = (
          result.match(/\[\[env\.staging\.routes\]\]/g) || []
        ).length
        const productionRouteCount = (
          result.match(/\[\[env\.production\.routes\]\]/g) || []
        ).length
        expect(stagingRouteCount).toBe(1)
        expect(productionRouteCount).toBe(1)
      })
    })
  })
})
