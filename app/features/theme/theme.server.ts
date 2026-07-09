import { createCookie } from '@remix-run/node'

import { parseThemePreference, type ThemePreference } from '~/lib/theme'

/**
 * The theme lives in a cookie rather than localStorage for one reason: the root
 * loader can read a cookie, so the server emits `<html class="dark">` in the
 * first byte. localStorage is only readable after hydration, which is why
 * localStorage-based dark mode always flashes light first, or needs a blocking
 * inline script to avoid it.
 *
 * `httpOnly` because nothing on the client needs to read it — the class is
 * already on <html> by the time any script runs.
 */
export const themeCookie = createCookie('theme', {
  path: '/',
  httpOnly: true,
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 365,
  secure: process.env.NODE_ENV === 'production',
})

export async function readThemePreference(request: Request): Promise<ThemePreference> {
  const header = request.headers.get('Cookie')
  const value: unknown = await themeCookie.parse(header)
  return parseThemePreference(value)
}

export function serializeThemePreference(preference: ThemePreference): Promise<string> {
  return themeCookie.serialize(preference)
}
