import type { BtcPrice, CurrencySymbol, Quote, Rate, UsdPrice } from '../domain'

import { InvalidPriceError, InvalidRateError } from './errors'

const isPositiveFinite = (value: number): boolean => Number.isFinite(value) && value > 0

/**
 * The only way to construct a Rate.
 *
 * Coinbase serves rates as decimal strings, and a delisted asset can carry
 * `"0"`. Since a price is the reciprocal of a rate, a zero rate yields Infinity
 * and renders as `$∞`. Rejecting it here means every downstream division is
 * total: `deriveQuote` cannot divide by zero, because a zero Rate cannot exist.
 */
export function toRate(value: number): Rate {
  if (!isPositiveFinite(value)) throw new InvalidRateError(value)
  return value as Rate
}

export function toUsdPrice(value: number): UsdPrice {
  if (!isPositiveFinite(value)) throw new InvalidPriceError(value)
  return value as UsdPrice
}

export function toBtcPrice(value: number): BtcPrice {
  if (!isPositiveFinite(value)) throw new InvalidPriceError(value)
  return value as BtcPrice
}

/**
 * Coinbase's `/v2/exchange-rates?currency=USD` returns how many units of an
 * asset one dollar buys — `rates.ADA = "5.99"` means 5.99 ADA per dollar, not
 * $5.99. Reading it as a price produces a plausible-looking dashboard that is
 * entirely wrong, so both conversions are stated explicitly:
 *
 *   usd = 1 / rate                 dollars per unit
 *   btc = btcRate / rate           (BTC per USD) / (asset per USD)
 *
 * For BTC itself the second reduces to exactly 1.
 *
 * @throws {InvalidPriceError} if a rate is so extreme the reciprocal overflows.
 */
export function deriveQuote(symbol: CurrencySymbol, rate: Rate, btcRate: Rate): Quote {
  return {
    symbol,
    usd: toUsdPrice(1 / rate),
    btc: toBtcPrice(btcRate / rate),
  }
}
