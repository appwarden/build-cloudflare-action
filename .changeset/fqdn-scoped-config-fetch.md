---
"@appwarden/build-cloudflare-action": patch
---

Scope the middleware configuration request to the requested hostnames with `?fqdn=`, so the action works with a domain-restricted Appwarden API token.

When the `hostnames` input is set, each hostname is now fetched in its own request carrying `?fqdn=`. The API refuses a domain-restricted token on a request that names no domain (`403 DOMAIN_NOT_PERMITTED`), which previously made the action fail for such tokens. When `hostnames` is omitted, the whole account configuration is still fetched in a single request, which only an unrestricted token may read.

Requested hostnames are now canonicalized (lower case, no port, no trailing dot) before use, and a token that is not a bare hostname — carrying a scheme, port, path, query or fragment — is rejected at input validation. Previously such values passed validation and were sent verbatim, so the API's exact `?fqdn=` match silently returned nothing and the hostname was reported as "not found".
