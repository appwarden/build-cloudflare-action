---
"@appwarden/build-cloudflare-action": patch
---

Generate a `pnpm-workspace.yaml` in the generated middleware project so the project approves the build scripts of `esbuild` and `workerd`. The generated project is installed on its own and cannot inherit the consuming repository's `allowBuilds` settings, so `pnpm add wrangler` (run by `cloudflare/wrangler-action`) failed with `ERR_PNPM_IGNORED_BUILDS` on pnpm 11 and later.
