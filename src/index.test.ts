import * as core from "@actions/core"
import { mkdir, readdir, writeFile } from "fs/promises"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { HostnameMiddlewareOptions } from "./templates/generated-config"
import { getMiddlewareOptions } from "./utils"

// Mock dependencies
vi.mock("@actions/core")
vi.mock("fs/promises")
vi.mock("./utils")

// Mock global constants that are injected by tsup
vi.stubGlobal("MIDDLEWARE_VERSION", "1.0.0")

// Import main after mocking globals
const { main } = await import("./index")

describe("index", () => {
  describe("main", () => {
    const mockCore = vi.mocked(core)
    const mockFs = {
      readdir: vi.mocked(readdir),
      mkdir: vi.mocked(mkdir),
      writeFile: vi.mocked(writeFile),
    }
    const mockGetMiddlewareOptions = vi.mocked(getMiddlewareOptions)

    const mockConfig = {
      debug: false,
      hostnames: "app.example.com",
      cloudflareAccountId: "1234567890abcdef1234567890abcdef",
      appwardenApiToken: "test-api-token-1234567890",
    }

    const mockMiddlewareOptions: HostnameMiddlewareOptions = {
      "lock-page-slug": "/maintenance",
      "csp-mode": "enforced",
      "csp-directives": { "default-src": "'self'" },
    }

    beforeEach(() => {
      vi.resetAllMocks()

      // Mock core.getInput to return valid config values
      mockCore.getInput.mockImplementation((name: string) => {
        switch (name) {
          case "debug":
            return "false"
          case "hostnames":
            return mockConfig.hostnames
          case "cloudflare-account-id":
            return mockConfig.cloudflareAccountId
          case "appwarden-api-token":
            return mockConfig.appwardenApiToken
          default:
            return ""
        }
      })

      // Mock successful file system operations
      mockFs.readdir.mockResolvedValue(["test-repo"] as any)
      mockFs.mkdir.mockResolvedValue(undefined)
      mockFs.writeFile.mockResolvedValue(undefined)

      // Mock successful middleware options fetch
      mockGetMiddlewareOptions.mockResolvedValue(mockMiddlewareOptions)
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it("should complete successfully with valid inputs", async () => {
      await main()

      // Verify repository validation
      expect(mockFs.readdir).toHaveBeenCalledWith("..")

      // Verify middleware options fetch (uses first hostname)
      expect(mockGetMiddlewareOptions).toHaveBeenCalledWith(
        "app.example.com",
        mockConfig.appwardenApiToken,
        expect.any(Function),
      )

      // Verify directory creation
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        ".appwarden/generated-middleware",
        {
          recursive: true,
        },
      )

      // Verify file generation
      expect(mockFs.writeFile).toHaveBeenCalledTimes(4)
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        ".appwarden/generated-middleware/package.json",
        expect.stringContaining('"version": "1.0.0"'),
      )
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        ".appwarden/generated-middleware/wrangler.toml",
        expect.any(String),
      )
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        ".appwarden/generated-middleware/app.mjs",
        expect.any(String),
      )
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        ".appwarden/generated-middleware/generated-config.mjs",
        expect.any(String),
      )

      // Verify no failures
      expect(mockCore.setFailed).not.toHaveBeenCalled()
    })

    it("should fail when repository is not found (empty directory)", async () => {
      mockFs.readdir.mockResolvedValue([])

      await main()

      expect(mockCore.setFailed).toHaveBeenCalledWith(
        "Repository not found. Did you forget to include `actions/checkout` in your workflow?",
      )
    })

    it("should fail when repository directory cannot be read", async () => {
      mockFs.readdir.mockRejectedValue(new Error("Permission denied"))

      await main()

      expect(mockCore.setFailed).toHaveBeenCalledWith(
        "Repository not found. Did you forget to include `actions/checkout` in your workflow?",
      )
    })

    it("should fail with invalid hostname", async () => {
      mockCore.getInput.mockImplementation((name: string) => {
        switch (name) {
          case "hostnames":
            return "invalid-hostname"
          case "debug":
            return "false"
          case "cloudflare-account-id":
            return mockConfig.cloudflareAccountId
          case "appwarden-api-token":
            return mockConfig.appwardenApiToken
          default:
            return ""
        }
      })

      await main()

      expect(mockCore.setFailed).toHaveBeenCalledWith(
        expect.stringContaining("hostnames"),
      )
    })

    it("should fail with invalid cloudflare account id", async () => {
      mockCore.getInput.mockImplementation((name: string) => {
        switch (name) {
          case "hostnames":
            return mockConfig.hostnames
          case "debug":
            return "false"
          case "cloudflare-account-id":
            return "invalid-short-id"
          case "appwarden-api-token":
            return mockConfig.appwardenApiToken
          default:
            return ""
        }
      })

      await main()

      expect(mockCore.setFailed).toHaveBeenCalledWith(
        expect.stringContaining("cloudflareAccountId"),
      )
    })

    it("should fail validation with empty appwarden api token", async () => {
      mockCore.getInput.mockImplementation((name: string) => {
        switch (name) {
          case "hostnames":
            return mockConfig.hostnames
          case "debug":
            return "false"
          case "cloudflare-account-id":
            return mockConfig.cloudflareAccountId
          case "appwarden-api-token":
            return ""
          default:
            return ""
        }
      })

      await main()

      // Should fail with validation error for empty token
      expect(mockCore.setFailed).toHaveBeenCalledWith(
        expect.stringContaining("appwardenApiToken"),
      )
    })

    it("should fail validation with too short appwarden api token", async () => {
      mockCore.getInput.mockImplementation((name: string) => {
        switch (name) {
          case "hostnames":
            return mockConfig.hostnames
          case "debug":
            return "false"
          case "cloudflare-account-id":
            return mockConfig.cloudflareAccountId
          case "appwarden-api-token":
            return "short"
          default:
            return ""
        }
      })

      await main()

      // Should fail with validation error for short token
      expect(mockCore.setFailed).toHaveBeenCalledWith(
        expect.stringContaining("too short"),
      )
    })

    it("should handle BAD_AUTH error from middleware options fetch", async () => {
      mockGetMiddlewareOptions.mockRejectedValue(new Error("BAD_AUTH"))

      await main()

      expect(mockCore.setFailed).toHaveBeenCalledWith(
        "Invalid Appwarden API token",
      )
    })

    it("should handle no_domain_configurations error from middleware options fetch", async () => {
      mockGetMiddlewareOptions.mockRejectedValue(
        new Error("no_domain_configurations"),
      )

      await main()

      expect(mockCore.setFailed).toHaveBeenCalledWith(
        `The hostname (example.com) was not found in a [domain configuration file](https://appwarden.io/docs/guides/domain-configuration-management). Please add one for this domain and try again.`,
      )
    })

    it("should handle generic error from middleware options fetch", async () => {
      const errorMessage = "Network error"
      mockGetMiddlewareOptions.mockRejectedValue(new Error(errorMessage))

      await main()

      expect(mockCore.setFailed).toHaveBeenCalledWith(errorMessage)
    })

    it("should handle non-Error thrown from middleware options fetch", async () => {
      mockGetMiddlewareOptions.mockRejectedValue("String error")

      await main()

      expect(mockCore.setFailed).toHaveBeenCalledWith("String error")
    })

    it("should fail when middleware options are undefined", async () => {
      mockGetMiddlewareOptions.mockResolvedValue(undefined)

      await main()

      expect(mockCore.setFailed).toHaveBeenCalledWith(
        `Could not find Appwarden middleware configuration for hostnames: ${mockConfig.hostnames}`,
      )
    })

    it("should enable debug mode when debug input is true", async () => {
      mockCore.getInput.mockImplementation((name: string) => {
        switch (name) {
          case "debug":
            return "true"
          case "hostnames":
            return mockConfig.hostnames
          case "cloudflare-account-id":
            return mockConfig.cloudflareAccountId
          case "appwarden-api-token":
            return mockConfig.appwardenApiToken
          default:
            return ""
        }
      })

      // Spy on console.log to verify debug messages
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {})

      await main()

      // Verify debug messages were logged with categorical prefixes
      expect(consoleSpy).toHaveBeenCalledWith(
        "[repository] Validating repository",
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        "[repository] ✅ Validation complete",
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        "[config] Validating configuration",
      )

      consoleSpy.mockRestore()
    })

    it("should not log debug messages when debug is false", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {})

      await main()

      // Verify no debug messages were logged
      expect(consoleSpy).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })
})
