import type { HeadersFunction, MetaFunction } from '@remix-run/node'
import type { ShouldRevalidateFunction } from '@remix-run/react'
import {
  isRouteErrorResponse,
  useLoaderData,
  useRouteError,
  useRouteLoaderData,
  useSearchParams,
} from '@remix-run/react'
import { useCallback, useMemo, useState } from 'react'

import { Button } from '~/components/ui/Button'
import { AssetGrid } from '~/features/dashboard/components/AssetGrid'
import { EmptyState } from '~/features/dashboard/components/EmptyState'
import { FilterInput } from '~/features/dashboard/components/FilterInput'
import { RefreshControl } from '~/features/dashboard/components/RefreshControl'
import { useAutoRefresh } from '~/features/dashboard/hooks/useAutoRefresh'
import { useOrdering } from '~/features/dashboard/hooks/useOrdering'
import { coinbase } from '~/features/dashboard/coinbase.server'
import { ThemeToggle } from '~/features/theme/ThemeToggle'
import { CoinbaseDataError, CoinbaseUnavailableError } from '~/lib/coinbase/errors'
import { filterAssets } from '~/lib/filter/match'
import type { ThemePreference } from '~/lib/theme'
import { parseDashboardSearch } from '~/lib/url/search-params'

export const meta: MetaFunction = () => [
  { title: 'Revyse Tape' },
  { name: 'description', content: 'Live cryptocurrency exchange rates in USD and BTC.' },
]

/**
 * The loader's own TTL cache bounds upstream load; this bounds it again at the
 * CDN. `max-age=0` keeps browsers from serving a stale board on back-navigation.
 */
export const headers: HeadersFunction = () => ({
  'Cache-Control': 'public, max-age=0, s-maxage=10, stale-while-revalidate=30',
})

export async function loader() {
  try {
    const { assets, fetchedAt } = await coinbase.getDashboardData()
    return { assets, fetchedAt }
  } catch (error) {
    // Both are expected failure modes, not bugs. Turn them into a response the
    // ErrorBoundary can render, and let anything else bubble as a real 500.
    if (error instanceof CoinbaseUnavailableError || error instanceof CoinbaseDataError) {
      throw new Response('Live prices are temporarily unavailable. Please try again shortly.', {
        status: 503,
        statusText: 'Service Unavailable',
      })
    }
    throw error
  }
}

/**
 * What makes URL-backed filter state affordable.
 *
 * Remix re-runs a route's loader on every navigation, and `setSearchParams` is
 * a navigation. Without this, every keystroke in the filter box would hit
 * Coinbase. Filtering is a client-side concern over data the loader already
 * has, so a search-only change must never refetch.
 *
 * `useRevalidator()`, which the refresh timer calls, leaves the URL untouched
 * and so falls through to the default and does refetch. That is the whole point.
 */
export const shouldRevalidate: ShouldRevalidateFunction = ({
  currentUrl,
  nextUrl,
  formAction,
  defaultShouldRevalidate,
}) => {
  // Changing the theme cannot change a price.
  if (formAction === '/theme') return false

  // Same page, different query string: the user is typing in the filter.
  if (currentUrl.pathname === nextUrl.pathname && currentUrl.search !== nextUrl.search) {
    return false
  }

  return defaultShouldRevalidate
}

export default function Dashboard() {
  const { assets, fetchedAt } = useLoaderData<typeof loader>()
  const root = useRouteLoaderData<{ theme: ThemePreference }>('root')

  const [searchParams] = useSearchParams()
  const { q } = parseDashboardSearch(searchParams)

  // A poll landing mid-drag re-renders the card under the user's cursor.
  const [isDragging, setIsDragging] = useState(false)
  const { refresh, isRefreshing } = useAutoRefresh({ paused: isDragging })

  const onDragStart = useCallback(() => {
    setIsDragging(true)
  }, [])
  const onDragEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  // The loader owns a map keyed by symbol. The client owns a list of symbols.
  // Rendering is the join of the two, so a 30-second poll replaces every price
  // without disturbing a single card's position.
  const available = useMemo(() => assets.map((asset) => asset.symbol), [assets])
  const { ordering, move } = useOrdering(available)

  const bySymbol = useMemo(() => new Map(assets.map((asset) => [asset.symbol, asset])), [assets])

  const arranged = useMemo(
    () => ordering.flatMap((symbol) => bySymbol.get(symbol) ?? []),
    [ordering, bySymbol],
  )

  const visible = useMemo(() => filterAssets(arranged, q), [arranged, q])

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Revyse Tape</h1>
          <p className="text-sm text-muted">Live exchange rates in USD and BTC.</p>
        </div>
        <div className="flex items-center gap-3">
          <RefreshControl fetchedAt={fetchedAt} isRefreshing={isRefreshing} onRefresh={refresh} />
          <ThemeToggle preference={root?.theme ?? 'system'} />
        </div>
      </header>

      <div className="mb-6 max-w-sm">
        <FilterInput value={q} matchCount={visible.length} totalCount={assets.length} />
      </div>

      {visible.length === 0 ? (
        <EmptyState query={q} />
      ) : (
        <AssetGrid assets={visible} onMove={move} onDragStart={onDragStart} onDragEnd={onDragEnd} />
      )}
    </main>
  )
}

/**
 * Scoped to this route, so a Coinbase outage still renders the shell rather
 * than replacing the whole document with an error page.
 */
export function ErrorBoundary() {
  const error = useRouteError()
  const isResponse = isRouteErrorResponse(error)

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Revyse Tape</h1>

      <div
        role="alert"
        className="mt-6 rounded-xl border border-dashed border-border py-16 text-center"
      >
        <p className="font-medium">
          {isResponse ? 'Live prices are unavailable' : 'Something went wrong'}
        </p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
          {isResponse && typeof error.data === 'string'
            ? error.data
            : 'An unexpected error occurred while loading the dashboard.'}
        </p>
        <Button
          className="mt-6"
          variant="primary"
          onClick={() => {
            window.location.reload()
          }}
        >
          Try again
        </Button>
      </div>
    </main>
  )
}
