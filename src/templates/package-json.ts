export const hydratePackageJson = (
  template: string,
  data: { version: string },
) => template.replaceAll("{{VERSION}}", data.version)

export const packageJsonTemplate = `
{
  "name": "@appwarden/compiled-middleware",
  "version": "{{VERSION}}",
  "type": "module",
  "author": "support@appwarden.io",
  "license": "MIT",
  "dependencies": {
    "@appwarden/middleware": "{{VERSION}}"
  }
}
`
