/**
 * Whether the *client* reached us over HTTPS.
 *
 * Not the same question as "is this request's URL https", and not the same
 * question as "is NODE_ENV production". Three deployments disagree:
 *
 *   - locally, the URL is `http://localhost` and the client really is on http
 *   - on Cloudflare Workers, `request.url` is the public `https://` URL
 *   - behind a TLS-terminating proxy, `request.url` is `http://` even though
 *     the client used HTTPS — only `X-Forwarded-Proto` knows the truth
 *
 * `X-Forwarded-Proto` is client-spoofable, and we trust it anyway, because it
 * can only ever *add* the Secure attribute to a cookie, never remove it. The
 * worst an attacker achieves by forging it is a `Secure` cookie on their own
 * plaintext connection, which their own browser then refuses to send back.
 * They have broken nobody's session but their own. The dangerous direction —
 * using the header to *skip* Secure — is not reachable from here.
 *
 * A chain of proxies appends to the header, so the first value is the one the
 * client actually spoke.
 */
export function isSecureRequest(request: Request): boolean {
  if (new URL(request.url).protocol === 'https:') return true

  const forwarded = request.headers.get('x-forwarded-proto')
  if (forwarded === null) return false

  return forwarded.split(',')[0]?.trim().toLowerCase() === 'https'
}
