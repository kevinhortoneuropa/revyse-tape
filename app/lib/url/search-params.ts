import { z } from 'zod'

/**
 * The URL is a trust boundary, and the second of exactly two in this app.
 *
 * `?q=` is shareable, which means anyone can hand anyone else a link with
 * anything in it. Parsing must therefore be *total*: every possible input maps
 * to a valid filter, and nothing throws. A dashboard that 500s because someone
 * pasted a 10MB query string is a dashboard with a denial-of-service in it.
 */
export const FILTER_MAX_LENGTH = 64

const filterSchema = z
  .string()
  // eslint-disable-next-line no-control-regex -- stripping control characters is the point
  .transform((value) => value.replace(/[\u0000-\u001f\u007f]/g, ''))
  .transform((value) => value.trim().slice(0, FILTER_MAX_LENGTH))
  .catch('')

export interface DashboardSearch {
  readonly q: string
}

/** Never throws. An unparseable query yields an empty filter, showing everything. */
export function parseDashboardSearch(params: URLSearchParams): DashboardSearch {
  return { q: filterSchema.parse(params.get('q') ?? '') }
}
