import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { HostnameMiddlewareOptions } from "./templates/generated-config"
import { getMiddlewareOptions } from "./utils"

// Mock global fetch
vi.stubGlobal("fetch", vi.fn())
// Mock APPWARDEN_API_HOSTNAME that's injected by tsup
vi.stubGlobal("APPWARDEN_API_HOSTNAME", "https://bot-gateway.appwarden.io")

describe("utils", () => {
  describe("getMiddlewareOptions", () => {
    const mockFetch = vi.fn()
    const mockApiToken = "mock-api-token"
    const mockMiddlewareOptions: HostnameMiddlewareOptions = {
      "lock-page-slug": "/test-maintenance",
      "csp-mode": "enforced",
      "csp-directives": { "default-src": "'self'" },
    }

    beforeEach(() => {
      // Reset mocks
      vi.resetAllMocks()

      // Setup global fetch mock
      global.fetch = mockFetch

      // Default successful response - API returns url in each config item
      mockFetch.mockResolvedValue({
        json: async () => ({
          content: [
            { url: "test.example.com", options: mockMiddlewareOptions },
          ],
        }),
        headers: {
          get: () => "application/json",
        },
        status: 200,
      })
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it("should fetch middleware options successfully", async () => {
      const result = await getMiddlewareOptions(mockApiToken)

      // Verify fetch was called with the correct URL and headers
      expect(mockFetch).toHaveBeenCalledWith(expect.any(URL), {
        headers: { Authorization: mockApiToken },
      })

      // Verify the URL points to the appwarden/config endpoint without hostname filter
      const fetchUrl = mockFetch.mock.calls[0][0].toString()
      expect(fetchUrl).toContain("/v1/appwarden/config")

      // Verify the result is a Map with the expected hostname and options
      expect(result).toBeInstanceOf(Map)
      expect(result.get("test.example.com")).toEqual(mockMiddlewareOptions)
    })

    it("should return map with multiple hostnames when API returns multiple configs", async () => {
      const secondHostnameOptions: HostnameMiddlewareOptions = {
        "lock-page-slug": "/other-maintenance",
        "csp-mode": "report-only",
      }

      mockFetch.mockResolvedValue({
        json: async () => ({
          content: [
            { url: "test.example.com", options: mockMiddlewareOptions },
            { url: "staging.example.com", options: secondHostnameOptions },
          ],
        }),
        headers: {
          get: () => "application/json",
        },
        status: 200,
      })

      const result = await getMiddlewareOptions(mockApiToken)

      expect(result).toBeInstanceOf(Map)
      expect(result.size).toBe(2)
      expect(result.get("test.example.com")).toEqual(mockMiddlewareOptions)
      expect(result.get("staging.example.com")).toEqual(secondHostnameOptions)
    })

    it("should throw BAD_AUTH error when status is 401", async () => {
      // Mock fetch to return 401 status
      mockFetch.mockResolvedValue({
        status: 401,
        headers: {
          get: () => "application/json",
        },
        json: async () => ({}),
      })

      await expect(getMiddlewareOptions(mockApiToken)).rejects.toThrow(
        "BAD_AUTH",
      )
    })

    it("should throw BAD_AUTH error when status is 403", async () => {
      // Mock fetch to return 403 status
      mockFetch.mockResolvedValue({
        status: 403,
        headers: {
          get: () => "application/json",
        },
        json: async () => ({}),
      })

      await expect(getMiddlewareOptions(mockApiToken)).rejects.toThrow(
        "BAD_AUTH",
      )
    })

    // The implementation throws the custom error message if one is provided
    it("should throw custom error message when API returns error", async () => {
      // Mock fetch to return 403 with custom error message
      mockFetch.mockResolvedValue({
        status: 403,
        headers: {
          get: () => "application/json",
        },
        json: async () => ({
          error: { message: "Custom API error" },
        }),
      })

      await expect(getMiddlewareOptions(mockApiToken)).rejects.toThrow(
        "Custom API error",
      )
    })

    it("should return empty map when no middleware options are found", async () => {
      // Mock fetch to return empty content
      mockFetch.mockResolvedValue({
        json: async () => ({
          content: [],
        }),
        headers: {
          get: () => "application/json",
        },
        status: 200,
      })

      const result = await getMiddlewareOptions(mockApiToken)
      expect(result).toBeInstanceOf(Map)
      expect(result.size).toBe(0)
    })

    it("should fetch each requested hostname with a fqdn query parameter", async () => {
      mockFetch.mockImplementation(async (url: URL) => {
        const fqdn = url.searchParams.get("fqdn")
        return {
          json: async () => ({
            content: [{ url: fqdn, options: mockMiddlewareOptions }],
          }),
          headers: {
            get: () => "application/json",
          },
          status: 200,
        }
      })

      const result = await getMiddlewareOptions(mockApiToken, undefined, [
        "app.example.com",
        "staging.example.com",
      ])

      // One request per hostname, each scoped with `?fqdn=` so a
      // domain-restricted token is permitted to read it.
      expect(mockFetch).toHaveBeenCalledTimes(2)
      const requestedUrls = mockFetch.mock.calls.map((call) =>
        call[0].toString(),
      )
      expect(requestedUrls).toContain(
        "https://bot-gateway.appwarden.io/v1/appwarden/config?fqdn=app.example.com",
      )
      expect(requestedUrls).toContain(
        "https://bot-gateway.appwarden.io/v1/appwarden/config?fqdn=staging.example.com",
      )

      expect(result.size).toBe(2)
      expect(result.get("app.example.com")).toEqual(mockMiddlewareOptions)
      expect(result.get("staging.example.com")).toEqual(mockMiddlewareOptions)
    })

    it("should not set a fqdn query parameter when no hostnames are requested", async () => {
      await getMiddlewareOptions(mockApiToken)

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const requestedUrl = mockFetch.mock.calls[0][0].toString()
      expect(requestedUrl).not.toContain("fqdn")
    })

    it("should surface the API error when a requested hostname is refused", async () => {
      mockFetch.mockResolvedValue({
        status: 403,
        headers: {
          get: () => "application/json",
        },
        json: async () => ({
          error: {
            message:
              "Access denied: this token is not permitted to act on 'app.example.com'",
            code: "DOMAIN_NOT_PERMITTED",
          },
        }),
      })

      await expect(
        getMiddlewareOptions(mockApiToken, undefined, ["app.example.com"]),
      ).rejects.toThrow("DOMAIN_NOT_PERMITTED")
    })
  })
})
