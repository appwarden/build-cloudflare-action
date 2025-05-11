import * as core from "@actions/core"
import { mkdir, readdir, writeFile } from "fs/promises"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ConfigSchema } from "./schema"
import { getMiddlewareOptions } from "./utils"

// Mock dependencies
vi.mock("@actions/core")
vi.mock("fs/promises")
vi.mock("./schema")
vi.mock("./utils")
vi.mock("./templates", () => ({
  appTemplate: "mock-app-template",
  packageJsonTemplate: "mock-package-json-template",
  wranglerFileTemplate: "mock-wrangler-file-template",
  hydratePackageJson: vi.fn().mockReturnValue("hydrated-package-json"),
  hydrateWranglerTemplate: vi
    .fn()
    .mockReturnValue("hydrated-wrangler-template"),
}))

// Mock global constant that's injected by tsup
vi.stubGlobal("MIDDLEWARE_VERSION", "1.0.0")

describe("main function", () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.resetAllMocks()

    // Setup default mock implementations
    vi.mocked(core.getInput).mockImplementation((name) => {
      if (name === "debug") return "true"
      if (name === "hostname") return "test.example.com"
      if (name === "cloudflare-account-id")
        return "1234567890abcdef1234567890abcdef"
      if (name === "appwarden-api-token") return "mock-api-token"
      return ""
    })

    vi.mocked(readdir).mockResolvedValue(["repo-name"] as any)

    vi.mocked(ConfigSchema.safeParseAsync).mockResolvedValue({
      success: true,
      data: {
        debug: true,
        hostname: "test.example.com",
        cloudflareAccountId: "1234567890abcdef1234567890abcdef",
      },
    } as any)

    vi.mocked(getMiddlewareOptions).mockResolvedValue({
      debug: false,
      "lock-page-slug": "/test-maintenance",
      "csp-mode": "enforced",
      "csp-directives": { "default-src": "'self'" },
    })

    vi.mocked(mkdir).mockResolvedValue(undefined)
    vi.mocked(writeFile).mockResolvedValue(undefined)

    // Spy on console.log for debug output testing
    vi.spyOn(console, "log").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("should successfully generate middleware files", async () => {
    // Import and execute the main function
    // We need to use a dynamic import to avoid hoisting issues with the mocks
    const indexModule = await import("./index")

    // Execute the main function
    await indexModule.main()

    // Verify repository validation
    expect(readdir).toHaveBeenCalledWith("..")

    // Verify configuration validation
    expect(ConfigSchema.safeParseAsync).toHaveBeenCalledWith({
      debug: "true",
      hostname: "test.example.com",
      cloudflareAccountId: "1234567890abcdef1234567890abcdef",
    })

    // Verify middleware options fetching
    expect(getMiddlewareOptions).toHaveBeenCalledWith(
      "test.example.com",
      "mock-api-token",
    )

    // Verify directory creation
    expect(mkdir).toHaveBeenCalledWith(".appwarden/generated-middleware", {
      recursive: true,
    })

    // Verify file writing
    // Reset the mock to clear previous calls before checking
    vi.mocked(writeFile).mockClear()

    // Execute the main function again
    await indexModule.main()

    // Now verify the writeFile calls
    expect(writeFile).toHaveBeenCalledTimes(3)
    expect(writeFile).toHaveBeenCalledWith(
      ".appwarden/generated-middleware/package.json",
      "hydrated-package-json",
    )
    expect(writeFile).toHaveBeenCalledWith(
      ".appwarden/generated-middleware/wrangler.toml",
      "hydrated-wrangler-template",
    )
    expect(writeFile).toHaveBeenCalledWith(
      ".appwarden/generated-middleware/app.mjs",
      "mock-app-template",
    )

    // Verify debug output
    expect(console.log).toHaveBeenCalled()
  })

  it("should fail when repository is not found", async () => {
    // Mock readdir to simulate repository not found
    vi.mocked(readdir).mockResolvedValue([] as any)

    // Import and execute the main function
    const indexModule = await import("./index")

    // Execute the main function
    await indexModule.main()

    // Verify core.setFailed was called with the correct error message
    expect(core.setFailed).toHaveBeenCalledWith(
      "Repository not found. Did you forget to include `actions/checkout` in your workflow?",
    )

    // Verify that no files were written
    expect(writeFile).not.toHaveBeenCalled()
  })

  it("should fail when readdir throws an error", async () => {
    // Mock readdir to throw an error
    vi.mocked(readdir).mockRejectedValue(new Error("readdir error"))

    // Import and execute the main function
    const indexModule = await import("./index")

    // Execute the main function
    await indexModule.main()

    // Verify core.setFailed was called with the correct error message
    expect(core.setFailed).toHaveBeenCalledWith(
      "Repository not found. Did you forget to include `actions/checkout` in your workflow?",
    )

    // Verify that no files were written
    expect(writeFile).not.toHaveBeenCalled()
  })

  it("should fail when config validation fails", async () => {
    // Mock ConfigSchema.safeParseAsync to return validation error
    const mockError = {
      format: () => ({ hostname: { _errors: ["Invalid hostname"] } }),
    }
    vi.mocked(ConfigSchema.safeParseAsync).mockResolvedValue({
      success: false,
      error: mockError,
    } as any)

    // Import and execute the main function
    const indexModule = await import("./index")

    // Execute the main function
    await indexModule.main()

    // Verify core.setFailed was called with the formatted error
    expect(core.setFailed).toHaveBeenCalledWith(
      JSON.stringify(mockError.format(), null, 2),
    )

    // Verify that no files were written
    expect(writeFile).not.toHaveBeenCalled()
  })

  it("should fail when getMiddlewareOptions throws BAD_AUTH error", async () => {
    // Mock getMiddlewareOptions to throw BAD_AUTH error
    const error = new Error("BAD_AUTH")
    vi.mocked(getMiddlewareOptions).mockRejectedValue(error)

    // Import and execute the main function
    const indexModule = await import("./index")

    // Execute the main function
    await indexModule.main()

    // Verify core.setFailed was called with the correct error message
    expect(core.setFailed).toHaveBeenCalledWith("Invalid Appwarden API token")

    // Verify that no files were written
    expect(writeFile).not.toHaveBeenCalled()
  })

  it("should fail when getMiddlewareOptions throws other error", async () => {
    // Mock getMiddlewareOptions to throw a different error
    const error = new Error("Other error")
    vi.mocked(getMiddlewareOptions).mockRejectedValue(error)

    // Import and execute the main function
    const indexModule = await import("./index")

    // Execute the main function
    await indexModule.main()

    // Verify core.setFailed was called with the error message
    expect(core.setFailed).toHaveBeenCalledWith("Other error")

    // Verify that no files were written
    expect(writeFile).not.toHaveBeenCalled()
  })

  it("should fail when middleware options are not found", async () => {
    // Mock getMiddlewareOptions to return undefined
    vi.mocked(getMiddlewareOptions).mockResolvedValue(undefined)

    // Import and execute the main function
    const indexModule = await import("./index")

    // Execute the main function
    await indexModule.main()

    // Verify core.setFailed was called with the correct error message
    expect(core.setFailed).toHaveBeenCalledWith(
      "Could not find Appwarden middleware configuration for hostname: test.example.com",
    )

    // Verify that no files were written
    expect(writeFile).not.toHaveBeenCalled()
  })

  it("should handle debug mode being disabled", async () => {
    // Mock debug input to be false
    vi.mocked(core.getInput).mockImplementation((name) => {
      if (name === "debug") return "false"
      if (name === "hostname") return "test.example.com"
      if (name === "cloudflare-account-id")
        return "1234567890abcdef1234567890abcdef"
      if (name === "appwarden-api-token") return "mock-api-token"
      return ""
    })

    // Import and execute the main function
    const indexModule = await import("./index")

    // Execute the main function
    await indexModule.main()

    // Verify all the expected functions were called
    expect(readdir).toHaveBeenCalled()
    expect(ConfigSchema.safeParseAsync).toHaveBeenCalled()
    expect(getMiddlewareOptions).toHaveBeenCalled()
    expect(mkdir).toHaveBeenCalled()
    expect(writeFile).toHaveBeenCalledTimes(3)

    // Verify debug output was not called
    expect(console.log).not.toHaveBeenCalled()
  })
})
