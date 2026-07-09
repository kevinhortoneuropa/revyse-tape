import type { CurrencySymbol } from '../domain'

/**
 * Which assets the dashboard tracks.
 *
 * This is a product decision, so it is code rather than data. Coinbase's catalog
 * carries 408 crypto assets and its `sort_index` is *listing order*, not
 * popularity — the first twelve by sort_index are the 2018 Coinbase listings,
 * which include Augur and Orchid and omit Solana entirely. The brief names SOL
 * explicitly, so a derived ranking is not an option.
 *
 * Identity is still dynamic: name, colour and price all come from the API. Only
 * the *selection* is fixed here.
 *
 * Twelve are tracked so the brief's "at least 10" survives a delisting or two.
 * See `MINIMUM_ASSETS`.
 */
export const TRACKED_SYMBOLS = [
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
] as const satisfies readonly string[]

/**
 * The brief requires at least ten cards. Individual assets may vanish from
 * Coinbase without warning — MATIC was renamed to POL and left the catalog — so
 * missing symbols are dropped rather than fatal. Dropping below this count is
 * not a display problem, it is a signal that something is wrong upstream, and
 * it fails loudly.
 */
export const MINIMUM_ASSETS = 10

/** The symbol every Quote is denominated against, besides USD. */
export const BTC = 'BTC' as CurrencySymbol
