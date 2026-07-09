import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import type { CurrencySymbol } from '~/lib/domain'

import { useOrdering } from './useOrdering'

const KEY = 'revyse:ordering:v1'
const syms = (...s: string[]) => s as CurrencySymbol[]
const available = syms('BTC', 'ETH', 'SOL')

const stored = () => JSON.parse(localStorage.getItem(KEY) ?? 'null') as unknown

beforeEach(() => {
  localStorage.clear()
})

describe('useOrdering', () => {
  it('falls back to the server order when nothing is stored', () => {
    const { result } = renderHook(() => useOrdering(available))
    expect(result.current.ordering).toEqual(available)
  })

  it('restores a stored order', () => {
    localStorage.setItem(KEY, JSON.stringify(['SOL', 'BTC', 'ETH']))

    const { result } = renderHook(() => useOrdering(available))
    expect(result.current.ordering).toEqual(syms('SOL', 'BTC', 'ETH'))
  })

  it('persists a move', () => {
    const { result } = renderHook(() => useOrdering(available))

    act(() => {
      result.current.move(syms('BTC')[0]!, syms('SOL')[0]!)
    })

    expect(result.current.ordering).toEqual(syms('ETH', 'SOL', 'BTC'))
    expect(stored()).toEqual(['ETH', 'SOL', 'BTC'])
  })

  // The board must survive a poll, a reload, and a delisting.
  it('reconciles a stored order against what the server now sends', () => {
    localStorage.setItem(KEY, JSON.stringify(['MATIC', 'SOL', 'BTC']))

    const { result } = renderHook(() => useOrdering(available))

    // MATIC is gone; ETH is new and appended rather than inserted.
    expect(result.current.ordering).toEqual(syms('SOL', 'BTC', 'ETH'))
  })

  // localStorage is user-writable, and a thrown parse error inside a hook takes
  // the whole dashboard down.
  it.each([
    ['malformed JSON', '{not json'],
    ['a JSON scalar', '42'],
    ['an object', '{"a":1}'],
    ['an array of numbers', '[1,2,3]'],
    ['null', 'null'],
  ])('ignores %s and falls back to the server order', (_label, raw) => {
    localStorage.setItem(KEY, raw)

    const { result } = renderHook(() => useOrdering(available))
    expect(result.current.ordering).toEqual(available)
  })

  it('collapses duplicates written by hand', () => {
    localStorage.setItem(KEY, JSON.stringify(['BTC', 'BTC', 'ETH']))

    const { result } = renderHook(() => useOrdering(available))
    expect(result.current.ordering).toEqual(syms('BTC', 'ETH', 'SOL'))
  })

  it('reset() returns the board to the server order', () => {
    localStorage.setItem(KEY, JSON.stringify(['SOL', 'ETH', 'BTC']))
    const { result } = renderHook(() => useOrdering(available))

    act(() => {
      result.current.reset()
    })

    expect(result.current.ordering).toEqual(available)
  })

  // A card the user never touched must not move because a new asset appeared.
  it('appends a newly listed asset without disturbing the arrangement', () => {
    localStorage.setItem(KEY, JSON.stringify(['SOL', 'BTC']))

    const { result } = renderHook(() => useOrdering(syms('BTC', 'ETH', 'SOL', 'DOGE')))
    expect(result.current.ordering.slice(0, 2)).toEqual(syms('SOL', 'BTC'))
  })

  it('survives localStorage throwing on write', () => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      throw new Error('QuotaExceededError')
    }

    const { result } = renderHook(() => useOrdering(available))
    expect(() => {
      act(() => {
        result.current.move(syms('BTC')[0]!, syms('SOL')[0]!)
      })
    }).not.toThrow()

    Storage.prototype.setItem = original
  })
})
