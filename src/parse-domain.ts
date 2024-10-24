import { ParseResultType, fromUrl, parseDomain } from "parse-domain"

const parseHostname = (hostname: string) => parseDomain(fromUrl(hostname))

export const isValidHostname = async (maybeHostname: string) => {
  // https://www.npmjs.com/package/parse-domain
  const parseResult = parseHostname(maybeHostname)

  return parseResult.type === ParseResultType.Listed && parseResult.domain
}

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
