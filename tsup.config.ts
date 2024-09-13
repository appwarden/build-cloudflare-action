import { defineConfig } from "tsup"

declare var process: {
  env: {
    MIDDLEWARE_VERSION: string
  }
}

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

  return {
    entry: ["src/index.ts"],
    format: ["esm"],
    outDir: "dist",
    minify: false,
    clean: true,
    dts: false,
    bundle: true,
    define: {
      MIDDLEWARE_VERSION: v(middlewareVersion),
    },
  }
})
