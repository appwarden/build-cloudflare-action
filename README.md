# Build Appwarden GitHub Action

Easy-to-use GitHub Action to build Appwarden for deployment to your Cloudflare domain.

> Read the docs to [get started](https://appwarden.io/docs/guides/cloudflare-integration)

## Installation

This workflow builds and deploys the latest version of Appwarden to your domain. The workflow is optionally triggered by

1. Publishing a new release
2. Pushing to `main` (or another branch)

> Follow the emoji numbers to fill in the required content.

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
