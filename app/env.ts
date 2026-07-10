/**
 * The configuration this app reads from its environment.
 *
 * Everything is optional and everything is a string, because that is what an
 * environment gives you regardless of who is providing it — a process, a
 * `.env` file, or a request-scoped binding.
 */
export interface Env {
  /** Points at a mock upstream in the end-to-end suite. */
  readonly COINBASE_BASE_URL?: string
  /** Milliseconds. Set to `0` in tests to defeat the cache. */
  readonly COINBASE_CACHE_TTL_MS?: string
}
