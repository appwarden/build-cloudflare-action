---
"@appwarden/build-cloudflare-action": patch
---

Harden the pinned `@appwarden/middleware` version handling.

The version bundled into `dist/` is pinned in `.middleware-version`, and the build now requires that pin to be an exact semver version: a typo (`3.17`, `v3.17.15`, a stray token) or a missing file fails the build with a clear error instead of silently resolving a version over the network. The scheduled middleware-sync workflow also strips `\r` when reading the pin and only treats a pin _behind_ npm as drift, so a CRLF checkout or a pin ahead of npm no longer opens a spurious sync pull request.
