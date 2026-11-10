import { ParseResultType, fromUrl, parseDomain } from "parse-domain"

const parseHostname = (hostname: string) => parseDomain(fromUrl(hostname))

/**
 * Returns the canonical form of a bare hostname — lower case, no port, no
 * trailing dot — or `null` when the input is not one.
 *
 * The value is used verbatim as the API's `?fqdn=` query parameter, which the
 * API matches exactly, so anything beyond a bare hostname (scheme, port, path,
 * query, fragment, userinfo, leading `//`) is rejected rather than sent on.
 * Case and a trailing dot are tolerated and normalized away.
 */
export const canonicalizeHostname = (maybeHostname: string): string | null => {
  const parseResult = parseHostname(maybeHostname)

  if (parseResult.type !== ParseResultType.Listed || !parseResult.domain) {
    return null
  }

  const { subDomains, domain, topLevelDomains } = parseResult
  const canonical = [...subDomains, domain, ...topLevelDomains]
    .join(".")
    .toLowerCase()

  const bare = maybeHostname.trim().toLowerCase().replace(/\.$/, "")

  return bare === canonical ? canonical : null
}

// https://www.npmjs.com/package/parse-domain
export const isValidHostname = async (maybeHostname: string) =>
  canonicalizeHostname(maybeHostname) !== null

export const getDomainMetadata = (thing: string) => {
  const parseResult = parseHostname(thing)

  if (parseResult.type === ParseResultType.Listed) {
    // const { subDomains, domain, topLevelDomains } = parseResult
    return parseResult
  }

  return false
}

export const getRootDomain = (hostname: string) => {
  const listed = getDomainMetadata(hostname)
  if (!listed) {
    return hostname
  }

  return listed.domain + "." + listed.topLevelDomains.join(".")
}
