const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE

/**
 * How long ago the prices were fetched, in words.
 *
 * Deliberately coarse. "Updated 4 seconds ago" on a dashboard that refreshes
 * every 30 is precision nobody asked for, and it makes the text reflow on every
 * tick. Below five seconds the answer is simply "just now".
 *
 * A negative elapsed time — clock skew between server and browser — reads as
 * "just now" rather than "in 3 seconds".
 */
export function formatUpdatedAgo(elapsedMs: number): string {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 5 * SECOND) return 'just now'

  if (elapsedMs < MINUTE) {
    return `${String(Math.floor(elapsedMs / SECOND))}s ago`
  }

  if (elapsedMs < HOUR) {
    return `${String(Math.floor(elapsedMs / MINUTE))}m ago`
  }

  return `${String(Math.floor(elapsedMs / HOUR))}h ago`
}
