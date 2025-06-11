import * as core from "@actions/core"
import { mkdir, readdir, writeFile } from "fs/promises"
import { getRootDomain } from "./parse-domain"
import { ConfigSchema } from "./schema"
import {
  appTemplate,
  hydratePackageJson,
  hydrateWranglerTemplate,
  packageJsonTemplate,
  wranglerFileTemplate,
} from "./templates"
import { ApiMiddlewareOptions } from "./types"
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

  debug(`Validating repository`)

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

  debug(`✅ Validating repository`)
  debug(`Validating configuration`)

  const maybeConfig = await ConfigSchema.safeParseAsync({
    debug: core.getInput("debug"),
    hostname: core.getInput("hostname"),
    cloudflareAccountId: core.getInput("cloudflare-account-id"),
    appwardenApiToken: core.getInput("appwarden-api-token"),
  })

  if (!maybeConfig.success) {
    return core.setFailed(JSON.stringify(maybeConfig.error.format(), null, 2))
  }

  const config = maybeConfig.data

  debug(`✅ Validating configuration`)

  const middlewareDir = ".appwarden/generated-middleware"

  debug(`Fetching middleware configuration`)

  let middlewareOptions: ApiMiddlewareOptions | undefined
  try {
    middlewareOptions = await getMiddlewareOptions(
      config.hostname,
      config.appwardenApiToken,
    )
  } catch (error) {
    if (error instanceof Error) {
      return core.setFailed(
        error.message === "BAD_AUTH"
          ? "Invalid Appwarden API token"
          : error.message === "no_domain_configurations"
            ? `The hostname (${getRootDomain(config.hostname)}) was not found in a [domain configuration file](https://appwarden.io/docs/guides/domain-configuration-management). Please add one for this domain and try again.`
            : error.message,
      )
    }

    return core.setFailed(String(error))
  }

  if (!middlewareOptions) {
    return core.setFailed(
      `Could not find Appwarden middleware configuration for hostname: ${config.hostname}`,
    )
  }

  debug(
    `✅ Fetching middleware configuration \n ${JSON.stringify(
      middlewareOptions,
      null,
      2,
    )}`,
  )

  debug(`Generating middleware files`)

  // write the app files
  await mkdir(middlewareDir, { recursive: true })

  const projectFiles = [
    [
      "package.json",
      hydratePackageJson(packageJsonTemplate, { version: middlewareVersion }),
    ],
    [
      "wrangler.toml",
      hydrateWranglerTemplate(wranglerFileTemplate, config, middlewareOptions),
    ],
    ["app.mjs", appTemplate],
  ]

  for (const [fileName, fileContent] of projectFiles) {
    await writeFile(`${middlewareDir}/${fileName}`, fileContent)
    debug(`Generated ${fileName}:\n ${fileContent}`)
  }

  debug(`✅ Generating middleware files`)
}

main().catch((err) => {
  core.error(err)
  core.setFailed(err.message)
})
