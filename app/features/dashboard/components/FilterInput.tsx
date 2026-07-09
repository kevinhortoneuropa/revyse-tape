import { useSearchParams } from '@remix-run/react'
import { useId } from 'react'

import { Input } from '~/components/ui/Input'
import { FILTER_MAX_LENGTH } from '~/lib/url/search-params'

export interface FilterInputProps {
  readonly value: string
  /** How many assets currently match, announced politely to screen readers. */
  readonly matchCount: number
  readonly totalCount: number
}

/**
 * The filter lives in the URL, so `?q=eth` is shareable and the back button
 * works. It is written on every keystroke with `replace: true`, which updates
 * the address bar without pushing sixty history entries.
 *
 * No debounce, deliberately. A debounce exists to avoid a network round trip,
 * and `shouldRevalidate` already guarantees there is none: a search-only URL
 * change never re-runs the loader. What remains is a client-side re-render of
 * twelve cards, which is cheaper than the timer that would defer it.
 */
export function FilterInput({ value, matchCount, totalCount }: FilterInputProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const id = useId()

  function update(next: string) {
    const params = new URLSearchParams(searchParams)
    // An empty filter is the default state; it does not belong in the URL.
    if (next.trim() === '') params.delete('q')
    else params.set('q', next)

    setSearchParams(params, { replace: true, preventScrollReset: true })
  }

  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        Filter cryptocurrencies by name or symbol
      </label>

      <Input
        id={id}
        type="search"
        name="q"
        value={value}
        maxLength={FILTER_MAX_LENGTH}
        autoComplete="off"
        placeholder="Filter by name or symbol…"
        onChange={(event) => {
          update(event.target.value)
        }}
      />

      {/* Sighted users see the grid change. Screen-reader users need telling. */}
      <p aria-live="polite" className="sr-only">
        {value.trim() === ''
          ? `Showing all ${String(totalCount)} cryptocurrencies`
          : `${String(matchCount)} of ${String(totalCount)} cryptocurrencies match ${value}`}
      </p>
    </div>
  )
}
