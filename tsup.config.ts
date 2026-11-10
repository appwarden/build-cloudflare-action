import { readFileSync, writeFileSync } from "node:fs"
import { defineConfig } from "tsup"

const v = (value: string | number | boolean) => JSON.stringify(value)

const VERSION_FILE = ".middleware-version"

const getLatestMiddleware = () =>
  fetch("https://registry.npmjs.org/@appwarden/middleware/latest")
    .then((res) => res.json())
    .then((result) => result.version)

const getPinnedMiddleware = () => {
  try {
    return readFileSync(VERSION_FILE, "utf8").trim()
  } catch {
    return ""
  }
}

export default defineConfig(async () => {
  // The committed `.middleware-version` is the source of truth for the version
  // bundled into dist/, so a build is reproducible and CI's "Check for
  // uncommitted changes" guard is meaningful. Resolving the latest published
  // version here instead would make every build depend on npm state, so that
  // guard would fail whenever a newer version is published.
  //
  // The scheduled middleware-sync workflow is what moves this pin forward.
  let middlewareVersion = getPinnedMiddleware()
  if (!middlewareVersion) {
    middlewareVersion = await getLatestMiddleware()
    if (!middlewareVersion) {
      throw new Error("Failed to fetch latest middleware version")
    }
    writeFileSync(VERSION_FILE, `${middlewareVersion}\n`)
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
      APPWARDEN_API_HOSTNAME: v("https://api.appwarden.io"),
    },
  }
})
