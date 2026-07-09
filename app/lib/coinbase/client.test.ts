import { HttpResponse, delay, http } from 'msw'
import { setupServer } from 'msw/node'
import { ZodError } from 'zod'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createCoinbaseClient } from './client'
import { CoinbaseDataError, CoinbaseUnavailableError } from './errors'
import { catalogFixture, ratesFixture } from './fixtures'

const CATALOG = 'https://api.coinbase.com/v2/currencies/crypto'
const RATES = 'https://api.coinbase.com/v2/exchange-rates'

let catalogHits = 0
let ratesHits = 0

const ok = () => [
  http.get(CATALOG, () => {
    catalogHits += 1
    return HttpResponse.json(catalogFixture)
  }),
  http.get(RATES, () => {
    ratesHits += 1
    return HttpResponse.json(ratesFixture)
  }),
]

const server = setupServer(...ok())

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})
beforeEach(() => {
  catalogHits = 0
  ratesHits = 0
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})
afterEach(() => {
  server.resetHandlers(...ok())
})
afterAll(() => {
  server.close()
})

const client = () => createCoinbaseClient({ ttlMs: 0, timeoutMs: 500 })

describe('createCoinbaseClient', () => {
  describe('the happy path', () => {
    it('returns every tracked asset, priced in USD and BTC', async () => {
      const data = await client().getDashboardData()

      expect(data.assets).toHaveLength(12)
      expect(data.dropped).toEqual([])
      expect(data.fetchedAt).toBeGreaterThan(0)
    })

    it('preserves tracked order rather than the catalog listing order', async () => {
      const { assets } = await client().getDashboardData()

      expect(assets.map((a) => a.symbol)).toEqual([
        'BTC',
        'ETH',
        'SOL',
        'XRP',
        'ADA',
        'DOGE',
        'AVAX',
        'LINK',
        'DOT',
        'LTC',
        'BCH',
        'UNI',
      ])
    })

    it('joins identity from the catalog onto price from the rates map', async () => {
      const { assets } = await client().getDashboardData()
      const btc = assets.find((a) => a.symbol === 'BTC')

      expect(btc).toMatchObject({ name: 'Bitcoin', color: '#F7931A' })
      expect(btc?.usd).toBeCloseTo(63_213.17, 2)
      expect(btc?.btc).toBe(1)
    })

    // The rates map mixes 635 fiat and crypto keys. Filtering structurally, by
    // joining against the crypto catalog, is what keeps the Afghan afghani off
    // a cryptocurrency dashboard.
    it('never emits a fiat currency', async () => {
      const { assets } = await client().getDashboardData()
      const symbols = assets.map((a) => a.symbol)

      expect(symbols).not.toContain('AED')
      expect(symbols).not.toContain('ALL')
    })

    it('ignores catalog assets we do not track', async () => {
      const { assets } = await client().getDashboardData()
      expect(assets.map((a) => a.symbol)).not.toContain('ZEC')
    })

    it('fetches catalog and rates in parallel', async () => {
      await client().getDashboardData()
      expect(catalogHits).toBe(1)
      expect(ratesHits).toBe(1)
    })
  })

  describe('when Coinbase is unavailable', () => {
    it.each([500, 502, 429, 404])('throws on HTTP %i', async (status) => {
      server.use(http.get(RATES, () => new HttpResponse(null, { status })))
      await expect(client().getDashboardData()).rejects.toThrow(CoinbaseUnavailableError)
    })

    it('throws on a network error', async () => {
      server.use(http.get(CATALOG, () => HttpResponse.error()))
      await expect(client().getDashboardData()).rejects.toThrow(CoinbaseUnavailableError)
    })

    it('throws on malformed JSON', async () => {
      server.use(
        http.get(RATES, () =>
          HttpResponse.text('<html>maintenance</html>', {
            headers: { 'content-type': 'application/json' },
          }),
        ),
      )
      await expect(client().getDashboardData()).rejects.toThrow(CoinbaseUnavailableError)
    })

    // A dashboard that hangs forever is worse than one that says the feed is down.
    it('times out a slow response', async () => {
      server.use(
        http.get(RATES, async () => {
          await delay(2000)
          return HttpResponse.json(ratesFixture)
        }),
      )
      await expect(client().getDashboardData()).rejects.toThrow(CoinbaseUnavailableError)
    })
  })

  describe('when the payload is wrong', () => {
    // A missing envelope is an outage. Rendering an empty dashboard would dress
    // it up as a success.
    it('throws when the envelope has no data key', async () => {
      server.use(http.get(CATALOG, () => HttpResponse.json({ nope: true })))
      await expect(client().getDashboardData()).rejects.toThrow(ZodError)
    })

    it('throws when the rates map is not a map of strings', async () => {
      server.use(
        http.get(RATES, () => HttpResponse.json({ data: { currency: 'USD', rates: { BTC: 42 } } })),
      )
      await expect(client().getDashboardData()).rejects.toThrow(ZodError)
    })

    // One bad asset among 408 must not take the page down.
    it('drops a malformed catalog entry and renders the rest', async () => {
      server.use(
        http.get(CATALOG, () =>
          HttpResponse.json({
            data: [...catalogFixture.data, { code: 'BAD', name: 42, exponent: -1 }],
          }),
        ),
      )

      const { assets } = await client().getDashboardData()
      expect(assets).toHaveLength(12)
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('1 malformed catalog'))
    })

    it('substitutes a fallback colour rather than dropping the asset', async () => {
      const data = structuredClone(catalogFixture)
      data.data[0]!.color = 'not-a-colour'
      server.use(http.get(CATALOG, () => HttpResponse.json(data)))

      const { assets } = await client().getDashboardData()
      expect(assets.find((a) => a.symbol === 'BTC')?.color).toBe('#6b7280')
    })
  })

  describe('when an asset cannot be priced', () => {
    // MATIC was renamed to POL and left the catalog. Any tracked list eventually
    // names a symbol Coinbase no longer has.
    it('drops a tracked asset missing from the catalog', async () => {
      const data = { data: catalogFixture.data.filter((a) => a.code !== 'SOL') }
      server.use(http.get(CATALOG, () => HttpResponse.json(data)))

      const { assets, dropped } = await client().getDashboardData()
      expect(dropped).toEqual(['SOL'])
      expect(assets).toHaveLength(11)
      expect(assets.map((a) => a.symbol)).not.toContain('SOL')
    })

    it('drops a tracked asset the rates map omits entirely', async () => {
      const data = structuredClone(ratesFixture)
      // Listed in the catalog, but Coinbase publishes no rate for it.
      delete (data.data.rates as Record<string, string>)['UNI']
      server.use(http.get(RATES, () => HttpResponse.json(data)))

      const { assets, dropped } = await client().getDashboardData()
      expect(dropped).toEqual(['UNI'])
      expect(assets).toHaveLength(11)
    })

    // A delisted asset can carry "0", whose reciprocal is Infinity — "$∞".
    it('drops an asset whose rate is zero rather than rendering infinity', async () => {
      const data = structuredClone(ratesFixture)
      data.data.rates.DOGE = '0'
      server.use(http.get(RATES, () => HttpResponse.json(data)))

      const { assets, dropped } = await client().getDashboardData()
      expect(dropped).toEqual(['DOGE'])
      expect(assets.every((a) => Number.isFinite(a.usd))).toBe(true)
    })

    it('drops an asset whose rate is not a number', async () => {
      const data = structuredClone(ratesFixture)
      data.data.rates.ADA = 'null'
      server.use(http.get(RATES, () => HttpResponse.json(data)))

      const { dropped } = await client().getDashboardData()
      expect(dropped).toEqual(['ADA'])
    })

    // A denormally small rate is positive and finite, so it survives toRate —
    // but its reciprocal overflows to Infinity inside deriveQuote.
    it('drops an asset whose price overflows', async () => {
      const data = structuredClone(ratesFixture)
      data.data.rates.ADA = '5e-324'
      server.use(http.get(RATES, () => HttpResponse.json(data)))

      const { assets, dropped } = await client().getDashboardData()
      expect(dropped).toEqual(['ADA'])
      expect(assets).toHaveLength(11)
    })

    // Without BTC there is no BTC column at all, for any card.
    it('fails outright when BTC itself cannot be priced', async () => {
      const data = structuredClone(ratesFixture)
      data.data.rates.BTC = '0'
      server.use(http.get(RATES, () => HttpResponse.json(data)))

      await expect(client().getDashboardData()).rejects.toThrow(CoinbaseDataError)
    })

    // Fewer than ten cards is not a display problem, it is an upstream signal.
    it('fails when too few tracked assets survive', async () => {
      const data = { data: catalogFixture.data.filter((a) => ['BTC', 'ETH'].includes(a.code)) }
      server.use(http.get(CATALOG, () => HttpResponse.json(data)))

      await expect(client().getDashboardData()).rejects.toThrow(/Only 2 of 12/)
    })
  })

  describe('caching', () => {
    it('serves a second call from cache without touching the network', async () => {
      const c = createCoinbaseClient({ ttlMs: 10_000 })

      await c.getDashboardData()
      await c.getDashboardData()

      expect(catalogHits).toBe(1)
      expect(ratesHits).toBe(1)
    })

    it('refetches after invalidate()', async () => {
      const c = createCoinbaseClient({ ttlMs: 10_000 })

      await c.getDashboardData()
      c.invalidate()
      await c.getDashboardData()

      expect(catalogHits).toBe(2)
    })

    it('collapses a stampede of concurrent callers into one upstream fetch', async () => {
      const c = createCoinbaseClient({ ttlMs: 10_000 })

      await Promise.all(Array.from({ length: 20 }, () => c.getDashboardData()))

      expect(catalogHits).toBe(1)
      expect(ratesHits).toBe(1)
    })

    it('works with no options at all, using the production defaults', async () => {
      const { assets } = await createCoinbaseClient().getDashboardData()
      expect(assets).toHaveLength(12)
    })
  })
})
