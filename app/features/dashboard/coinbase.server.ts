import type { Env } from '~/env'
import { createCoinbaseClient, type CoinbaseClient } from '~/lib/coinbase/client'

/**
 * One client per configuration, so the TTL cache and its single-flight
 * de-duplication are shared across requests. A fresh client per request would
 * fetch Coinbase on every page view.
 *
 * Built lazily and memoised rather than constructed at module scope, because
 * configuration is not necessarily available when this module is evaluated —
 * on some runtimes it arrives with the request. Keyed by the configuration
 * rather than assuming there is only one, so a preview deployment pointed at a
 * staging upstream is never served the production client out of the memo.
 *
 * The map hangs off `globalThis` because Vite re-evaluates modules on every
 * change in development: a plain module-level map would hand each hot reload an
 * empty cache and hammer Coinbase while you work.
 */
const globalRef = globalThis as typeof globalThis & {
  __coinbaseClients?: Map<string, CoinbaseClient>
}

const clients = (globalRef.__coinbaseClients ??= new Map())

export function getCoinbaseClient(env: Env): CoinbaseClient {
  const baseUrl = env.COINBASE_BASE_URL
  const ttl = env.COINBASE_CACHE_TTL_MS

  const key = `${baseUrl ?? ''}|${ttl ?? ''}`
  const existing = clients.get(key)
  if (existing) return existing

  const created = createCoinbaseClient({
    ...(baseUrl === undefined ? {} : { baseUrl }),
    ...(ttl === undefined ? {} : { ttlMs: Number(ttl) }),
  })

  clients.set(key, created)
  return created
}
