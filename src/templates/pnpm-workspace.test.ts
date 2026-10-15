import { describe, it, expect } from "vitest"
import { parse } from "yaml"
import { pnpmWorkspaceFileTemplate } from "./pnpm-workspace"

interface PnpmWorkspaceFile {
  allowBuilds: Record<string, boolean>
}

describe("pnpm-workspace", () => {
  describe("pnpmWorkspaceFileTemplate", () => {
    it("should be valid YAML", () => {
      expect(() => parse(pnpmWorkspaceFileTemplate)).not.toThrow()
    })

    it("should approve the build scripts that wrangler brings", () => {
      const workspace = parse(pnpmWorkspaceFileTemplate) as PnpmWorkspaceFile

      expect(workspace.allowBuilds.esbuild).toBe(true)
      expect(workspace.allowBuilds.workerd).toBe(true)
    })

    it("should not leave any package waiting for build approval", () => {
      const workspace = parse(pnpmWorkspaceFileTemplate) as PnpmWorkspaceFile

      const undecided = Object.entries(workspace.allowBuilds).filter(
        ([, approved]) => typeof approved !== "boolean",
      )

      expect(undecided).toEqual([])
    })
  })
})
