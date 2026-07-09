import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Card } from './Card'
import { Input } from './Input'
import { Skeleton } from './Skeleton'

describe('Card', () => {
  it('renders children and merges className', () => {
    render(
      <Card className="p-8" data-testid="card">
        content
      </Card>,
    )

    const card = screen.getByTestId('card')
    expect(card).toHaveTextContent('content')
    expect(card.className).toContain('p-8')
    expect(card.className).not.toContain('p-4')
  })
})

describe('Input', () => {
  it('forwards props and a ref', () => {
    const ref = { current: null as HTMLInputElement | null }
    render(<Input ref={ref} placeholder="Filter" defaultValue="eth" />)

    expect(screen.getByPlaceholderText('Filter')).toHaveValue('eth')
    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })
})

describe('Skeleton', () => {
  // A screen reader should hear the loading status from one live region, not
  // from a dozen decorative blocks.
  it('is hidden from assistive technology', () => {
    render(<Skeleton data-testid="s" />)
    expect(screen.getByTestId('s')).toHaveAttribute('aria-hidden', 'true')
  })
})
