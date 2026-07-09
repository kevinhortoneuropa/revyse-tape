import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const revalidate = vi.fn()
let revalidatorState: 'idle' | 'loading' = 'idle'

vi.mock('@remix-run/react', () => ({
  useRevalidator: () => ({ revalidate, state: revalidatorState }),
}))

const { useAutoRefresh } = await import('./useAutoRefresh')

/** jsdom's document.hidden is read-only; override the getter. */
function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { value: hidden, configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
}

beforeEach(() => {
  vi.useFakeTimers()
  revalidate.mockReset()
  revalidatorState = 'idle'
  Object.defineProperty(document, 'hidden', { value: false, configurable: true })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useAutoRefresh', () => {
  it('re-runs the loader on every interval', () => {
    renderHook(() => useAutoRefresh({ intervalMs: 1000 }))

    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(revalidate).toHaveBeenCalledTimes(3)
  })

  // A dashboard left open overnight would otherwise make ~2,900 requests for
  // nobody.
  it('does not poll while the tab is hidden', () => {
    renderHook(() => useAutoRefresh({ intervalMs: 1000 }))

    act(() => {
      setHidden(true)
    })
    revalidate.mockReset()

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(revalidate).not.toHaveBeenCalled()
  })

  // Coming back to stale prices and waiting up to 30 seconds is worse than a
  // single immediate fetch.
  it('refreshes immediately when the tab becomes visible again', () => {
    renderHook(() => useAutoRefresh({ intervalMs: 1000 }))

    act(() => {
      setHidden(true)
    })
    revalidate.mockReset()

    act(() => {
      setHidden(false)
    })
    expect(revalidate).toHaveBeenCalledOnce()
  })

  // New loader data re-renders the card under the user's cursor mid-drag.
  it('suspends polling while paused', () => {
    renderHook(() => useAutoRefresh({ intervalMs: 1000, paused: true }))

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(revalidate).not.toHaveBeenCalled()
  })

  it('resumes polling when unpaused', () => {
    const { rerender } = renderHook(
      ({ paused }: { paused: boolean }) => useAutoRefresh({ intervalMs: 1000, paused }),
      { initialProps: { paused: true } },
    )

    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(revalidate).not.toHaveBeenCalled()

    rerender({ paused: false })
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(revalidate).toHaveBeenCalledOnce()
  })

  // Revalidating while a revalidation is in flight queues a second request.
  it('does not stack requests while one is already in flight', () => {
    revalidatorState = 'loading'
    const { result } = renderHook(() => useAutoRefresh({ intervalMs: 1000 }))

    act(() => {
      result.current.refresh()
      vi.advanceTimersByTime(3000)
    })

    expect(revalidate).not.toHaveBeenCalled()
    expect(result.current.isRefreshing).toBe(true)
  })

  it('exposes a manual refresh', () => {
    const { result } = renderHook(() => useAutoRefresh({ intervalMs: 100_000 }))

    act(() => {
      result.current.refresh()
    })
    expect(revalidate).toHaveBeenCalledOnce()
  })

  it('reports whether the tab is suspended', () => {
    const { result } = renderHook(() => useAutoRefresh({ intervalMs: 1000 }))
    expect(result.current.isSuspended).toBe(false)

    act(() => {
      setHidden(true)
    })
    expect(result.current.isSuspended).toBe(true)
  })

  it('stops polling after unmount', () => {
    const { unmount } = renderHook(() => useAutoRefresh({ intervalMs: 1000 }))
    unmount()

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(revalidate).not.toHaveBeenCalled()
  })
})
