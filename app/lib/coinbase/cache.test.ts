import { describe, expect, it, vi } from 'vitest'

import { createTtlCache } from './cache'

/** A clock the test moves by hand, so nothing sleeps. */
function fakeClock(start = 1_000) {
  let t = start
  return { now: () => t, advance: (ms: number) => (t += ms) }
}

describe('createTtlCache', () => {
  it('loads once and reuses the value within the TTL', async () => {
    const clock = fakeClock()
    const load = vi.fn().mockResolvedValue('value')
    const cache = createTtlCache(load, { ttlMs: 100, now: clock.now })

    await expect(cache.get()).resolves.toBe('value')
    clock.advance(99)
    await expect(cache.get()).resolves.toBe('value')

    expect(load).toHaveBeenCalledTimes(1)
  })

  it('reloads once the TTL has elapsed', async () => {
    const clock = fakeClock()
    const load = vi.fn().mockResolvedValueOnce('first').mockResolvedValueOnce('second')
    const cache = createTtlCache(load, { ttlMs: 100, now: clock.now })

    await cache.get()
    clock.advance(100)

    await expect(cache.get()).resolves.toBe('second')
    expect(load).toHaveBeenCalledTimes(2)
  })

  // Fifty tabs polling a cold cache must produce one upstream request, not fifty.
  it('shares one in-flight load between concurrent callers', async () => {
    const clock = fakeClock()
    let resolve!: (v: string) => void
    const load = vi.fn().mockReturnValue(
      new Promise<string>((r) => {
        resolve = r
      }),
    )
    const cache = createTtlCache(load, { ttlMs: 100, now: clock.now })

    const all = Promise.all([cache.get(), cache.get(), cache.get()])
    resolve('shared')

    await expect(all).resolves.toEqual(['shared', 'shared', 'shared'])
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('does not cache a failure', async () => {
    const clock = fakeClock()
    const load = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce('back')
    const cache = createTtlCache(load, { ttlMs: 100, now: clock.now })

    await expect(cache.get()).rejects.toThrow('down')
    await expect(cache.get()).resolves.toBe('back')
    expect(load).toHaveBeenCalledTimes(2)
  })

  // A rejected promise left in `inFlight` would be handed to the next caller.
  it('rejects every concurrent caller, then recovers on the next attempt', async () => {
    const clock = fakeClock()
    const load = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce('back')
    const cache = createTtlCache(load, { ttlMs: 100, now: clock.now })

    const results = await Promise.allSettled([cache.get(), cache.get()])
    expect(results.every((r) => r.status === 'rejected')).toBe(true)
    expect(load).toHaveBeenCalledTimes(1)

    await expect(cache.get()).resolves.toBe('back')
  })

  it('forces a reload after invalidate()', async () => {
    const clock = fakeClock()
    const load = vi.fn().mockResolvedValueOnce('first').mockResolvedValueOnce('second')
    const cache = createTtlCache(load, { ttlMs: 10_000, now: clock.now })

    await cache.get()
    cache.invalidate()

    await expect(cache.get()).resolves.toBe('second')
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('defaults to the real clock when none is injected', async () => {
    const load = vi.fn().mockResolvedValue('value')
    const cache = createTtlCache(load, { ttlMs: 10_000 })

    await cache.get()
    await cache.get()

    expect(load).toHaveBeenCalledTimes(1)
  })
})
