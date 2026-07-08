---
"@appwarden/build-cloudflare-action": minor
---

Add optional `hostnames` input to filter which configured domains are built. When provided, only the requested hostnames are included in the generated middleware. Hostnames not found in the domain configuration are skipped with a warning.
