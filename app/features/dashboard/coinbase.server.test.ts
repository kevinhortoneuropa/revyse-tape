import { beforeEach, describe, expect, it } from 'vitest'

import type { Env } from '~/env'

import { getCoinbaseClient } from './coinbase.server'

const globalRef = globalThis as typeof globalThis & { __coinbaseClients?: Map<string, unknown> }

beforeEach(() => {
  globalRef.__coinbaseClients?.clear()
})

describe('getCoinbaseClient', () => {
  // The TTL cache and its single-flight de-duplication only bound upstream load
  // if the same client is reused across requests. A fresh client per request
  // would fetch Coinbase on every page view.
  it('returns the same client for the same configuration', () => {
    const env: Env = { COINBASE_BASE_URL: 'http://localhost:4010' }
    expect(getCoinbaseClient(env)).toBe(getCoinbaseClient(env))
  })

  it('memoises across distinct env objects with equal values', () => {
    const a = getCoinbaseClient({ COINBASE_BASE_URL: 'http://a' })
    const b = getCoinbaseClient({ COINBASE_BASE_URL: 'http://a' })
    expect(a).toBe(b)
  })

  // A preview deployment pointed at a staging upstream must not be served the
  // production client out of the memo.
  it('builds a distinct client per base URL', () => {
    expect(getCoinbaseClient({ COINBASE_BASE_URL: 'http://a' })).not.toBe(
      getCoinbaseClient({ COINBASE_BASE_URL: 'http://b' }),
    )
  })

  it('builds a distinct client per TTL', () => {
    expect(getCoinbaseClient({ COINBASE_CACHE_TTL_MS: '0' })).not.toBe(
      getCoinbaseClient({ COINBASE_CACHE_TTL_MS: '10000' }),
    )
  })

  // The production case: nothing configured, so the client uses its defaults.
  it('works with an empty env', () => {
    const client = getCoinbaseClient({})
    expect(typeof client.getDashboardData).toBe('function')
    expect(getCoinbaseClient({})).toBe(client)
  })

  // Vite re-evaluates modules on every change; a plain module-level map would
  // hand each hot reload an empty cache and hammer Coinbase during development.
  it('keeps the memo on globalThis so a hot reload does not discard it', () => {
    getCoinbaseClient({})
    expect(globalRef.__coinbaseClients).toBeInstanceOf(Map)
  })
})
