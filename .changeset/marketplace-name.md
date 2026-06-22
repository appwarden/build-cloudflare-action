---
"@appwarden/build-cloudflare-action": patch
---

Fix action name to comply with GitHub Marketplace naming requirements

The action name in `action.yml` previously contained `@` and `/` characters (`@appwarden/build-cloudflare-action`), which are not allowed by the GitHub Marketplace. This changes the name to a marketplace-friendly format so the action can be published.
