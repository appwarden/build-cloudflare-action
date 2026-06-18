import { promises as dns } from "dns"

/**
 * Known Cloudflare nameserver patterns.
 * Cloudflare nameservers typically follow these patterns:
 * - *.ns.cloudflare.com (e.g., alice.ns.cloudflare.com, bob.ns.cloudflare.com)
 * - ns1.cloudflare.com, ns2.cloudflare.com
 */
const CLOUDFLARE_NS_PATTERNS = [
  /^[a-z0-9-]+\.ns\.cloudflare\.com$/i,
  /^ns[0-9]+\.cloudflare\.com$/i,
]

/**
 * Checks if a nameserver string matches known Cloudflare nameserver patterns.
 *
 * @param nameserver - The nameserver hostname to check
 * @returns true if the nameserver matches a Cloudflare pattern
 */
export function isCloudflareNameserver(nameserver: string): boolean {
  const normalized = nameserver.toLowerCase().trim()
  return CLOUDFLARE_NS_PATTERNS.some((pattern) => pattern.test(normalized))
}

/**
 * Detects if a hostname is using Cloudflare nameservers by performing DNS NS record lookup.
 *
 * @param hostname - The hostname to check (e.g., "example.com", "subdomain.example.com")
 * @returns Promise<boolean> - true if the hostname uses Cloudflare nameservers
 *
 * @example
 * ```typescript
 * const isCloudflare = await hasCloudflareNameservers("example.com")
 * if (isCloudflare) {
 *   console.log("This domain uses Cloudflare nameservers")
 * }
 * ```
 */
export async function hasCloudflareNameservers(
  hostname: string,
): Promise<boolean> {
  try {
    // Extract the root domain from the hostname
    // NS records are typically set at the domain level, not subdomain level
    const rootDomain = extractRootDomain(hostname)

    // Resolve NS records for the root domain
    const nameservers = await dns.resolveNs(rootDomain)

    // Check if any of the nameservers match Cloudflare patterns
    return nameservers.some((ns) => isCloudflareNameserver(ns))
  } catch (error) {
    // If DNS lookup fails, return false
    // This could happen if the domain doesn't exist or DNS is unreachable
    return false
  }
}

/**
 * Extracts the root domain from a hostname.
 * For example:
 * - "example.com" -> "example.com"
 * - "subdomain.example.com" -> "example.com"
 * - "deep.subdomain.example.com" -> "example.com"
 *
 * This is a simple implementation that assumes standard TLDs.
 * For more complex cases (e.g., .co.uk), consider using a library like parse-domain.
 *
 * @param hostname - The hostname to extract the root domain from
 * @returns The root domain
 */
function extractRootDomain(hostname: string): string {
  const parts = hostname.toLowerCase().trim().split(".")

  // If there are 2 or fewer parts, it's already a root domain
  if (parts.length <= 2) {
    return hostname
  }

  // Return the last two parts (domain + TLD)
  return parts.slice(-2).join(".")
}

/**
 * Filters a list of hostnames to only include those using Cloudflare nameservers.
 *
 * @param hostnames - Array of hostnames to filter
 * @returns Promise<string[]> - Array of hostnames that use Cloudflare nameservers
 *
 * @example
 * ```typescript
 * const hostnames = ["cloudflare-site.com", "other-site.com"]
 * const cloudflareHostnames = await filterCloudflareHostnames(hostnames)
 * console.log(cloudflareHostnames) // ["cloudflare-site.com"]
 * ```
 */
export async function filterCloudflareHostnames(
  hostnames: string[],
): Promise<string[]> {
  const results = await Promise.all(
    hostnames.map(async (hostname) => ({
      hostname,
      isCloudflare: await hasCloudflareNameservers(hostname),
    })),
  )

  return results.filter((result) => result.isCloudflare).map((r) => r.hostname)
}
