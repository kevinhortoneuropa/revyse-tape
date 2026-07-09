import { describe, expect, it } from 'vitest'

import type { BtcPrice, UsdPrice } from '../domain'

import { formatBtc, formatUsd } from './format'

const usd = (n: number) => n as UsdPrice
const btc = (n: number) => n as BtcPrice

describe('formatUsd', () => {
  it('groups thousands and shows cents above $1', () => {
    expect(formatUsd(usd(63_213.17))).toBe('$63,213.17')
    expect(formatUsd(usd(1745.68))).toBe('$1,745.68')
    expect(formatUsd(usd(1.097))).toBe('$1.10')
  })

  it('shows up to four decimals between one cent and one dollar', () => {
    expect(formatUsd(usd(0.167))).toBe('$0.167')
    expect(formatUsd(usd(0.0732))).toBe('$0.0732')
    expect(formatUsd(usd(0.16789))).toBe('$0.1679')
  })

  // Two fixed decimals would render every one of these as "$0.00", silently
  // telling the user that a real asset is worthless.
  it('preserves sub-cent prices with significant digits', () => {
    expect(formatUsd(usd(0.00000429))).toBe('$0.00000429')
    expect(formatUsd(usd(0.00000262))).toBe('$0.00000262')
    expect(formatUsd(usd(0.00000429))).not.toBe('$0.00')
  })

  it('switches formatting exactly at the tier boundaries', () => {
    expect(formatUsd(usd(1))).toBe('$1.00')
    expect(formatUsd(usd(0.999))).toBe('$0.999')
    expect(formatUsd(usd(0.01))).toBe('$0.01')
    expect(formatUsd(usd(0.009))).toBe('$0.009')
  })

  // Guards against a locale-dependent SSR/hydration mismatch: an unpinned
  // Intl.NumberFormat would emit "63.213,17" on a de-DE server.
  it('is locale-pinned regardless of the host locale', () => {
    expect(formatUsd(usd(63_213.17))).toContain(',')
    expect(formatUsd(usd(63_213.17))).toMatch(/^\$\d{2},\d{3}\.\d{2}$/)
  })
})

describe('formatBtc', () => {
  it('quotes BTC against itself as exactly one', () => {
    expect(formatBtc(btc(1))).toBe('1.00000000 BTC')
  })

  it('uses satoshi precision — eight decimals', () => {
    expect(formatBtc(btc(0.027615764))).toBe('0.02761576 BTC')
    expect(formatBtc(btc(0.0012342365))).toBe('0.00123424 BTC')
    expect(formatBtc(btc(0.0000011576702))).toBe('0.00000116 BTC')
  })

  // Below one satoshi, eight fixed decimals round to zero. SHIB's real BTC
  // price is 6.8e-11 and must not render as "0.00000000 BTC".
  it('falls back to significant digits below one satoshi', () => {
    const formatted = formatBtc(btc(6.78656e-11))

    expect(formatted).not.toBe('0.00000000 BTC')
    expect(formatted).toBe('0.00000000006787 BTC')
  })

  it('switches formatting exactly at one satoshi', () => {
    expect(formatBtc(btc(1e-8))).toBe('0.00000001 BTC')
    expect(formatBtc(btc(9.9e-9))).toBe('0.0000000099 BTC')
  })

  it('reuses cached formatter instances across calls', () => {
    expect(formatBtc(btc(1))).toBe(formatBtc(btc(1)))
    expect(formatUsd(usd(5))).toBe(formatUsd(usd(5)))
  })
})
