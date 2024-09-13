import * as core from "@actions/core"
import { mkdir, readdir, readFile, writeFile } from "fs/promises"
import path from "path"
import YAML from "yaml"
import { ConfigSchema, ContentSecurityPolicySchema } from "./schema"
import {
  appTemplate,
  hydratePackageJson,
  hydrateWranglerTemplate,
  packageJsonTemplate,
  wranglerFileTemplate,
} from "./templates"
import { AppwardenConfig } from "./types"
import { ensureProtocol } from "./utils"

// @ts-expect-error tsup config
const middlewareVersion = MIDDLEWARE_VERSION

const Debug = (debug: boolean) => (msg: unknown) => {
  if (debug) {
    console.log(msg)
  }
}

async function main() {
  const debug = Debug(core.getInput("debug") === "true")

  const hostname = core.getInput("hostname")
  if (!hostname) {
    return core.setFailed(
      "Please provide the hostname of your Appwarden-protected domain",
    )
  }

  // check if the repository is checked out
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

  // check if the appwarden configuration file exists
  let configFile = ""
  try {
    const files = await readdir(`.appwarden`)

    for (const file of files) {
      if (file === "config.yaml" || file === "config.yml") {
        if (configFile) {
          return core.setFailed(
            `Multiple Appwarden configuration files [.appwarden/config.yml] found in [.appwarden]. Please remove one.`,
          )
        }

        configFile = file
      }
    }

    if (!configFile) {
      return core.setFailed(
        `Appwarden configuration file [.appwarden/config.yml] not found. Is Appwarden configured in your repository?`,
      )
    }
  } catch (error) {
    return core.setFailed(
      `Appwarden folder [.appwarden] not found. Is Appwarden configured in your repository?`,
    )
  }

  debug(`Reading Appwarden configuration file: .appwarden/${configFile}`)

  // read the appwarden configuration file

  const appwardenConfigContent = await readFile(`.appwarden/${configFile}`, {
    encoding: "utf-8",
  })

  let maybeConfiguration: AppwardenConfig | null = null
  if (appwardenConfigContent) {
    try {
      maybeConfiguration = YAML.parse(appwardenConfigContent)
    } catch (error) {
      return core.setFailed(
        `Error parsing Appwarden configuration file [.appwarden/config.yml]. Please check the syntax.`,
      )
    }
  }

  debug(`Parsed Appwarden configuration: ${JSON.stringify(maybeConfiguration)}`)

  // get the middleware configuration for the hostname

  const hostnameConfiguration = maybeConfiguration?.middleware?.find(
    (middleware) =>
      new URL(ensureProtocol(hostname)).hostname ===
      new URL(ensureProtocol(middleware.hostname)).hostname,
  )

  if (!hostnameConfiguration) {
    return core.setFailed(
      `Could not find Appwarden middleware configuration for hostname: ${hostname}`,
    )
  }

  debug(
    `Found hostname configuration: ${JSON.stringify(hostnameConfiguration)}`,
  )

  debug(
    `Found csp-directives: ${JSON.stringify(
      hostnameConfiguration?.options?.["csp-directives"],
    )}`,
  )

  // validate the configuration

  const maybeConfig = ConfigSchema.safeParse({
    hostname,
    debug: core.getInput("debug"),
    cloudflareAccountId: core.getInput("cloudflare-account-id"),
    cspEnforced: hostnameConfiguration?.options?.["csp-enforced"],
    cspDirectives: hostnameConfiguration?.options?.["csp-directives"],
    lockPageSlug: hostnameConfiguration?.options?.["lock-page-slug"],
  })

  if (!maybeConfig.success) {
    return core.setFailed(maybeConfig.error.errors.join("\n"))
  }

  const config = maybeConfig.data

  if (config.cspEnforced === undefined) {
    core.warning("Content Security Policy is disabled")
  }

  debug(`Parsed config: ${JSON.stringify(config)}`)

  // resolve the CSP directives configuration

  if (typeof config.cspDirectives === "string") {
    debug("csp-directives is string")

    if (!config.cspDirectives.endsWith(".json")) {
      return core.setFailed(
        "Please provide a JSON file for your Content Security Policy",
      )
    }

    debug(`Reading csp file: ${path.join(".appwarden", config.cspDirectives)}`)
    const cspDirectivesContent = await readFile(
      path.join(".appwarden", config.cspDirectives),
      { encoding: "utf-8" },
    )
    if (!cspDirectivesContent) {
      return core.setFailed(
        `Could not find csp-directives file: ${config.cspDirectives}`,
      )
    }

    debug(`Validating csp file`)
    // validate the CSP directives configuration

    const maybeCSP = ContentSecurityPolicySchema.safeParse(
      typeof cspDirectivesContent === "string"
        ? JSON.parse(cspDirectivesContent)
        : cspDirectivesContent,
    )
    if (!maybeCSP.success) {
      return core.setFailed(maybeCSP.error.errors.join("\n"))
    }

    config.cspDirectives = maybeCSP.data

    debug(`Validated csp file: ${JSON.stringify(config.cspDirectives)}`)
  }

  const middlewareDir = ".appwarden/generated-middleware"

  debug(`Creating directory: ${middlewareDir} and generating middleware files`)

  // write the app files

  await mkdir(middlewareDir, { recursive: true })

  const projectFiles = [
    [
      "package.json",
      hydratePackageJson(packageJsonTemplate, { version: middlewareVersion }),
    ],
    ["wrangler.toml", hydrateWranglerTemplate(wranglerFileTemplate, config)],
    ["app.mjs", appTemplate],
  ]

  for (const [fileName, fileContent] of projectFiles) {
    await writeFile(`${middlewareDir}/${fileName}`, fileContent)
    debug(`Generated ${fileName}:\n ${fileContent}`)
  }

  const files = await readdir(middlewareDir)
  debug(`✅ Generated ${files.toString().split(",").join(", ")}`)
}

main().catch((err) => {
  core.error(err)
  core.setFailed(err.message)
})
