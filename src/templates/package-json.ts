export const hydratePackageJson = (
  template: string,
  data: { version: string },
) => template.replaceAll("{{VERSION}}", data.version)

export const packageJsonTemplate = `
{
  "name": "@appwarden/app",
  "version": "{{VERSION}}",
  "type": "module",
  "author": "support@appwarden.io",
  "license": "MIT",
  "dependencies": {
    "@appwarden/cloudflare": "{{VERSION}}"
  }
}
`