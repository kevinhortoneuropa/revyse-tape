import { describe, expect, it } from 'vitest'

import type { CurrencySymbol } from '../domain'

import { deriveQuote, toBtcPrice, toRate, toUsdPrice } from './derive'
import { InvalidPriceError, InvalidRateError } from './errors'

const sym = (s: string) => s as CurrencySymbol

// Real values from GET /v2/exchange-rates?currency=USD (units per 1 USD).
//
// Coinbase serves up to 20 significant digits; a float64 holds about 17. DOGE's
// true rate is "13.6649357748018584" and truncates to ...858 on parse. That is
// fine, and is why this project carries no decimal library: the loss lands
// around the 17th significant digit, while the UI displays at most 8. A decimal
// type could not recover precision the API never sent us anyway.
const RATE_BTC = 0.000015819488249
const RATE_ETH = 0.0005728426744879
const RATE_DOGE = 13.664935774801858

describe('toRate', () => {
  it('accepts a finite positive number', () => {
    expect(toRate(RATE_BTC)).toBe(RATE_BTC)
  })

  // A delisted asset can carry a "0" rate. Because a price is the reciprocal of
  // a rate, letting zero through renders "$∞" on the dashboard.
  it.each([0, -0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects %p',
    (value) => {
      expect(() => toRate(value)).toThrow(InvalidRateError)
    },
  )

  it('reports the offending value on the error', () => {
    expect(() => toRate(0)).toThrow(/received 0/)
  })
})

describe('toUsdPrice / toBtcPrice', () => {
  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('toUsdPrice rejects %p', (value) => {
    expect(() => toUsdPrice(value)).toThrow(InvalidPriceError)
  })

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('toBtcPrice rejects %p', (value) => {
    expect(() => toBtcPrice(value)).toThrow(InvalidPriceError)
  })

  it('accepts finite positive values', () => {
    expect(toUsdPrice(1.5)).toBe(1.5)
    expect(toBtcPrice(1.5)).toBe(1.5)
  })
})

describe('deriveQuote', () => {
  const btcRate = toRate(RATE_BTC)

  // The single most important assertion in this codebase. Coinbase's rates are
  // units-per-USD, not dollars-per-unit. Reading them the obvious way produces
  // a dashboard that looks right and is completely wrong.
  it('treats a rate as the reciprocal of a price, not as a price', () => {
    const quote = deriveQuote(sym('DOGE'), toRate(RATE_DOGE), btcRate)

    // 13.66 DOGE per dollar means about 7 cents each — NOT $13.66.
    expect(quote.usd).toBeCloseTo(0.0732, 4)
    expect(quote.usd).toBeLessThan(1)
  })

  it('prices BTC against itself at exactly 1', () => {
    const quote = deriveQuote(sym('BTC'), btcRate, btcRate)

    expect(quote.btc).toBe(1)
    expect(quote.usd).toBeCloseTo(63_213.17, 2)
  })

  it('derives the BTC price as the ratio of the two rates', () => {
    const quote = deriveQuote(sym('ETH'), toRate(RATE_ETH), btcRate)

    expect(quote.btc).toBeCloseTo(RATE_BTC / RATE_ETH, 12)
    expect(quote.btc).toBeCloseTo(0.0276, 4)
    expect(quote.usd).toBeCloseTo(1745.68, 2)
  })

  it('carries the symbol through untouched', () => {
    expect(deriveQuote(sym('SOL'), toRate(0.0128172263522174), btcRate).symbol).toBe('SOL')
  })

  it('is exactly invertible for the USD leg', () => {
    const rate = toRate(RATE_ETH)
    expect(1 / deriveQuote(sym('ETH'), rate, btcRate).usd).toBeCloseTo(rate, 12)
  })

  // A rate cannot be zero, but it can be denormally small, and the reciprocal
  // of 5e-324 overflows to Infinity. The price constructors catch it.
  it('rejects a rate whose reciprocal overflows to Infinity', () => {
    expect(() => deriveQuote(sym('X'), toRate(Number.MIN_VALUE), btcRate)).toThrow(
      InvalidPriceError,
    )
  })

  it('rejects a quote whose BTC leg underflows to zero', () => {
    // A denormal BTC rate divided by a huge asset rate rounds to exactly 0,
    // which would render the asset as costing nothing at all.
    const denormalBtcRate = toRate(Number.MIN_VALUE)

    expect(() => deriveQuote(sym('X'), toRate(1e300), denormalBtcRate)).toThrow(InvalidPriceError)
  })

  it('tolerates rates at the far end of the float range without overflowing', () => {
    // 1 / MAX_VALUE is denormal but positive, so this is a valid — if absurd —
    // quote rather than an error. Documents where the boundary actually sits.
    const quote = deriveQuote(sym('X'), toRate(Number.MAX_VALUE), btcRate)

    expect(quote.usd).toBeGreaterThan(0)
    expect(quote.btc).toBeGreaterThan(0)
  })
})
