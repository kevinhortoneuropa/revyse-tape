import { describe, expect, it } from 'vitest'

import { readThemePreference, serializeThemePreference } from './theme.server'

const requestWith = (cookie?: string) =>
  new Request('http://localhost/', cookie ? { headers: { Cookie: cookie } } : undefined)

describe('theme cookie', () => {
  it('round-trips a preference', async () => {
    const cookie = await serializeThemePreference('dark')
    await expect(readThemePreference(requestWith(cookie))).resolves.toBe('dark')
  })

  // No cookie means "follow the OS", which the stylesheet handles.
  it('defaults to system when absent', async () => {
    await expect(readThemePreference(requestWith())).resolves.toBe('system')
  })

  // The cookie is user-writable. Devtools, an extension, or a stale value from
  // an older version must never crash the root loader.
  it.each([
    ['a garbage value', 'theme=chartreuse'],
    ['a malformed value', 'theme=%%%'],
    ['an unrelated cookie', 'session=abc'],
    ['an empty value', 'theme='],
  ])('falls back to system for %s', async (_label, cookie) => {
    await expect(readThemePreference(requestWith(cookie))).resolves.toBe('system')
  })

  it('is scoped, long-lived, and unreadable from JavaScript', async () => {
    const cookie = await serializeThemePreference('light')

    expect(cookie).toContain('Path=/')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=Lax')
    expect(cookie).toMatch(/Max-Age=\d{7,}/)
  })
})
