import { createCookie } from '@remix-run/cloudflare'

import { parseThemePreference, type ThemePreference } from '~/lib/theme'
import { isSecureRequest } from '~/lib/url/secure-request'

/**
 * The theme lives in a cookie rather than localStorage for one reason: the root
 * loader can read a cookie, so the server emits `<html class="dark">` in the
 * first byte. localStorage is only readable after hydration, which is why
 * localStorage-based dark mode always flashes light first, or needs a blocking
 * inline script to avoid it.
 *
 * `httpOnly` because nothing on the client needs to read it — the class is
 * already on <html> by the time any script runs.
 *
 * `secure` is deliberately absent here and decided per request at serialize
 * time. See `serializeThemePreference`.
 */
export const themeCookie = createCookie('theme', {
  path: '/',
  httpOnly: true,
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 365,
})

export async function readThemePreference(request: Request): Promise<ThemePreference> {
  const header = request.headers.get('Cookie')
  const value: unknown = await themeCookie.parse(header)
  return parseThemePreference(value)
}

/**
 * `Secure` is computed from the request, not from `NODE_ENV`.
 *
 * The obvious `secure: process.env.NODE_ENV === 'production'` is wrong in both
 * directions. It sets Secure on a production build served over plain http —
 * and Safari refuses to return a Secure cookie set over `http://localhost`, so
 * dark mode silently dies in that browser and no other. It also *omits* Secure
 * on any HTTPS deployment whose NODE_ENV is not exactly "production", quietly
 * downgrading a real cookie.
 *
 * Deciding from the transport is correct everywhere, and reads no environment
 * at all — which is also what makes this module portable to a runtime that has
 * no `process`.
 */
export function serializeThemePreference(
  preference: ThemePreference,
  request: Request,
): Promise<string> {
  return themeCookie.serialize(preference, { secure: isSecureRequest(request) })
}
