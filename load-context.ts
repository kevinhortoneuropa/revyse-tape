import type { Env } from './app/env'

/**
 * The slice of Cloudflare's runtime we actually use.
 *
 * Deliberately narrower than wrangler's `PlatformProxy<Env>`: it names only
 * `env` and `ctx`, so nothing can quietly start depending on `caches` or
 * `request.cf` without this file changing. Structural typing means the real
 * proxy (in dev) and the real `fetch` arguments (in production) both satisfy it.
 */
export interface CloudflareContext {
  readonly env: Env
  readonly ctx: {
    waitUntil(promise: Promise<unknown>): void
    passThroughOnException(): void
  }
}

declare module '@remix-run/cloudflare' {
  interface AppLoadContext {
    readonly cloudflare: CloudflareContext
  }
}

export interface GetLoadContextArgs {
  readonly request: Request
  readonly context: { readonly cloudflare: CloudflareContext }
}

/**
 * Shared by `cloudflareDevProxyVitePlugin` in development and by `server.ts` in
 * production, so a loader sees the same `context.cloudflare` in both.
 */
export function getLoadContext({ context }: GetLoadContextArgs) {
  return context
}
