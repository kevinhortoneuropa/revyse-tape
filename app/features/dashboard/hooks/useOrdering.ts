import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { z } from 'zod'

import type { CurrencySymbol } from '~/lib/domain'
import { reconcile } from '~/lib/ordering/reconcile'
import { reorder } from '~/lib/ordering/reorder'

/** Versioned, so a future format change cannot be mistaken for the current one. */
const STORAGE_KEY = 'revyse:ordering:v1'

/** localStorage is user-writable. Anything unparseable means "no preference". */
const orderingSchema = z.array(z.string().min(1).max(16)).max(64).catch([])

const EMPTY: CurrencySymbol[] = []

/**
 * `getSnapshot` must return a referentially stable value between store changes,
 * or `useSyncExternalStore` re-renders forever. Cache the parsed array against
 * the exact string it was parsed from.
 */
let cachedRaw: string | null = null
let cachedValue: CurrencySymbol[] = EMPTY

function getSnapshot(): CurrencySymbol[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw === cachedRaw) return cachedValue

  cachedRaw = raw
  cachedValue =
    raw === null ? EMPTY : (orderingSchema.parse(safeJsonParse(raw)) as CurrencySymbol[])
  return cachedValue
}

/**
 * The server has no localStorage, so it renders the API's order. React calls
 * this during hydration too, which is what keeps the first client render
 * identical to the server's. The stored order is applied immediately after.
 */
function getServerSnapshot(): CurrencySymbol[] {
  return EMPTY
}

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  // Keeps two tabs of the dashboard in agreement.
  window.addEventListener('storage', listener)

  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

function persist(ordering: readonly CurrencySymbol[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ordering))
  } catch {
    // Private browsing, or a full quota. The board still works for this session;
    // it simply will not survive a reload.
  }
  // `storage` does not fire in the tab that wrote it.
  for (const listener of listeners) listener()
}

export interface UseOrderingResult {
  /** The symbols to render, in the user's order, reconciled against the server. */
  readonly ordering: readonly CurrencySymbol[]
  /** Move `active` to where `over` currently sits, and persist. */
  readonly move: (active: CurrencySymbol, over: CurrencySymbol) => void
  readonly reset: () => void
}

/**
 * Ordering is client state. It outlives the data — restored from localStorage on
 * a later visit, while the loader revalidates every 30 seconds — so it is always
 * reconciled against the symbols the server actually sent before rendering.
 *
 * Without that reconciliation, a poll returning a new asset would render nothing
 * for it, and a delisted one would render `undefined`.
 */
export function useOrdering(available: readonly CurrencySymbol[]): UseOrderingResult {
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const ordering = useMemo(() => reconcile(stored, available), [stored, available])

  const move = useCallback(
    (active: CurrencySymbol, over: CurrencySymbol) => {
      persist(reorder(ordering, active, over))
    },
    [ordering],
  )

  const reset = useCallback(() => {
    persist([])
  }, [])

  return { ordering, move, reset }
}
