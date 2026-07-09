import { useEffect, useState } from 'react'

import { Button } from '~/components/ui/Button'
import { cn } from '~/components/ui/cn'
import { formatUpdatedAgo } from '~/lib/time/relative'

export interface RefreshControlProps {
  /** Epoch milliseconds, from the loader. */
  readonly fetchedAt: number
  readonly isRefreshing: boolean
  readonly onRefresh: () => void
}

/** Re-renders once a second so "12s ago" stays true. */
function useElapsed(since: number): number {
  // Seeded with `since` so the first client render matches the server's exactly
  // — the server has no clock the browser agrees with, and a one-second drift
  // between them is a hydration mismatch on the timestamp text.
  const [now, setNow] = useState(since)

  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => {
      clearInterval(id)
    }
  }, [since])

  return now - since
}

export function RefreshControl({ fetchedAt, isRefreshing, onRefresh }: RefreshControlProps) {
  const elapsed = useElapsed(fetchedAt)

  return (
    <div className="flex items-center gap-3">
      <p className="text-xs text-muted" aria-live="polite">
        {isRefreshing ? (
          'Updating…'
        ) : (
          <>
            Updated{' '}
            <time dateTime={new Date(fetchedAt).toISOString()}>{formatUpdatedAgo(elapsed)}</time>
          </>
        )}
      </p>

      <Button
        size="sm"
        variant="outline"
        onClick={onRefresh}
        disabled={isRefreshing}
        aria-label="Refresh exchange rates now"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn('size-3.5', isRefreshing && 'animate-spin')}
        >
          <path d="M21 12a9 9 0 1 1-2.64-6.36" />
          <path d="M21 3v6h-6" />
        </svg>
        Refresh
      </Button>
    </div>
  )
}
