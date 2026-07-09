/** Control characters, including CR and LF, which can smuggle response headers. */
// eslint-disable-next-line no-control-regex -- matching control characters is the point
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/

/**
 * Constrain a user-supplied redirect target to a path on this origin.
 *
 * The theme form carries a `returnTo` field so a no-JavaScript submission lands
 * back where it started. That field is attacker-controllable, and `redirect()`
 * will happily send a browser to `https://evil.example` — the classic open
 * redirect. Anything that is not an unambiguous same-origin path collapses to
 * the fallback.
 *
 * Rejected: absolute URLs, protocol-relative `//host`, the backslash and
 * percent-encoded variants that some browsers normalise back to `//`, and
 * control characters that could split the Location header.
 */
export function safeRedirectPath(to: unknown, fallback = '/'): string {
  if (typeof to !== 'string' || to.length === 0) return fallback
  if (!to.startsWith('/')) return fallback
  if (CONTROL_CHARACTERS.test(to)) return fallback

  const lower = to.toLowerCase()
  if (
    lower.startsWith('//') ||
    lower.startsWith('/\\') ||
    lower.startsWith('/%2f') ||
    lower.startsWith('/%5c')
  ) {
    return fallback
  }

  return to
}
