import { defineConfig } from "tsup"
import { resolveMiddlewareVersion } from "./src/middleware-version"

const v = (value: string | number | boolean) => JSON.stringify(value)

export default defineConfig(() => {
  // The committed `.middleware-version` is the source of truth for the version
  // bundled into dist/, so a build is reproducible and CI's "Check for
  // uncommitted changes" guard is meaningful. Resolving the latest published
  // version here instead would make every build depend on npm state, so that
  // guard would fail whenever a newer version is published.
  //
  // The scheduled middleware-sync workflow is what moves this pin forward.
  const middlewareVersion = resolveMiddlewareVersion()

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
