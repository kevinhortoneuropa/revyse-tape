import { createCoinbaseClient, type CoinbaseClient } from '~/lib/coinbase/client'

/**
 * One client per process, so the TTL cache is shared across requests.
 *
 * Stashed on globalThis because Vite's dev server re-evaluates modules on every
 * change: a plain module-level const would give each hot reload a fresh, empty
 * cache and hammer Coinbase during development.
 */
const globalRef = globalThis as typeof globalThis & { __coinbaseClient?: CoinbaseClient }

export const coinbase: CoinbaseClient = (globalRef.__coinbaseClient ??= createCoinbaseClient())
