/** The fields a user can match against: the Asset's name and its Symbol. */
export interface Filterable {
  readonly name: string
  readonly symbol: string
}

/**
 * Case-insensitive substring match on name or symbol.
 *
 * Substring rather than prefix: the brief's example is typing "eth" to find
 * Ethereum, and a user typing "coin" reasonably expects Bitcoin. An empty
 * filter matches everything rather than nothing — the difference between an
 * unfiltered dashboard and an empty one.
 */
export function matches(item: Filterable, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (needle === '') return true

  return item.symbol.toLowerCase().includes(needle) || item.name.toLowerCase().includes(needle)
}

export function filterAssets<T extends Filterable>(items: readonly T[], query: string): T[] {
  return items.filter((item) => matches(item, query))
}
