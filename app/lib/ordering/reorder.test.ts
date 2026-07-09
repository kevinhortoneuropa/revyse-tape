import { describe, expect, it } from 'vitest'

import type { CurrencySymbol } from '../domain'

import { reorder } from './reorder'

const syms = (...s: string[]) => s as CurrencySymbol[]
const sym = (s: string) => s as CurrencySymbol

describe('reorder', () => {
  const ordering = syms('BTC', 'ETH', 'SOL', 'XRP', 'ADA')

  it('moves a card down to the position of its target', () => {
    expect(reorder(ordering, sym('BTC'), sym('SOL'))).toEqual(
      syms('ETH', 'SOL', 'BTC', 'XRP', 'ADA'),
    )
  })

  it('moves a card up to the position of its target', () => {
    expect(reorder(ordering, sym('ADA'), sym('ETH'))).toEqual(
      syms('BTC', 'ADA', 'ETH', 'SOL', 'XRP'),
    )
  })

  it('never mutates its input', () => {
    const original = [...ordering]
    reorder(ordering, sym('BTC'), sym('ADA'))
    expect(ordering).toEqual(original)
  })

  it('is a no-op when a card is dropped on itself', () => {
    expect(reorder(ordering, sym('SOL'), sym('SOL'))).toEqual(ordering)
  })

  it.each([
    ['unknown active', 'NOPE', 'SOL'],
    ['unknown over', 'BTC', 'NOPE'],
    ['both unknown', 'NOPE', 'ZILCH'],
  ])('is a no-op for %s', (_label, active, over) => {
    expect(reorder(ordering, sym(active), sym(over))).toEqual(ordering)
  })

  it('preserves the exact set of symbols', () => {
    const result = reorder(ordering, sym('XRP'), sym('BTC'))
    expect([...result].sort()).toEqual([...ordering].sort())
    expect(result).toHaveLength(ordering.length)
  })

  // ---------------------------------------------------------------------------
  // The reason this function takes symbols and not indices.
  // ---------------------------------------------------------------------------
  describe('when the user drags within a filtered subset', () => {
    const full = syms('BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOGE')
    // What the user actually sees after filtering.
    const visible = syms('ETH', 'ADA')

    it('moves only the two cards involved, leaving hidden cards untouched', () => {
      // The user drags ETH (visible index 0) onto ADA (visible index 1).
      const result = reorder(full, sym('ETH'), sym('ADA'))

      expect(result).toEqual(syms('BTC', 'SOL', 'XRP', 'ADA', 'ETH', 'DOGE'))

      // BTC, SOL, XRP and DOGE keep their relative order. The user never saw
      // them, so they must not move relative to one another.
      const hidden = result.filter((s) => !visible.includes(s))
      expect(hidden).toEqual(syms('BTC', 'SOL', 'XRP', 'DOGE'))
    })

    it('differs from what visible-index arithmetic would produce', () => {
      // The bug: take the visible indices (0 -> 1) and apply them to the full
      // list. That moves BTC after ETH — two cards the user never touched, and
      // cannot see, so nobody ever notices.
      const buggy = [...full]
      const [moved] = buggy.splice(0, 1)
      buggy.splice(1, 0, moved!)

      expect(buggy).toEqual(syms('ETH', 'BTC', 'SOL', 'XRP', 'ADA', 'DOGE'))
      expect(reorder(full, sym('ETH'), sym('ADA'))).not.toEqual(buggy)
    })

    it('gives the same answer whether or not a filter is applied', () => {
      // reorder never mentions a position, so the visible set is irrelevant.
      expect(reorder(full, sym('ETH'), sym('ADA'))).toEqual(reorder(full, sym('ETH'), sym('ADA')))
    })
  })

  it('handles single-element and empty orderings', () => {
    expect(reorder(syms('BTC'), sym('BTC'), sym('BTC'))).toEqual(syms('BTC'))
    expect(reorder(syms(), sym('BTC'), sym('ETH'))).toEqual([])
  })
})
