import { describe, expect, it } from 'vitest'

import { safeRedirectPath } from './safe-redirect'

describe('safeRedirectPath', () => {
  it('passes through a same-origin path', () => {
    expect(safeRedirectPath('/')).toBe('/')
    expect(safeRedirectPath('/?q=eth')).toBe('/?q=eth')
    expect(safeRedirectPath('/nested/path?a=1#top')).toBe('/nested/path?a=1#top')
  })

  // `redirect()` will happily send a browser off-origin. This is the whole point.
  it.each([
    ['absolute http', 'http://evil.example'],
    ['absolute https', 'https://evil.example/steal'],
    ['protocol-relative', '//evil.example'],
    ['backslash variant', '/\\evil.example'],
    ['encoded slashes', '/%2fevil.example'],
    ['encoded slashes, upper case', '/%2Fevil.example'],
    ['encoded backslashes', '/%5cevil.example'],
    ['scheme-ish', 'javascript:alert(1)'],
    ['relative', 'dashboard'],
  ])('rejects %s', (_label, value) => {
    expect(safeRedirectPath(value)).toBe('/')
  })

  // A newline in the Location header is a response-splitting primitive.
  it.each([
    ['newline', '/\npath'],
    ['carriage return', '/\rpath'],
    ['null byte', '/\u0000path'],
    ['delete', '/\u007fpath'],
  ])('rejects a path containing a %s', (_label, value) => {
    expect(safeRedirectPath(value)).toBe('/')
  })

  it.each([undefined, null, '', 42, {}])('rejects the non-string %p', (value) => {
    expect(safeRedirectPath(value)).toBe('/')
  })

  it('honours a custom fallback', () => {
    expect(safeRedirectPath('https://evil.example', '/home')).toBe('/home')
  })
})
