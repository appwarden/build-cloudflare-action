import { z } from "zod"
import { ConfigSchema } from "./schema"
import type { HostnameMiddlewareOptions } from "./templates/generated-config"

type AnyRecord = Record<string, unknown>

export type APIResponseContent = AnyRecord[] | AnyRecord | null
export type APIResponseContext = any
export type APIResponseError = {
  message: string
  code?: string
  status?: number
}

export type APIResponse<T extends APIResponseContent = AnyRecord> = {
  content: T | undefined
  context: APIResponseContext | undefined
  error: APIResponseError | undefined
}

export interface AppwardenConfig {
  middleware?: Middleware[]
}

export interface Middleware {
  hostname: string
  options?: HostnameMiddlewareOptions
}

export type Config = z.infer<typeof ConfigSchema>

export type ApiMiddlewareOptions = {
  debug?: boolean
}
