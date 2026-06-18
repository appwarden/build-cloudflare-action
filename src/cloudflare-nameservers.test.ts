import { promises as dns } from "dns"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  filterCloudflareHostnames,
  hasCloudflareNameservers,
  isCloudflareNameserver,
} from "./cloudflare-nameservers"

// Mock the dns module
vi.mock("dns", () => ({
  promises: {
    resolveNs: vi.fn(),
  },
}))

describe("cloudflare-nameservers", () => {
  describe("isCloudflareNameserver", () => {
    it("should return true for standard Cloudflare nameservers", () => {
      expect(isCloudflareNameserver("alice.ns.cloudflare.com")).toBe(true)
      expect(isCloudflareNameserver("bob.ns.cloudflare.com")).toBe(true)
      expect(isCloudflareNameserver("aron.ns.cloudflare.com")).toBe(true)
      expect(isCloudflareNameserver("peyton.ns.cloudflare.com")).toBe(true)
    })

    it("should return true for numbered Cloudflare nameservers", () => {
      expect(isCloudflareNameserver("ns1.cloudflare.com")).toBe(true)
      expect(isCloudflareNameserver("ns2.cloudflare.com")).toBe(true)
      expect(isCloudflareNameserver("ns3.cloudflare.com")).toBe(true)
    })

    it("should be case-insensitive", () => {
      expect(isCloudflareNameserver("ALICE.NS.CLOUDFLARE.COM")).toBe(true)
      expect(isCloudflareNameserver("Alice.Ns.Cloudflare.Com")).toBe(true)
      expect(isCloudflareNameserver("NS1.CLOUDFLARE.COM")).toBe(true)
    })

    it("should handle whitespace", () => {
      expect(isCloudflareNameserver("  alice.ns.cloudflare.com  ")).toBe(true)
      expect(isCloudflareNameserver("\talice.ns.cloudflare.com\n")).toBe(true)
    })

    it("should return false for non-Cloudflare nameservers", () => {
      expect(isCloudflareNameserver("ns1.google.com")).toBe(false)
      expect(isCloudflareNameserver("ns1.example.com")).toBe(false)
      expect(isCloudflareNameserver("dns1.registrar.com")).toBe(false)
    })

    it("should return false for invalid patterns", () => {
      expect(isCloudflareNameserver("cloudflare.com")).toBe(false)
      expect(isCloudflareNameserver("ns.cloudflare.com")).toBe(false)
      expect(isCloudflareNameserver("alice.cloudflare.com")).toBe(false)
    })
  })

  describe("hasCloudflareNameservers", () => {
    const mockResolveNs = vi.mocked(dns.resolveNs)

    beforeEach(() => {
      mockResolveNs.mockReset()
    })

    afterEach(() => {
      vi.clearAllMocks()
    })

    it("should return true when domain uses Cloudflare nameservers", async () => {
      mockResolveNs.mockResolvedValue([
        "alice.ns.cloudflare.com",
        "bob.ns.cloudflare.com",
      ])

      const result = await hasCloudflareNameservers("example.com")

      expect(result).toBe(true)
      expect(mockResolveNs).toHaveBeenCalledWith("example.com")
    })

    it("should return true when at least one nameserver is Cloudflare", async () => {
      mockResolveNs.mockResolvedValue([
        "alice.ns.cloudflare.com",
        "ns1.otherprovider.com",
      ])

      const result = await hasCloudflareNameservers("example.com")

      expect(result).toBe(true)
    })

    it("should return false when domain uses non-Cloudflare nameservers", async () => {
      mockResolveNs.mockResolvedValue(["ns1.google.com", "ns2.google.com"])

      const result = await hasCloudflareNameservers("example.com")

      expect(result).toBe(false)
    })

    it("should extract root domain from subdomain", async () => {
      mockResolveNs.mockResolvedValue([
        "alice.ns.cloudflare.com",
        "bob.ns.cloudflare.com",
      ])

      await hasCloudflareNameservers("subdomain.example.com")

      expect(mockResolveNs).toHaveBeenCalledWith("example.com")
    })

    it("should extract root domain from deep subdomain", async () => {
      mockResolveNs.mockResolvedValue([
        "alice.ns.cloudflare.com",
        "bob.ns.cloudflare.com",
      ])

      await hasCloudflareNameservers("deep.subdomain.example.com")

      expect(mockResolveNs).toHaveBeenCalledWith("example.com")
    })

    it("should return false when DNS lookup fails", async () => {
      mockResolveNs.mockRejectedValue(new Error("ENOTFOUND"))

      const result = await hasCloudflareNameservers("nonexistent.com")

      expect(result).toBe(false)
    })

    it("should return false when DNS times out", async () => {
      mockResolveNs.mockRejectedValue(new Error("ETIMEDOUT"))

      const result = await hasCloudflareNameservers("timeout.com")

      expect(result).toBe(false)
    })
  })

  describe("filterCloudflareHostnames", () => {
    const mockResolveNs = vi.mocked(dns.resolveNs)

    beforeEach(() => {
      mockResolveNs.mockReset()
    })

    afterEach(() => {
      vi.clearAllMocks()
    })

    it("should filter out non-Cloudflare hostnames", async () => {
      mockResolveNs.mockImplementation(async (domain: string) => {
        if (domain === "appwarden.cc" || domain === "appwarden.online") {
          return ["alice.ns.cloudflare.com", "bob.ns.cloudflare.com"]
        }
        return ["ns1.google.com", "ns2.google.com"]
      })

      const hostnames = ["appwarden.cc", "appwarden.online", "other-site.com"]
      const result = await filterCloudflareHostnames(hostnames)

      expect(result).toEqual(["appwarden.cc", "appwarden.online"])
    })
  })
})
