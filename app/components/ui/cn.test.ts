import { describe, expect, it } from 'vitest'

import { cn } from './cn'

describe('cn', () => {
  it('joins class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('drops falsy values', () => {
    expect(cn('a', false, undefined, null, 'b')).toBe('a b')
  })

  // The reason twMerge exists: a caller passing className="px-4" expects it to
  // win over the component's own px-2, regardless of CSS source order.
  it('lets a later Tailwind utility override an earlier one', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
    expect(cn('bg-surface', 'bg-accent')).toBe('bg-accent')
  })

  it('keeps utilities from different families', () => {
    expect(cn('px-2', 'py-4')).toBe('px-2 py-4')
  })

  it('supports conditional objects and arrays', () => {
    expect(cn(['a', { b: true, c: false }])).toBe('a b')
  })
})
