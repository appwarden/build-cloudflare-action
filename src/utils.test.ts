import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ApiMiddlewareOptions } from "./types"
import { ensureProtocol, getMiddlewareOptions, ignoreProtocol } from "./utils"

// Mock global fetch
vi.stubGlobal("fetch", vi.fn())
// Mock API_HOSTNAME that's injected by tsup
vi.stubGlobal("API_HOSTNAME", "bot-gateway.appwarden.io")

describe("utils", () => {
  describe("ensureProtocol", () => {
    it("should add https:// to a domain without protocol", () => {
      expect(ensureProtocol("example.com")).toBe("https://example.com")
    })

    it("should not modify a domain with http:// protocol", () => {
      expect(ensureProtocol("http://example.com")).toBe("http://example.com")
    })

    it("should not modify a domain with https:// protocol", () => {
      expect(ensureProtocol("https://example.com")).toBe("https://example.com")
    })
  })

  describe("ignoreProtocol", () => {
    it("should remove http:// from a domain", () => {
      expect(ignoreProtocol("http://example.com")).toBe("example.com")
    })

    it("should remove https:// from a domain", () => {
      expect(ignoreProtocol("https://example.com")).toBe("example.com")
    })

    it("should not modify a domain without protocol", () => {
      expect(ignoreProtocol("example.com")).toBe("example.com")
    })
  })

  describe("getMiddlewareOptions", () => {
    const mockFetch = vi.fn()
    const mockHostname = "test.example.com"
    const mockApiToken = "mock-api-token"
    const mockMiddlewareOptions: ApiMiddlewareOptions = {
      debug: false,
      "lock-page-slug": "/test-maintenance",
      "csp-mode": "enforced",
      "csp-directives": { "default-src": "'self'" },
    }

    beforeEach(() => {
      // Reset mocks
      vi.resetAllMocks()

      // Setup global fetch mock
      global.fetch = mockFetch

      // Default successful response
      mockFetch.mockResolvedValue({
        json: async () => ({
          content: [{ options: mockMiddlewareOptions }],
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
      const result = await getMiddlewareOptions(mockHostname, mockApiToken)

      // Verify fetch was called with the correct URL and headers
      expect(mockFetch).toHaveBeenCalledWith(expect.any(URL), {
        headers: { Authorization: mockApiToken },
      })

      // Verify the URL contains the correct hostname
      const fetchUrl = mockFetch.mock.calls[0][0].toString()
      expect(fetchUrl).toContain(`monitorHostname=${mockHostname}`)

      // Verify the result matches the mock middleware options
      expect(result).toEqual(mockMiddlewareOptions)
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

      await expect(
        getMiddlewareOptions(mockHostname, mockApiToken),
      ).rejects.toThrow("BAD_AUTH")
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

      await expect(
        getMiddlewareOptions(mockHostname, mockApiToken),
      ).rejects.toThrow("BAD_AUTH")
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

      await expect(
        getMiddlewareOptions(mockHostname, mockApiToken),
      ).rejects.toThrow("Custom API error")
    })

    it("should return undefined when no middleware options are found", async () => {
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

      const result = await getMiddlewareOptions(mockHostname, mockApiToken)
      expect(result).toBeUndefined()
    })
  })
})
