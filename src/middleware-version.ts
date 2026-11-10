import { readFileSync } from "node:fs"
import { valid } from "semver"

/** Committed file that pins the @appwarden/middleware version bundled into dist/. */
export const VERSION_FILE = ".middleware-version"

/**
 * Resolve the @appwarden/middleware version to bundle, from the committed pin.
 *
 * The pin is the single source of truth, so `npm run build` is reproducible and
 * CI's "Check for uncommitted changes" guard is meaningful: a build never
 * depends on npm state. The scheduled `middleware-sync` workflow is what moves
 * the pin forward.
 *
 * Throws when the pin is missing, unreadable, or not an exact semver version.
 * The file is committed, so its absence or corruption is a bug; failing loudly
 * beats silently resolving a version over the network and shipping a
 * non-reproducible build.
 */
export function resolveMiddlewareVersion(
  versionFile: string = VERSION_FILE,
): string {
  let raw: string
  try {
    raw = readFileSync(versionFile, "utf8")
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(
        `Missing ${versionFile}: the pinned @appwarden/middleware version is required to build. Restore the committed file (the middleware-sync workflow recreates it) and rebuild.`,
      )
    }
    throw error
  }

  // Strip CR so a CRLF checkout does not produce a pin that compares unequal to
  // npm's version, which the sync workflow would read as permanent drift.
  const version = raw.replace(/\r/g, "").trim()

  // `valid` normalizes loose input (e.g. `v3.17.15` -> `3.17.15`), so require
  // the parsed value to match exactly. The pin must equal npm's version string,
  // or the sync workflow's comparison never succeeds.
  const normalized = valid(version)
  if (normalized !== version) {
    throw new Error(
      `${versionFile} must contain an exact semver version, got ${JSON.stringify(raw)}`,
    )
  }

  return normalized
}
