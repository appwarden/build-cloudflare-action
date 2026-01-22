import { defineConfig } from "tsup"

const v = (value: string | number | boolean) => JSON.stringify(value)

const getLatestMiddleware = () =>
  fetch("https://registry.npmjs.org/@appwarden/middleware/latest")
    .then((res) => res.json())
    .then((result) => result.version)

export default defineConfig(async () => {
  const middlewareVersion = await getLatestMiddleware()
  if (!middlewareVersion) {
    throw new Error("Failed to fetch latest middleware version")
  }

  console.log(`Building with @appwarden/middleware@${middlewareVersion}\n`)

  return {
    entry: ["src/index.ts"],
    format: ["cjs"],
    outDir: "dist",
    minify: false,
    clean: true,
    dts: false,
    bundle: true,
    // https://github.com/egoist/tsup/issues/619#issuecomment-1420423401
    noExternal: [/(.*)/],
    define: {
      MIDDLEWARE_VERSION: v(middlewareVersion),
      API_HOSTNAME: v("https://staging-api.appwarden.io"),
    },
  }
})
