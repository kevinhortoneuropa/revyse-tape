import { describe, expect, it } from 'vitest'

import { readThemePreference, serializeThemePreference } from './theme.server'

const requestWith = (cookie?: string) =>
  new Request('http://localhost/', cookie ? { headers: { Cookie: cookie } } : undefined)

const serializeOver = (url: string, headers: Record<string, string> = {}) =>
  serializeThemePreference('dark', new Request(url, { headers }))

describe('theme cookie', () => {
  it('round-trips a preference', async () => {
    const cookie = await serializeOver('http://localhost/')
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
    const cookie = await serializeOver('http://localhost/')

    expect(cookie).toContain('Path=/')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=Lax')
    expect(cookie).toMatch(/Max-Age=\d{7,}/)
  })
})

describe('the Secure attribute', () => {
  it('is set when the client reached us over https', async () => {
    expect(await serializeOver('https://revyse.example/')).toContain('Secure')
  })

  // Safari refuses to return a Secure cookie set over http://localhost, so
  // marking a dev request secure kills dark mode in that browser and no other.
  it('is omitted on plain http, so Safari can round-trip it in development', async () => {
    expect(await serializeOver('http://localhost:3000/')).not.toContain('Secure')
  })

  // Behind a TLS-terminating proxy the app sees http; only the header knows.
  it('is set behind a proxy that forwards X-Forwarded-Proto: https', async () => {
    expect(await serializeOver('http://internal/', { 'x-forwarded-proto': 'https' })).toContain(
      'Secure',
    )
  })

  // The header may only ever add Secure, never strip it.
  it('cannot be stripped from a genuine https request by a forged header', async () => {
    expect(
      await serializeOver('https://revyse.example/', { 'x-forwarded-proto': 'http' }),
    ).toContain('Secure')
  })

  // The bug this replaces: `secure: process.env['NODE_ENV'] === 'production'`.
  // It is also what makes this module portable to a runtime with no `process`.
  it('does not depend on NODE_ENV', async () => {
    const original = process.env['NODE_ENV']
    try {
      process.env['NODE_ENV'] = 'production'
      expect(await serializeOver('http://localhost/')).not.toContain('Secure')

      process.env['NODE_ENV'] = 'development'
      expect(await serializeOver('https://revyse.example/')).toContain('Secure')
    } finally {
      process.env['NODE_ENV'] = original
    }
  })
})
