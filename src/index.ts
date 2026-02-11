import * as core from "@actions/core"
import { mkdir, readdir, writeFile } from "fs/promises"
import { ConfigSchema } from "./schema"
import {
  appTemplate,
  hydrateGeneratedConfig,
  hydratePackageJson,
  hydrateWranglerTemplate,
  packageJsonTemplate,
  wranglerFileTemplate,
} from "./templates"
import { getMiddlewareOptions } from "./utils"

// @ts-expect-error tsup config
const middlewareVersion = MIDDLEWARE_VERSION

const Debug = (debug: boolean) => (msg: unknown) => {
  if (debug) {
    console.log(msg)
  }
}

let debug: (msg: unknown) => void

export async function main() {
  debug = Debug(core.getInput("debug") === "true")

  debug(`[repository] Validating repository`)

  let repoName = ""
  try {
    const files = await readdir("..")
    repoName = files[0]

    if (!repoName) {
      return core.setFailed(
        "Repository not found. Did you forget to include `actions/checkout` in your workflow?",
      )
    }
  } catch (error) {
    return core.setFailed(
      "Repository not found. Did you forget to include `actions/checkout` in your workflow?",
    )
  }

  debug(`[repository] ✅ Validation complete`)
  debug(`[config] Validating configuration`)

  const maybeConfig = await ConfigSchema.safeParseAsync({
    debug: core.getInput("debug"),
    cloudflareAccountId: core.getInput("cloudflare-account-id"),
    appwardenApiToken: core.getInput("appwarden-api-token"),
  })

  if (!maybeConfig.success) {
    return core.setFailed(JSON.stringify(maybeConfig.error.format(), null, 2))
  }

  const config = maybeConfig.data

  debug(`[config] ✅ Validation complete`)

  const middlewareDir = ".appwarden/generated-middleware"

  debug(`[middleware-config] Fetching middleware configuration`)

  // Fetch middleware options for all hostnames from API
  let middlewareOptionsMap
  try {
    middlewareOptionsMap = await getMiddlewareOptions(
      config.appwardenApiToken,
      debug,
    )
  } catch (error) {
    if (error instanceof Error) {
      return core.setFailed(
        error.message === "BAD_AUTH"
          ? "Invalid Appwarden API token"
          : error.message === "no_domain_configurations"
            ? `No domain configurations found. Please add a [domain configuration file](https://appwarden.io/docs/guides/domain-configuration-management) and try again.`
            : error.message,
      )
    }

    return core.setFailed(String(error))
  }

  // Ensure we have at least one hostname configuration
  if (middlewareOptionsMap.size === 0) {
    return core.setFailed(
      `No Appwarden middleware configurations found. Please ensure you have configured at least one domain.`,
    )
  }

  debug(
    `[middleware-config] ✅ Fetch complete for ${middlewareOptionsMap.size} hostname(s)\n ${JSON.stringify(
      Object.fromEntries(middlewareOptionsMap),
      null,
      2,
    )}`,
  )

  debug(`[generation] Generating middleware files`)

  // Generate the config and extract hostnames
  const { configString, hostnames } =
    hydrateGeneratedConfig(middlewareOptionsMap)

  debug(`[generation] Extracted hostnames: ${hostnames.join(", ")}`)

  // write the app files
  await mkdir(middlewareDir, { recursive: true })

  const projectFiles: [string, string][] = [
    [
      "package.json",
      hydratePackageJson(packageJsonTemplate, { version: middlewareVersion }),
    ],
    [
      "wrangler.toml",
      hydrateWranglerTemplate(wranglerFileTemplate, {
        cloudflareAccountId: config.cloudflareAccountId,
        hostnames,
      }),
    ],
    ["app.mjs", appTemplate],
    ["generated-config.mjs", configString],
  ]

  for (const [fileName, fileContent] of projectFiles) {
    await writeFile(`${middlewareDir}/${fileName}`, fileContent)
    debug(`[generation] Generated ${fileName}:\n ${fileContent}`)
  }

  debug(`[generation] ✅ Generation complete`)

  // Set outputs for downstream steps
  core.setOutput("middlewareVersion", middlewareVersion)
  core.setOutput("hostnames", hostnames.join(", "))
}

main().catch((err) => {
  core.error(err)
  core.setFailed(err.message)
})
