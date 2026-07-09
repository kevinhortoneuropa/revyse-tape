import { describe, expect, it } from 'vitest'

import { filterAssets, matches } from './match'

const BTC = { symbol: 'BTC', name: 'Bitcoin' }
const ETH = { symbol: 'ETH', name: 'Ethereum' }
const BCH = { symbol: 'BCH', name: 'Bitcoin Cash' }
const ALL = [BTC, ETH, BCH]

describe('matches', () => {
  // The brief's own example: typing "eth" shows Ethereum.
  it('matches a symbol case-insensitively', () => {
    expect(matches(ETH, 'eth')).toBe(true)
    expect(matches(ETH, 'ETH')).toBe(true)
    expect(matches(ETH, 'Eth')).toBe(true)
  })

  it('matches a name case-insensitively', () => {
    expect(matches(BTC, 'bitcoin')).toBe(true)
    expect(matches(BTC, 'BITCOIN')).toBe(true)
  })

  // Substring, not prefix: "coin" should find Bitcoin.
  it('matches anywhere in the name', () => {
    expect(matches(BTC, 'coin')).toBe(true)
    expect(matches(BCH, 'cash')).toBe(true)
  })

  // An empty filter shows everything, not nothing.
  it.each(['', '   ', '\t'])('matches everything for the empty filter %p', (query) => {
    expect(matches(BTC, query)).toBe(true)
  })

  it('ignores surrounding whitespace', () => {
    expect(matches(ETH, '  eth  ')).toBe(true)
  })

  it('does not match unrelated text', () => {
    expect(matches(BTC, 'solana')).toBe(false)
    expect(matches(BTC, 'zzz')).toBe(false)
  })
})

describe('filterAssets', () => {
  it('returns everything for an empty filter', () => {
    expect(filterAssets(ALL, '')).toEqual(ALL)
  })

  it('narrows to matching assets', () => {
    expect(filterAssets(ALL, 'eth')).toEqual([ETH])
  })

  // "bitcoin" matches both Bitcoin and Bitcoin Cash.
  it('returns every match, not just the first', () => {
    expect(filterAssets(ALL, 'bitcoin')).toEqual([BTC, BCH])
  })

  it('preserves the order it was given', () => {
    expect(filterAssets([BCH, BTC], 'bitcoin')).toEqual([BCH, BTC])
  })

  it('returns nothing when nothing matches', () => {
    expect(filterAssets(ALL, 'dogecoin')).toEqual([])
  })

  it('never mutates its input', () => {
    const input = [...ALL]
    filterAssets(input, 'eth')
    expect(input).toEqual(ALL)
  })
})
