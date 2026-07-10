import { describe, expect, it } from 'vitest'

import { isSecureRequest } from './secure-request'

const req = (url: string, headers: Record<string, string> = {}) => new Request(url, { headers })

describe('isSecureRequest', () => {
  it('is true for an https URL', () => {
    expect(isSecureRequest(req('https://revyse.example/'))).toBe(true)
  })

  // The case that matters in dev. Safari will not return a Secure cookie set
  // over http://localhost, so marking this request secure breaks the theme
  // toggle in that browser and no other.
  it('is false for plain http on localhost', () => {
    expect(isSecureRequest(req('http://localhost:3000/'))).toBe(false)
    expect(isSecureRequest(req('http://127.0.0.1:3000/'))).toBe(false)
  })

  // Behind a TLS-terminating proxy the app sees http, but the client used https.
  it('trusts X-Forwarded-Proto when the URL is plain http', () => {
    expect(isSecureRequest(req('http://internal/', { 'x-forwarded-proto': 'https' }))).toBe(true)
  })

  it('reads the first value of a proxy chain', () => {
    expect(isSecureRequest(req('http://internal/', { 'x-forwarded-proto': 'https,http' }))).toBe(
      true,
    )
    expect(isSecureRequest(req('http://internal/', { 'x-forwarded-proto': ' HTTPS , http' }))).toBe(
      true,
    )
    expect(isSecureRequest(req('http://internal/', { 'x-forwarded-proto': 'http,https' }))).toBe(
      false,
    )
  })

  it('is case-insensitive', () => {
    expect(isSecureRequest(req('http://internal/', { 'x-forwarded-proto': 'HTTPS' }))).toBe(true)
  })

  // The header is client-spoofable, so it may only ever ADD Secure. A forged
  // `http` must not be able to strip it from a genuine https request.
  it('cannot be used to downgrade a genuine https request', () => {
    expect(isSecureRequest(req('https://revyse.example/', { 'x-forwarded-proto': 'http' }))).toBe(
      true,
    )
  })

  it.each(['http', 'ws', '', 'https-ish', 'javascript'])(
    'is false for the X-Forwarded-Proto value %p',
    (value) => {
      expect(isSecureRequest(req('http://internal/', { 'x-forwarded-proto': value }))).toBe(false)
    },
  )
})
