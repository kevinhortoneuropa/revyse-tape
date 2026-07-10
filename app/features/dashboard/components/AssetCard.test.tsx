import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { BtcPrice, CurrencySymbol, QuotedAsset, UsdPrice } from '~/lib/domain'

import { AssetCard } from './AssetCard'

const asset = (overrides: Partial<QuotedAsset> = {}): QuotedAsset => ({
  symbol: 'BTC' as CurrencySymbol,
  name: 'Bitcoin',
  color: '#F7931A',
  usd: 63_245.71 as UsdPrice,
  btc: 1 as BtcPrice,
  ...overrides,
})

describe('AssetCard', () => {
  it('shows the name and the symbol', () => {
    render(<AssetCard asset={asset()} />)

    expect(screen.getByText('Bitcoin')).toBeInTheDocument()
    expect(screen.getByText('BTC', { selector: 'p' })).toBeInTheDocument()
  })

  it('shows both prices, formatted', () => {
    render(<AssetCard asset={asset()} />)

    expect(screen.getByText('$63,245.71')).toBeInTheDocument()
    expect(screen.getByText('1.00000000')).toBeInTheDocument()
  })

  // The two prices are both bare numbers. Pairing each with its unit in a
  // definition list is what tells a screen-reader user which is which.
  it('pairs each price with its unit', () => {
    const { container } = render(<AssetCard asset={asset()} />)

    const terms = [...container.querySelectorAll('dt')].map((t) => t.textContent)
    const values = [...container.querySelectorAll('dd')].map((d) => d.textContent)

    expect(terms).toEqual(['USD', 'BTC'])
    expect(values).toEqual(['$63,245.71', '1.00000000'])
    // dt/dd expose term/definition roles, which is what an AT announces.
    expect(screen.getAllByRole('term')).toHaveLength(2)
    expect(screen.getAllByRole('definition')).toHaveLength(2)
  })

  it('keeps sub-cent prices readable rather than rounding them to zero', () => {
    render(
      <AssetCard asset={asset({ symbol: 'DOGE' as CurrencySymbol, usd: 0.0732 as UsdPrice })} />,
    )

    expect(screen.getByText('$0.0732')).toBeInTheDocument()
    expect(screen.queryByText('$0.00')).not.toBeInTheDocument()
  })

  it('renders the token icon for a tracked symbol', () => {
    const { container } = render(<AssetCard asset={asset()} />)
    const icon = container.querySelector('svg[data-token-icon="BTC"]')

    expect(icon).toBeInTheDocument()
    // Decorative: the symbol is already announced by the heading beside it.
    expect(icon).toHaveAttribute('aria-hidden', 'true')
  })

  it('falls back to a brand-coloured monogram for an unknown symbol', () => {
    render(
      <AssetCard
        asset={asset({ symbol: 'ZZZ' as CurrencySymbol, name: 'Zed', color: '#123456' })}
      />,
    )
    const monogram = screen.getByText('ZZZ', { selector: 'span' })

    expect(monogram).toHaveStyle({ backgroundColor: '#123456' })
    expect(monogram).toHaveAttribute('aria-hidden', 'true')
  })

  it('exposes the symbol as a data attribute for end-to-end selectors', () => {
    const { container } = render(<AssetCard asset={asset()} />)
    expect(container.querySelector('[data-symbol="BTC"]')).toBeInTheDocument()
  })

  it('merges a caller className', () => {
    const { container } = render(<AssetCard asset={asset()} className="opacity-50" />)
    expect(container.querySelector('[data-symbol="BTC"]')?.className).toContain('opacity-50')
  })
})
