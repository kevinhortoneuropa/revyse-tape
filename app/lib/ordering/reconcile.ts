import type { CurrencySymbol } from '../domain'

/**
 * Bring a stored Ordering back into agreement with the symbols the server
 * actually returned.
 *
 * Ordering is client-owned and outlives the data: it is restored from
 * localStorage on a later visit, and the loader revalidates every 30 seconds.
 * Between those moments Coinbase can delist an asset (MATIC vanished when it
 * became POL) or we can add one to the tracked list. Either way the stored list
 * and the fresh quotes disagree.
 *
 * The rule:
 *   - symbols the server no longer sends are dropped
 *   - symbols the server sends that the user has never seen are appended
 *   - everything else keeps the user's arrangement
 *
 * Appending rather than inserting matters: a new asset must never displace a
 * card the user deliberately placed. Duplicates in the stored value — a
 * corrupted or hand-edited localStorage entry — collapse to their first
 * occurrence.
 */
export function reconcile(
  ordering: readonly CurrencySymbol[],
  available: readonly CurrencySymbol[],
): CurrencySymbol[] {
  const availableSet = new Set(available)
  const seen = new Set<CurrencySymbol>()

  const kept = ordering.filter((symbol) => {
    if (!availableSet.has(symbol) || seen.has(symbol)) return false
    seen.add(symbol)
    return true
  })

  const appended = available.filter((symbol) => !seen.has(symbol))

  return [...kept, ...appended]
}
