import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useInterval } from './useInterval'

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('useInterval', () => {
  it('runs the callback on every tick', () => {
    const tick = vi.fn()
    renderHook(() => {
      useInterval(tick, 1000)
    })

    vi.advanceTimersByTime(3000)
    expect(tick).toHaveBeenCalledTimes(3)
  })

  it('pauses when the delay is null', () => {
    const tick = vi.fn()
    renderHook(() => {
      useInterval(tick, null)
    })

    vi.advanceTimersByTime(10_000)
    expect(tick).not.toHaveBeenCalled()
  })

  // The bug this hook exists to prevent: a re-render on every second would
  // rebuild a 30-second timer before it ever fired.
  it('does not restart the timer when the callback identity changes', () => {
    let calls = 0
    const { rerender } = renderHook(
      ({ n }: { n: number }) => {
        // A fresh closure on every render, as in real code.
        useInterval(() => {
          calls += n
        }, 1000)
      },
      { initialProps: { n: 1 } },
    )

    vi.advanceTimersByTime(900)
    rerender({ n: 1 })
    vi.advanceTimersByTime(900)
    rerender({ n: 1 })
    vi.advanceTimersByTime(900)

    // 2700ms total. A timer restarted on each rerender would never have fired.
    expect(calls).toBe(2)
  })

  it('always calls the latest callback', () => {
    const first = vi.fn()
    const second = vi.fn()

    const { rerender } = renderHook(
      ({ cb }: { cb: () => void }) => {
        useInterval(cb, 1000)
      },
      { initialProps: { cb: first } },
    )

    rerender({ cb: second })
    vi.advanceTimersByTime(1000)

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledOnce()
  })

  it('clears the timer on unmount', () => {
    const tick = vi.fn()
    const { unmount } = renderHook(() => {
      useInterval(tick, 1000)
    })

    unmount()
    vi.advanceTimersByTime(5000)
    expect(tick).not.toHaveBeenCalled()
  })

  it('restarts when the delay changes', () => {
    const tick = vi.fn()
    const { rerender } = renderHook(
      ({ ms }: { ms: number | null }) => {
        useInterval(tick, ms)
      },
      { initialProps: { ms: 1000 as number | null } },
    )

    vi.advanceTimersByTime(1000)
    expect(tick).toHaveBeenCalledTimes(1)

    rerender({ ms: null })
    vi.advanceTimersByTime(5000)
    expect(tick).toHaveBeenCalledTimes(1)
  })
})
