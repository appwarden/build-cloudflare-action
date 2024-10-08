import * as core from "@actions/core"
import { mkdir, readdir, writeFile } from "fs/promises"
import { ConfigSchema } from "./schema"
import {
  appTemplate,
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

async function main() {
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

  let hostname = core.getInput("hostname")
  try {
    new URL(`https://${hostname}`)
  } catch (err) {
    hostname = ""
  }
  if (!hostname) {
    return core.setFailed(
      "Please provide the hostname of your domain (e.g. app.example.com)",
    )
  }

  // validate the configuration
  const maybeConfig = ConfigSchema.safeParse({
    hostname,
    debug: core.getInput("debug"),
    cloudflareAccountId: core.getInput("cloudflare-account-id"),
  })

  if (!maybeConfig.success) {
    return core.setFailed(maybeConfig.error.errors.join("\n"))
  }

  const config = maybeConfig.data

  debug(`✅ Validating configuration`)

  const middlewareDir = ".appwarden/generated-middleware"

  debug(`Generating middleware files`)

  const middlewareOptions = await getMiddlewareOptions(
    hostname,
    core.getInput("appwarden-api-token"),
  )

  debug(
    middlewareOptions
      ? `Found middleware options: ${JSON.stringify(
          middlewareOptions,
          null,
          2,
        )}`
      : `No middleware options found for ${hostname}`,
  )

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

  const files = await readdir(middlewareDir)
  debug(`✅ Generating middleware files`)
}

main().catch((err) => {
  debug(err)
  core.error(err)
  core.setFailed(err.message)
})
