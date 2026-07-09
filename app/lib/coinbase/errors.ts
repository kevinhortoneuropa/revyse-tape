/**
 * Coinbase was unreachable, too slow, or returned a non-2xx status.
 * Transient: the next revalidation may well succeed.
 */
export class CoinbaseUnavailableError extends Error {
  override readonly name = 'CoinbaseUnavailableError'
}

/**
 * Coinbase responded, but the payload cannot produce a usable dashboard —
 * BTC is unpriceable, or too few tracked assets survived validation.
 */
export class CoinbaseDataError extends Error {
  override readonly name = 'CoinbaseDataError'
}
