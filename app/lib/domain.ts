import type { Brand } from './branded'

/** An Asset's short uppercase ticker code, e.g. `BTC`. */
export type CurrencySymbol = Brand<string, 'CurrencySymbol'>

/** The identity of a cryptocurrency. Stable across refreshes. */
export interface Asset {
  readonly symbol: CurrencySymbol
  readonly name: string
  /** Coinbase's brand colour, used by the card icon's monogram fallback. */
  readonly color: string
}

/**
 * An Asset's price at a single instant, in USD and in BTC.
 * Replaced wholesale on every refresh — never mutated, never reordered.
 */
export interface Quote {
  readonly symbol: CurrencySymbol
  readonly usd: UsdPrice
  readonly btc: BtcPrice
}

/** An Asset together with its current Quote. What a card renders. */
export interface QuotedAsset extends Asset {
  readonly usd: UsdPrice
  readonly btc: BtcPrice
}

/**
 * A raw Coinbase value: how many units of an Asset one US dollar buys.
 * The reciprocal of a price. Never displayed.
 */
export type Rate = Brand<number, 'Rate'>

/** An Asset's price in US dollars. */
export type UsdPrice = Brand<number, 'UsdPrice'>

/** An Asset's price in Bitcoin. `BTC` itself is always exactly 1. */
export type BtcPrice = Brand<number, 'BtcPrice'>
