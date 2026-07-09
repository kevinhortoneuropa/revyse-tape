import { createTtlCache } from './cache'
import { CoinbaseUnavailableError } from './errors'
import type { QuotedAssets } from './quote'
import { quoteAssets } from './quote'
import { parseCatalog, parseRates } from './schemas'

/**
 * Overridable so end-to-end tests can point at a mock upstream. The fetch
 * happens in the loader, on the server, which is precisely why Playwright's own
 * request interception cannot reach it.
 */
const BASE_URL = process.env['COINBASE_BASE_URL'] ?? 'https://api.coinbase.com'

/** Coinbase's public endpoints allow ~10k requests/hour/IP. This stays far under. */
const CACHE_TTL_MS = Number(process.env['COINBASE_CACHE_TTL_MS'] ?? 10_000)

/** A dashboard that hangs is worse than one that says the feed is down. */
const REQUEST_TIMEOUT_MS = 5_000

async function fetchJson(path: string, timeoutMs: number): Promise<unknown> {
  let response: Response

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { accept: 'application/json' },
    })
  } catch (cause) {
    // DNS failure, connection reset, or our own timeout firing.
    throw new CoinbaseUnavailableError(`Request to ${path} failed`, { cause })
  }

  if (!response.ok) {
    throw new CoinbaseUnavailableError(`Coinbase responded ${String(response.status)} for ${path}`)
  }

  try {
    return await response.json()
  } catch (cause) {
    throw new CoinbaseUnavailableError(`Coinbase returned malformed JSON for ${path}`, { cause })
  }
}

export interface DashboardData extends QuotedAssets {
  /** When these prices were fetched, as epoch milliseconds. */
  readonly fetchedAt: number
}

/**
 * Fetch identity and price in parallel, then join them.
 *
 * Two documented endpoints, deliberately. `/v2/assets/search` would also give us
 * logos, market caps and 24h changes, but it is undocumented and unversioned,
 * and a submission's core data path should not rest on it.
 */
async function loadDashboardData(now: () => number, timeoutMs: number): Promise<DashboardData> {
  const [catalogPayload, ratesPayload] = await Promise.all([
    fetchJson('/v2/currencies/crypto', timeoutMs),
    fetchJson('/v2/exchange-rates?currency=USD', timeoutMs),
  ])

  const catalog = parseCatalog(catalogPayload)
  const rates = parseRates(ratesPayload)
  const { assets, dropped } = quoteAssets(catalog.assets, rates)

  // Silent decay is the enemy: an asset quietly vanishing looks like a design
  // choice, not a delisting.
  if (catalog.dropped > 0) {
    console.warn(`[coinbase] dropped ${String(catalog.dropped)} malformed catalog entries`)
  }
  if (dropped.length > 0) {
    console.warn(`[coinbase] could not price: ${dropped.join(', ')}`)
  }

  return { assets, dropped, fetchedAt: now() }
}

export interface CoinbaseClient {
  getDashboardData(): Promise<DashboardData>
  invalidate(): void
}

export interface CoinbaseClientOptions {
  readonly ttlMs?: number
  readonly timeoutMs?: number
  /** Injected so tests control time instead of sleeping. */
  readonly now?: () => number
}

export function createCoinbaseClient(options: CoinbaseClientOptions = {}): CoinbaseClient {
  const now = options.now ?? Date.now
  const timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS

  const cache = createTtlCache(() => loadDashboardData(now, timeoutMs), {
    ttlMs: options.ttlMs ?? CACHE_TTL_MS,
    now,
  })

  return {
    getDashboardData: () => cache.get(),
    invalidate: () => {
      cache.invalidate()
    },
  }
}
