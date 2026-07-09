import type { CurrencySymbol, QuotedAsset } from '../domain'
import { deriveQuote, toRate } from '../money/derive'

import { BTC, MINIMUM_ASSETS, TRACKED_SYMBOLS } from './assets'
import { CoinbaseDataError } from './errors'
import type { CatalogAsset, RatesResponse } from './schemas'

export interface QuotedAssets {
  readonly assets: readonly QuotedAsset[]
  /** Tracked symbols we could not price this cycle. */
  readonly dropped: readonly string[]
}

function readRate(rates: RatesResponse['rates'], symbol: string) {
  const raw = rates[symbol]
  if (raw === undefined) return undefined

  try {
    return toRate(Number(raw))
  } catch {
    // A delisted asset can carry "0", whose reciprocal is Infinity.
    return undefined
  }
}

/**
 * Join the catalog (identity) with the rates map (price) and derive both quotes.
 *
 * The join is keyed by symbol, and the output preserves TRACKED_SYMBOLS order —
 * never the catalog's, which is Coinbase's listing order and meaningless here.
 * The client owns the real ordering anyway.
 *
 * Individual assets are dropped when Coinbase stops listing them or sends an
 * unusable rate; that is normal, and MATIC's rename to POL is the worked
 * example. Dropping below MINIMUM_ASSETS is not normal, and throws.
 *
 * @throws {CoinbaseDataError} if BTC cannot be priced, or too few assets survive.
 */
export function quoteAssets(catalog: readonly CatalogAsset[], rates: RatesResponse): QuotedAssets {
  // Without a BTC rate, not one card can show its BTC price.
  const btcRate = readRate(rates.rates, BTC)
  if (btcRate === undefined) {
    throw new CoinbaseDataError('Coinbase returned no usable BTC rate')
  }

  const byCode = new Map(catalog.map((asset) => [asset.code, asset]))

  const assets: QuotedAsset[] = []
  const dropped: string[] = []

  for (const symbol of TRACKED_SYMBOLS) {
    const asset = byCode.get(symbol)
    const rate = readRate(rates.rates, symbol)

    if (asset === undefined || rate === undefined) {
      dropped.push(symbol)
      continue
    }

    try {
      const quote = deriveQuote(symbol as CurrencySymbol, rate, btcRate)
      assets.push({
        symbol: quote.symbol,
        name: asset.name,
        color: asset.color,
        usd: quote.usd,
        btc: quote.btc,
      })
    } catch {
      // A rate whose reciprocal overflows. Vanishingly rare, never fatal.
      dropped.push(symbol)
    }
  }

  if (assets.length < MINIMUM_ASSETS) {
    throw new CoinbaseDataError(
      `Only ${String(assets.length)} of ${String(TRACKED_SYMBOLS.length)} tracked assets could be priced (need ${String(MINIMUM_ASSETS)}). Dropped: ${dropped.join(', ')}`,
    )
  }

  return { assets, dropped }
}
