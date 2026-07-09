import type { CurrencySymbol } from '../domain'

/**
 * Move `active` so that it sits where `over` currently sits.
 *
 * Deliberately expressed in symbols, never in indices.
 *
 * The cards a user drags are the *filtered* cards. Filter to "e", see
 * [ETH, XRP, DOGE], drag ETH below DOGE — those are visible indices 0 and 2.
 * But in the full ordering of twelve coins, ETH sits at index 1 and DOGE at
 * index 9. Applying the visible indices to the full list silently reorders two
 * unrelated cards that the user cannot see, so the corruption is never noticed.
 *
 * dnd-kit hands us `active.id` and `over.id`, which are symbols. Working only
 * with those makes the function correct under any filter, including none,
 * because it never mentions a position at all.
 *
 * Unknown symbols and self-moves are no-ops. The input is never mutated.
 */
export function reorder(
  ordering: readonly CurrencySymbol[],
  active: CurrencySymbol,
  over: CurrencySymbol,
): CurrencySymbol[] {
  if (active === over) return [...ordering]

  const from = ordering.indexOf(active)
  const to = ordering.indexOf(over)
  if (from === -1 || to === -1) return [...ordering]

  const next = [...ordering]
  next.splice(from, 1)
  next.splice(to, 0, active)
  return next
}
