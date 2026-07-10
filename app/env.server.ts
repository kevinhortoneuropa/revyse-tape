import type { Env } from './env'

/**
 * The one place in the app that touches the ambient environment.
 *
 * `app/lib` takes its configuration as constructor options and knows nothing
 * about where it runs. A loader reads the environment here and passes it inward.
 * That is what keeps the pure core testable without a process, a network, or a
 * platform.
 *
 * `context` is unused on Node, where configuration lives in the process
 * environment. It is present because it is the seam: a runtime that hands
 * configuration to the *request* rather than to the *process* — a Cloudflare
 * Worker, say, which has no `process` at all — replaces this single file and
 * nothing else.
 */
export function readEnv(_context: unknown): Env {
  return process.env as Env
}
