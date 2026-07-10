import type { AppLoadContext } from '@remix-run/cloudflare'

import type { Env } from './env'

/**
 * The one place in the app that touches the ambient environment.
 *
 * On Cloudflare Workers there is no process-level environment: `env` is handed
 * to the `fetch` handler **per request**, so `process.env.FOO` at module scope
 * evaluates to `undefined`, silently, and nothing fails until production
 * behaves differently from your laptop.
 *
 * This file is the seam. On `main` it returns `process.env`; here it returns the
 * request-scoped binding. Every caller — `app/routes/_index.tsx` — is identical
 * on both branches, and `app/lib` knows about neither.
 */
export function readEnv(context: AppLoadContext): Env {
  return context.cloudflare.env
}
