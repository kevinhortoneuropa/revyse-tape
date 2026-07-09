import { useRevalidator } from '@remix-run/react'
import { useCallback, useEffect, useState } from 'react'

import { useInterval } from '~/hooks/useInterval'

/** Long enough that the server-side TTL cache absorbs most polls. */
export const REFRESH_INTERVAL_MS = 30_000

export interface UseAutoRefreshOptions {
  /** Suspends polling — passed `true` while a card is being dragged. */
  readonly paused?: boolean
  readonly intervalMs?: number
}

export interface UseAutoRefreshResult {
  readonly refresh: () => void
  readonly isRefreshing: boolean
  /** True while the tab is in the background and polling is suspended. */
  readonly isSuspended: boolean
}

const isHidden = () => typeof document !== 'undefined' && document.hidden

/**
 * Re-runs the route's loader on a timer.
 *
 * `useRevalidator` rather than a client-side fetch: the loader is the data
 * layer, it already validates and caches, and the Coinbase client never reaches
 * the browser. It leaves the URL untouched, so `shouldRevalidate` lets it
 * through while still refusing to refetch when the filter changes.
 *
 * Polling is suspended in two situations, and both are load-bearing:
 *
 * - **The tab is hidden.** A dashboard left open overnight would otherwise make
 *   ~2,900 requests for nobody. On return, it refreshes at once rather than
 *   showing stale prices until the next tick.
 * - **A drag is in flight.** New loader data re-renders the card under the
 *   user's cursor mid-drag.
 */
export function useAutoRefresh({
  paused = false,
  intervalMs = REFRESH_INTERVAL_MS,
}: UseAutoRefreshOptions = {}): UseAutoRefreshResult {
  const { revalidate, state } = useRevalidator()
  const [suspended, setSuspended] = useState(false)

  const isRefreshing = state === 'loading'

  const refresh = useCallback(() => {
    // Revalidating while a revalidation is in flight queues a second request.
    if (state === 'idle') {
      revalidate()
    }
  }, [revalidate, state])

  useEffect(() => {
    function onVisibilityChange() {
      const hidden = isHidden()
      setSuspended(hidden)
      // Prices went stale while we were away. Do not wait for the next tick.
      if (!hidden) refresh()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [refresh])

  useInterval(
    () => {
      if (!isHidden()) refresh()
    },
    paused ? null : intervalMs,
  )

  return { refresh, isRefreshing, isSuspended: suspended }
}
