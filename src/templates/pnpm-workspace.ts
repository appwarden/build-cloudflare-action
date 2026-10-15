/**
 * Build-script approvals for the generated middleware project.
 *
 * The generated project is installed on its own: it is not a project of the
 * consuming repository's workspace, so it cannot inherit that workspace's
 * `allowBuilds` settings. pnpm refuses to install a dependency whose build
 * scripts have not been approved (`ERR_PNPM_IGNORED_BUILDS`), and `wrangler`
 * brings both `esbuild` and `workerd`, so the generated project approves them
 * here.
 */
export const pnpmWorkspaceFileTemplate = `
allowBuilds:
  esbuild: true
  workerd: true
`
