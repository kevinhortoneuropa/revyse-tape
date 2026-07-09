import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CardSkeleton, CardSkeletonGrid } from './CardSkeleton'
import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  it('echoes the query that matched nothing', () => {
    render(<EmptyState query="zzz" />)
    expect(screen.getByText(/No assets match/)).toHaveTextContent('zzz')
  })

  it('suggests what to type instead', () => {
    render(<EmptyState query="zzz" />)
    expect(screen.getByText(/Try a name like/)).toBeInTheDocument()
  })
})

describe('CardSkeleton', () => {
  it('mirrors the real card so nothing shifts when data lands', () => {
    const { container } = render(<CardSkeleton />)
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(3)
  })

  it('renders one placeholder per expected card', () => {
    const { container } = render(<CardSkeletonGrid count={4} />)
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThanOrEqual(4)
  })

  it('defaults to the number of tracked assets', () => {
    const { container } = render(<CardSkeletonGrid />)
    expect(container.firstElementChild?.children).toHaveLength(12)
  })

  // The loading status belongs in one live region, not in a dozen grey blocks.
  it('hides the whole grid from assistive technology', () => {
    const { container } = render(<CardSkeletonGrid count={2} />)
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
  })
})
