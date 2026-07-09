import { describe, expect, it } from 'vitest'

import { formatUpdatedAgo } from './relative'

const seconds = (n: number) => n * 1000
const minutes = (n: number) => n * 60_000
const hours = (n: number) => n * 3_600_000

describe('formatUpdatedAgo', () => {
  // Coarse on purpose: a per-second countdown reflows the text every tick.
  it.each([0, 1, seconds(4.999)])('reads "just now" at %pms', (elapsed) => {
    expect(formatUpdatedAgo(elapsed)).toBe('just now')
  })

  it('switches to seconds at five seconds', () => {
    expect(formatUpdatedAgo(seconds(5))).toBe('5s ago')
    expect(formatUpdatedAgo(seconds(30))).toBe('30s ago')
    expect(formatUpdatedAgo(seconds(59))).toBe('59s ago')
  })

  it('switches to minutes at one minute', () => {
    expect(formatUpdatedAgo(minutes(1))).toBe('1m ago')
    expect(formatUpdatedAgo(minutes(59))).toBe('59m ago')
  })

  it('switches to hours at one hour', () => {
    expect(formatUpdatedAgo(hours(1))).toBe('1h ago')
    expect(formatUpdatedAgo(hours(25))).toBe('25h ago')
  })

  it('truncates rather than rounds, so it never claims to be newer', () => {
    expect(formatUpdatedAgo(seconds(59.9))).toBe('59s ago')
    expect(formatUpdatedAgo(minutes(1.99))).toBe('1m ago')
  })

  // Clock skew between the server's fetchedAt and the browser's Date.now().
  it('reads "just now" for a negative elapsed time rather than "in 3 seconds"', () => {
    expect(formatUpdatedAgo(-3000)).toBe('just now')
  })

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'reads "just now" for %p rather than rendering NaN',
    (elapsed) => {
      expect(formatUpdatedAgo(elapsed)).toBe('just now')
    },
  )
})
