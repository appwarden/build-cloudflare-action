import { defineConfig } from "tsup"

declare var process: {
  env: {
    MIDDLEWARE_VERSION: string
  }
}

const v = (value: string | number | boolean) => JSON.stringify(value)

if (!process.env.MIDDLEWARE_VERSION) {
  throw new Error("Provide a middleware version")
}

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  outDir: "dist",
  minify: false,
  clean: true,
  dts: false,
  bundle: true,
  define: {
    MIDDLEWARE_VERSION: v(process.env.MIDDLEWARE_VERSION),
  },
})
