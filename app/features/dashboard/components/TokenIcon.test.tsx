import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TRACKED_SYMBOLS } from '~/lib/coinbase/assets'
import type { CurrencySymbol } from '~/lib/domain'

import { TokenIcon } from './TokenIcon'

describe('TokenIcon', () => {
  // The `satisfies` gate proves this at compile time; this proves the runtime
  // Map was built from the same object and none of the icons render null.
  it.each(TRACKED_SYMBOLS)('renders an SVG icon for %s', (symbol) => {
    const { container } = render(<TokenIcon symbol={symbol as CurrencySymbol} color="#F7931A" />)

    const icon = container.querySelector(`svg[data-token-icon="${symbol}"]`)
    expect(icon).toBeInTheDocument()
    expect(icon).toHaveAttribute('aria-hidden', 'true')
  })

  it('falls back to the monogram for a symbol outside the tracked set', () => {
    const { container } = render(<TokenIcon symbol={'WAT' as CurrencySymbol} color="#336699" />)

    expect(container.querySelector('svg')).not.toBeInTheDocument()
    const monogram = screen.getByText('WAT', { selector: 'span' })
    expect(monogram).toHaveStyle({ backgroundColor: '#336699' })
    expect(monogram).toHaveAttribute('aria-hidden', 'true')
  })

  it('truncates a long unknown symbol to three characters', () => {
    render(<TokenIcon symbol={'WATWAT' as CurrencySymbol} color="#336699" />)
    expect(screen.getByText('WAT', { selector: 'span' })).toBeInTheDocument()
  })
})
