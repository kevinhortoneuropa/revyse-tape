import { z } from 'zod'

/**
 * Zod runs at trust boundaries and nowhere else.
 *
 * There are exactly two in this app: Coinbase -> our server (here), and the URL
 * -> our app (see `app/lib/url`). The boundary that does *not* exist is
 * loader -> useLoaderData: that data is ours, we merely serialised it.
 * Re-validating it on the client would double-parse and drag Zod into the
 * browser bundle for no added safety.
 *
 * Types are inferred from these schemas, never hand-written, so the schema is
 * the single source of truth for the shape.
 */

/** A colour we can render a monogram with, if Coinbase sends something odd. */
const FALLBACK_COLOR = '#6b7280'

/**
 * One entry from `GET /v2/currencies/crypto`.
 *
 * `exponent` is the token's atomic-unit precision (18 for most ERC-20s), *not*
 * a display hint. Formatting a price to 18 decimals renders
 * `$0.000000000000000001`. It is parsed for completeness and deliberately unused.
 */
export const catalogAssetSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .catch(FALLBACK_COLOR),
  exponent: z.number().int().nonnegative(),
})

export type CatalogAsset = z.infer<typeof catalogAssetSchema>

/**
 * The envelope is strict and its failure is fatal: a response without `data` is
 * an outage, and rendering an empty dashboard would dress it up as a success.
 * The *elements* are `unknown` so a single malformed asset out of 408 can be
 * dropped rather than taking the page down. See `parseCatalog`.
 */
export const catalogEnvelopeSchema = z.object({
  data: z.array(z.unknown()),
})

/**
 * `GET /v2/exchange-rates?currency=USD`.
 *
 * Values stay strings here. The map holds 635 entries — fiat currencies mixed in
 * with crypto — and only the dozen we track are ever converted to a Rate. Fiat
 * is excluded structurally, by joining against the crypto catalog, rather than
 * by a blocklist that would rot.
 */
export const ratesEnvelopeSchema = z.object({
  data: z.object({
    currency: z.literal('USD'),
    rates: z.record(z.string(), z.string()),
  }),
})

export type RatesResponse = z.infer<typeof ratesEnvelopeSchema>['data']

export interface ParsedCatalog {
  readonly assets: readonly CatalogAsset[]
  /** How many entries failed validation. Surfaced so silent decay is visible. */
  readonly dropped: number
}

/**
 * Two-tier failure. A broken envelope throws; a broken element is dropped.
 *
 * @throws {z.ZodError} when the envelope itself is malformed.
 */
export function parseCatalog(payload: unknown): ParsedCatalog {
  const { data } = catalogEnvelopeSchema.parse(payload)

  const assets: CatalogAsset[] = []
  let dropped = 0

  for (const entry of data) {
    const result = catalogAssetSchema.safeParse(entry)
    if (result.success) assets.push(result.data)
    else dropped += 1
  }

  return { assets, dropped }
}

/** @throws {z.ZodError} when the envelope is malformed. */
export function parseRates(payload: unknown): RatesResponse {
  return ratesEnvelopeSchema.parse(payload).data
}
