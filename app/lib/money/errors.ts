/** Thrown when a value cannot be a Rate: zero, negative, or non-finite. */
export class InvalidRateError extends Error {
  override readonly name = 'InvalidRateError'

  constructor(readonly value: unknown) {
    super(`Expected a finite positive rate, received ${String(value)}`)
  }
}

/** Thrown when a derived price is not a finite positive number. */
export class InvalidPriceError extends Error {
  override readonly name = 'InvalidPriceError'

  constructor(readonly value: unknown) {
    super(`Expected a finite positive price, received ${String(value)}`)
  }
}
