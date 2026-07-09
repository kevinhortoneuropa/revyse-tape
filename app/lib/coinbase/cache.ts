export interface TtlCacheOptions {
  readonly ttlMs: number
  /** Injected so tests control time instead of sleeping. */
  readonly now?: () => number
}

export interface TtlCache<T> {
  get(): Promise<T>
  invalidate(): void
}

/**
 * A single-value, time-to-live cache with single-flight de-duplication.
 *
 * The loader re-runs on every revalidation, and every connected browser polls on
 * its own 30-second timer. Without this, fifty open tabs are fifty requests to
 * Coinbase every thirty seconds, for data that is identical.
 *
 * Two behaviours matter:
 *
 * - **TTL.** A fresh value is reused. Coinbase sends `cache-control: no-store`
 *   on this endpoint, so caching it is a deliberate override — see ADR-0003.
 *
 * - **Single flight.** Concurrent callers arriving during a miss share one
 *   in-flight promise rather than each starting a fetch. This is the difference
 *   between a cold start serving fifty simultaneous requests with one upstream
 *   call and with fifty. A rejected load is not cached: the next caller retries.
 */
export function createTtlCache<T>(load: () => Promise<T>, options: TtlCacheOptions): TtlCache<T> {
  const now = options.now ?? Date.now

  let value: T | undefined
  let expiresAt = 0
  let inFlight: Promise<T> | undefined

  return {
    async get(): Promise<T> {
      if (value !== undefined && now() < expiresAt) return value
      if (inFlight) return inFlight

      const pending = load()
      inFlight = pending

      try {
        const loaded = await pending
        // Reached only on success, so a failure never becomes a cached value.
        value = loaded
        expiresAt = now() + options.ttlMs
        return loaded
      } finally {
        // Clear on both paths: a rejected promise must not be handed to the
        // next caller as though it were still in flight.
        inFlight = undefined
      }
    },

    invalidate(): void {
      value = undefined
      expiresAt = 0
    },
  }
}
