import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { resolveMiddlewareVersion } from "./middleware-version"

describe("resolveMiddlewareVersion", () => {
  let dir: string
  const pinPath = () => join(dir, ".middleware-version")

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "middleware-version-"))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it("returns the pinned version", () => {
    writeFileSync(pinPath(), "3.17.15\n")

    expect(resolveMiddlewareVersion(pinPath())).toBe("3.17.15")
  })

  it("strips CR so a CRLF checkout does not read as permanent drift", () => {
    writeFileSync(pinPath(), "3.17.15\r\n")

    expect(resolveMiddlewareVersion(pinPath())).toBe("3.17.15")
  })

  it("throws when the pin file is missing", () => {
    expect(() => resolveMiddlewareVersion(pinPath())).toThrow(/Missing/)
  })

  it("rethrows non-ENOENT read errors", () => {
    // Reading a directory raises EISDIR, not ENOENT.
    expect(() => resolveMiddlewareVersion(dir)).toThrow()
  })

  it.each(["3.17", "v3.17.15", "not-a-version", ""])(
    "throws when the pin is not an exact semver version: %j",
    (value) => {
      writeFileSync(pinPath(), value)

      expect(() => resolveMiddlewareVersion(pinPath())).toThrow(
        /exact semver version/,
      )
    },
  )
})
