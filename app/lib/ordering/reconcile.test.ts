import { describe, expect, it } from 'vitest'

import type { CurrencySymbol } from '../domain'

import { reconcile } from './reconcile'

const syms = (...s: string[]) => s as CurrencySymbol[]

describe('reconcile', () => {
  it('keeps the user arrangement when nothing has changed', () => {
    const ordering = syms('SOL', 'BTC', 'ETH')
    expect(reconcile(ordering, syms('BTC', 'ETH', 'SOL'))).toEqual(ordering)
  })

  // MATIC was renamed to POL and is no longer in Coinbase's crypto catalog. Any
  // stored ordering written before that still names it.
  it('drops symbols the server no longer sends', () => {
    expect(reconcile(syms('BTC', 'MATIC', 'ETH'), syms('BTC', 'ETH'))).toEqual(syms('BTC', 'ETH'))
  })

  it('appends newly available symbols to the end', () => {
    expect(reconcile(syms('ETH', 'BTC'), syms('BTC', 'ETH', 'SOL'))).toEqual(
      syms('ETH', 'BTC', 'SOL'),
    )
  })

  // A new asset must never displace a card the user deliberately positioned.
  it('never inserts a new symbol ahead of a user-placed one', () => {
    const result = reconcile(syms('DOGE', 'BTC'), syms('BTC', 'DOGE', 'AAVE', 'ZEC'))
    expect(result.slice(0, 2)).toEqual(syms('DOGE', 'BTC'))
    expect(result.slice(2).sort()).toEqual(syms('AAVE', 'ZEC'))
  })

  it('drops and appends in the same pass', () => {
    expect(reconcile(syms('MATIC', 'ETH', 'BTC'), syms('BTC', 'ETH', 'SOL'))).toEqual(
      syms('ETH', 'BTC', 'SOL'),
    )
  })

  it('falls back to server order when the stored ordering is empty', () => {
    expect(reconcile(syms(), syms('BTC', 'ETH'))).toEqual(syms('BTC', 'ETH'))
  })

  it('yields nothing when the server sends nothing', () => {
    expect(reconcile(syms('BTC', 'ETH'), syms())).toEqual([])
  })

  // localStorage is user-writable. A hand-edited or corrupted value can repeat
  // a symbol, which would render two cards with the same React key.
  it('collapses duplicates in a corrupted stored ordering', () => {
    expect(reconcile(syms('BTC', 'ETH', 'BTC'), syms('BTC', 'ETH'))).toEqual(syms('BTC', 'ETH'))
  })

  it('is idempotent', () => {
    const available = syms('BTC', 'ETH', 'SOL')
    const once = reconcile(syms('MATIC', 'SOL'), available)
    expect(reconcile(once, available)).toEqual(once)
  })

  it('never mutates its inputs', () => {
    const ordering = syms('ETH', 'BTC')
    const available = syms('BTC', 'ETH', 'SOL')
    reconcile(ordering, available)
    expect(ordering).toEqual(syms('ETH', 'BTC'))
    expect(available).toEqual(syms('BTC', 'ETH', 'SOL'))
  })

  it('always returns exactly the available set', () => {
    const available = syms('BTC', 'ETH', 'SOL')
    const result = reconcile(syms('MATIC', 'SOL', 'SOL'), available)
    expect([...result].sort()).toEqual([...available].sort())
  })
})
