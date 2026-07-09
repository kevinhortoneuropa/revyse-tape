import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { BtcPrice, CurrencySymbol, QuotedAsset, UsdPrice } from '~/lib/domain'
import { reorder } from '~/lib/ordering/reorder'

import { AssetGrid, dragAnnouncements, symbolsFromDragEnd } from './AssetGrid'

const asset = (symbol: string, name: string): QuotedAsset => ({
  symbol: symbol as CurrencySymbol,
  name,
  color: '#888888',
  usd: 1 as UsdPrice,
  btc: 1 as BtcPrice,
})

const ASSETS = [asset('BTC', 'Bitcoin'), asset('ETH', 'Ethereum'), asset('SOL', 'Solana')]

const dragEvent = (activeId: string, overId: string | null) =>
  ({
    active: { id: activeId },
    over: overId === null ? null : { id: overId },
  }) as unknown as Parameters<typeof symbolsFromDragEnd>[0]

const symbolsInDom = () =>
  [...document.querySelectorAll('[data-symbol]')].map((el) => el.getAttribute('data-symbol'))

describe('AssetGrid', () => {
  it('renders one card per asset, in the order given', () => {
    render(<AssetGrid assets={ASSETS} onMove={vi.fn()} />)
    expect(symbolsInDom()).toEqual(['BTC', 'ETH', 'SOL'])
  })

  it('renders as a list, so assistive technology can count the cards', () => {
    render(<AssetGrid assets={ASSETS} onMove={vi.fn()} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  it('makes every card keyboard-reachable and describes the interaction', () => {
    render(<AssetGrid assets={ASSETS} onMove={vi.fn()} />)

    const draggables = document.querySelectorAll('[role="button"][tabindex="0"]')
    expect(draggables).toHaveLength(3)
    expect(draggables[0]).toHaveAttribute('aria-describedby')
  })

  it('publishes screen-reader instructions for the drag interaction', () => {
    render(<AssetGrid assets={ASSETS} onMove={vi.fn()} />)
    expect(document.body.textContent).toContain('Press space or enter to pick up this card')
  })
})

/**
 * Why there is no simulated pointer drag here.
 *
 * dnd-kit resolves a drop from getBoundingClientRect, and jsdom returns all
 * zeros for every element — so no card is ever "over" another and a simulated
 * drag silently no-ops. A test built on that would pass while proving nothing.
 *
 * dnd-kit's entire contribution to a reorder is two identifiers. That seam is
 * `symbolsFromDragEnd`, tested here; everything downstream lives in `reorder`,
 * which is pure. Playwright covers the real pointer interaction.
 */
describe('symbolsFromDragEnd', () => {
  it('yields symbols, never indices', () => {
    expect(symbolsFromDragEnd(dragEvent('ETH', 'SOL'))).toEqual(['ETH', 'SOL'])
  })

  it('yields nothing for a drop outside any card', () => {
    expect(symbolsFromDragEnd(dragEvent('ETH', null))).toBeNull()
  })

  it('yields nothing for a card dropped on itself', () => {
    expect(symbolsFromDragEnd(dragEvent('ETH', 'ETH'))).toBeNull()
  })

  // The composition that matters: dnd-kit's symbols, applied to the full
  // ordering, must not disturb cards the filter is hiding.
  it('composes with reorder to leave filtered-out cards alone', () => {
    const full = ['BTC', 'ETH', 'SOL', 'XRP', 'ADA'] as CurrencySymbol[]

    // The user sees only [ETH, ADA] and drags ETH onto ADA.
    const moved = symbolsFromDragEnd(dragEvent('ETH', 'ADA'))
    expect(moved).not.toBeNull()

    expect(reorder(full, moved![0], moved![1])).toEqual(['BTC', 'SOL', 'XRP', 'ADA', 'ETH'])
  })
})

/**
 * A blind user's entire experience of the drag. dnd-kit pipes these strings
 * into a live region, so they are the feature, not decoration.
 */
describe('dragAnnouncements', () => {
  const active = { id: 'ETH' } as never
  const over = { id: 'SOL' } as never

  it('announces the pick-up by symbol', () => {
    expect(dragAnnouncements.onDragStart({ active })).toBe('Picked up ETH.')
  })

  it('announces what the card is currently over', () => {
    expect(dragAnnouncements.onDragOver({ active, over })).toBe('ETH is over SOL.')
  })

  it('says nothing while the card is over empty space', () => {
    expect(dragAnnouncements.onDragOver({ active, over: null })).toBeUndefined()
  })

  it('announces the drop target', () => {
    expect(dragAnnouncements.onDragEnd({ active, over })).toBe('ETH was dropped on SOL.')
  })

  // Silence here would leave the user unsure whether the move took effect.
  it('announces a drop outside any card', () => {
    expect(dragAnnouncements.onDragEnd({ active, over: null })).toBe(
      'ETH was returned to its place.',
    )
  })

  it('announces a cancelled drag', () => {
    expect(dragAnnouncements.onDragCancel({ active, over: null })).toBe(
      'Dragging ETH was cancelled.',
    )
  })
})
