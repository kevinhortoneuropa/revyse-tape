import { useSearchParams } from '@remix-run/react'
import { createRemixStub } from '@remix-run/testing'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { FilterInput } from './FilterInput'

/**
 * createRemixStub drives a memory router, so window.location never moves.
 * The harness mirrors the router's own search params back out for assertions.
 */
function Harness() {
  const [params] = useSearchParams()
  const q = params.get('q') ?? ''

  return (
    <>
      <FilterInput value={q} matchCount={q === '' ? 12 : 1} totalCount={12} />
      <output data-testid="search">{params.toString()}</output>
    </>
  )
}

function renderFilter(initial = '/') {
  const Stub = createRemixStub([{ path: '/', Component: Harness }])
  render(<Stub initialEntries={[initial]} />)
}

const input = () => screen.getByRole('searchbox', { name: /filter cryptocurrencies/i })
const search = () => screen.getByTestId('search').textContent

describe('FilterInput', () => {
  it('is labelled for screen readers', () => {
    renderFilter()
    expect(input()).toBeInTheDocument()
  })

  it('shows the current filter from the URL', () => {
    renderFilter('/?q=eth')
    expect(input()).toHaveValue('eth')
  })

  it('writes what the user types into the URL', async () => {
    renderFilter()
    await userEvent.type(input(), 'eth')

    expect(search()).toBe('q=eth')
    expect(input()).toHaveValue('eth')
  })

  // An empty filter is the default. It should not linger in the address bar.
  it('removes ?q= entirely when the filter is cleared', async () => {
    renderFilter('/?q=eth')
    await userEvent.clear(input())

    expect(search()).toBe('')
  })

  it('caps the input length', () => {
    renderFilter()
    expect(input()).toHaveAttribute('maxLength', '64')
  })

  // Sighted users see the grid change; screen-reader users need telling.
  it('announces the match count politely', () => {
    renderFilter('/?q=eth')
    expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent(
      '1 of 12 cryptocurrencies match eth',
    )
  })

  it('announces the unfiltered state', () => {
    renderFilter()
    expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent(
      'Showing all 12 cryptocurrencies',
    )
  })
})
