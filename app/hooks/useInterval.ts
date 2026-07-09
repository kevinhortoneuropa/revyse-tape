import { useEffect, useRef } from 'react'

/**
 * A declarative interval.
 *
 * The naive `useEffect(() => setInterval(callback, ms), [callback])` tears the
 * timer down and rebuilds it on every render, because `callback` is a new
 * function each time — so a 30-second timer that re-renders every second never
 * fires. Storing the callback in a ref keeps the timer stable while the
 * behaviour stays current.
 *
 * Pass `null` as the delay to pause.
 */
export function useInterval(callback: () => void, delayMs: number | null): void {
  const saved = useRef(callback)

  useEffect(() => {
    saved.current = callback
  }, [callback])

  useEffect(() => {
    if (delayMs === null) return

    const id = setInterval(() => {
      saved.current()
    }, delayMs)

    return () => {
      clearInterval(id)
    }
  }, [delayMs])
}
