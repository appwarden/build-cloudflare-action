# appwarden/build-cloudflare-action

![Test Coverage](https://img.shields.io/badge/coverage-93.95%25-brightgreen)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Easy-to-use GitHub Action to build Appwarden for deployment to your Cloudflare domain.

> Read the docs to [get started](https://appwarden.io/docs/guides/cloudflare-integration)

## Features

- 🚀 **Automated Middleware Generation**: Automatically generates Cloudflare Worker middleware for your domain
- 🔧 **Cloudflare Integration**: Seamless integration with Cloudflare Workers and Wrangler
- 🛡️ **Security Configuration**: Configures Content Security Policy (CSP) and lock page settings
- 🧪 **Debug Mode**: Built-in debug mode for troubleshooting deployments
- ✅ **Type Safe**: Written in TypeScript with comprehensive input validation using Zod
- 🔍 **Domain Validation**: Validates hostnames and Cloudflare account IDs
- 📦 **Zero Configuration**: Works out of the box with minimal setup required

## Inputs

| Input                   | Description                                                            | Required | Default |
| ----------------------- | ---------------------------------------------------------------------- | -------- | ------- |
| `hostname`              | The hostname of your Appwarden-protected domain (e.g. app.example.com) | ✅       | -       |
| `cloudflare-account-id` | Your Cloudflare account ID (32 character string)                       | ✅       | -       |
| `appwarden-api-token`   | Your Appwarden API token                                               | ✅       | -       |
| `debug`                 | Enable debug mode for troubleshooting                                  | ❌       | `false` |

## Installation

This workflow builds and deploys the latest version of Appwarden to your domain. The workflow is optionally triggered by

1. Publishing a new release
2. Pushing to `main` (or another branch)

> Follow the emoji numbered instructions to fill in the required content.

```
name: 🤖 Deploy Appwarden
on: workflow_dispatch
# 1️⃣ Uncomment the following lines to deploy the middleware on every release
# deploy the middleware on every release
# on:
#   release:
#     types: [published]
# 1️⃣ or, uncomment the following lines to deploy the middleware on a push to a specific branch
# on:
#   push:
#     branches:
#       - main
env:
  APP_HOSTNAME: # 2️⃣ add your domain (e.g. example.com)
  CLOUDFLARE_ACCOUNT_ID: # 2️⃣ add your cloudflare account id
  APPWARDEN_API_TOKEN: # 2️⃣ add your appwarden api token as a [secret](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions)
jobs:
  deploy-appwarden:
    name: Deploy Appwarden
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup node
        uses: actions/setup-node@v4
      # 3️⃣ Uncomment the following lines if you're using `npm`
      # - name: Setup npm
      #   run: npm ci --ignore-scripts
      # 3️⃣ Uncomment the following lines if you're using `yarn`
      # - name: Install dependencies
      #   run: yarn install --ignore-scripts
      # 3️⃣ Uncomment the following lines if you're using `pnpm`
      # - name: Setup pnpm
      #   uses: pnpm/action-setup@v3.0.0
      #   with:
      #     run_install: |
      #       - args: [--ignore-scripts]
      # This builds the Appwarden middleware for Cloudflare
      - name: Build @appwarden/middleware on Cloudflare
        uses: appwarden/build-cloudflare-action@v1
        with:
          hostname: ${{ env.APP_HOSTNAME }}
          cloudflare-account-id: ${{ env.CLOUDFLARE_ACCOUNT_ID }}
      # This deploys the Appwarden middleware to Cloudflare
      - name: Deploy middleware
        uses: cloudflare/wrangler-action@v3.4.1
        with:
          packageManager: # 4️⃣ add your package manager (e.g. npm, yarn, or pnpm)
          workingDirectory: .appwarden/generated-middleware
          # we recommend keeping wrangler version fixed to avoid an intermittent issue with later versions causing the deployment to fail
          wranglerVersion: 3.3.0
          environment: production
          accountId: ${{ env.CLOUDFLARE_ACCOUNT_ID }}
          apiToken: ${{ env.APPWARDEN_API_TOKEN }}
          secrets: |
            APPWARDEN_API_TOKEN
```

> [Read the docs](https://appwarden.io/docs/guides/cloudflare-integration) to learn more

## Development

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
# Clone the repository
git clone https://github.com/appwarden/build-cloudflare-action.git
cd build-cloudflare-action

# Install dependencies
npm install
```

### Testing

This project uses Vitest for testing with comprehensive unit tests:

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run tests with coverage
npm run test:coverage
```

The test suite includes:

- **Unit tests** for the main action logic
- **Template tests** for Wrangler configuration generation
- **Validation tests** for input schemas and domain validation
- **Mock tests** for external API calls and file system operations

### Code Quality

```bash
# Format code
npm run format

# Check formatting
npm run check:prettier

# Type checking
npm run check:types

# Build the action
npm run build
```

## License

MIT
