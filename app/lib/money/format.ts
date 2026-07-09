import type { BtcPrice, UsdPrice } from '../domain'

/**
 * Every formatter is pinned to `en-US`.
 *
 * Left unset, `Intl.NumberFormat` resolves to the *server's* locale during SSR
 * and the *browser's* locale during hydration. A reviewer in Berlin would get
 * `63.213,17` from the server and `63,213.17` from the client, and React would
 * throw a hydration mismatch on the price text. The bug is invisible in dev on
 * a US machine, which is exactly what makes it worth pinning.
 */
const LOCALE = 'en-US'

/** One satoshi. Below this, fixed decimals would render a real price as zero. */
const SATOSHI = 1e-8

/** `Intl.NumberFormat` construction is expensive; the instances are immutable. */
const cache = new Map<string, Intl.NumberFormat>()

function formatter(key: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const existing = cache.get(key)
  if (existing) return existing

  const created = new Intl.NumberFormat(LOCALE, options)
  cache.set(key, created)
  return created
}

/**
 * Prices span nine orders of magnitude — BTC near $63,000, PEPE near
 * $0.0000026 — so precision has to follow magnitude. Two fixed decimals would
 * render most of the long tail as `$0.00`.
 */
export function formatUsd(price: UsdPrice): string {
  if (price >= 1) {
    return formatter('usd-large', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price)
  }

  if (price >= 0.01) {
    return formatter('usd-mid', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(price)
  }

  // Sub-cent. Significant digits rather than fraction digits, so a price of
  // 0.0000042 keeps its information instead of collapsing to $0.00.
  return formatter('usd-small', {
    style: 'currency',
    currency: 'USD',
    maximumSignificantDigits: 4,
  }).format(price)
}

/**
 * BTC prices are conventionally quoted to eight decimals — one satoshi. Assets
 * cheaper than a satoshi's worth of BTC fall back to significant digits.
 *
 * Returns a bare number. The unit belongs to the label beside it, so a screen
 * reader hears "BTC, 1.00000000" rather than "BTC, 1.00000000 BTC".
 */
export function formatBtc(price: BtcPrice): string {
  if (price >= SATOSHI) {
    return formatter('btc-normal', {
      minimumFractionDigits: 8,
      maximumFractionDigits: 8,
    }).format(price)
  }

  return formatter('btc-dust', { maximumSignificantDigits: 4 }).format(price)
}
