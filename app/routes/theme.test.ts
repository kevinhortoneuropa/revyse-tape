import { describe, expect, it } from 'vitest'

import { readThemePreference } from '~/features/theme/theme.server'

import { action, loader } from './theme'

const noop = () => undefined

function post(body: Record<string, string>, { dataRequest = false } = {}) {
  const form = new FormData()
  for (const [key, value] of Object.entries(body)) form.append(key, value)

  const url = dataRequest ? 'http://localhost/theme?_data=routes%2Ftheme' : 'http://localhost/theme'
  return action({
    request: new Request(url, { method: 'POST', body: form }),
    params: {},
    // The action reads nothing from the load context, but Remix's types now
    // require it: AppLoadContext is augmented with `cloudflare` in load-context.ts.
    context: {
      cloudflare: {
        env: {},
        ctx: { waitUntil: noop, passThroughOnException: noop },
      },
    },
  })
}

const cookieOf = (response: Response) => response.headers.get('Set-Cookie') ?? ''

describe('theme action', () => {
  // Without JavaScript the browser follows this redirect back to the page it
  // came from, and the theme has already changed.
  it('redirects a document submission back to returnTo', async () => {
    const response = await post({ theme: 'dark', returnTo: '/?q=eth' })

    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toBe('/?q=eth')
    expect(cookieOf(response)).toContain('theme=')
  })

  // Redirecting a fetcher would navigate. 204 lets the root loader revalidate
  // in place, so the theme swaps with no page transition.
  it('answers a client-side submission with 204 and no Location', async () => {
    const response = await post({ theme: 'dark', returnTo: '/' }, { dataRequest: true })

    expect(response.status).toBe(204)
    expect(response.headers.get('Location')).toBeNull()
    expect(cookieOf(response)).toContain('theme=')
  })

  it('actually sets the requested preference', async () => {
    const response = await post({ theme: 'light', returnTo: '/' })
    const request = new Request('http://localhost/', {
      headers: { Cookie: cookieOf(response) },
    })

    await expect(readThemePreference(request)).resolves.toBe('light')
  })

  // The form body is attacker-controllable. redirect() would happily send a
  // browser to another origin.
  it.each(['https://evil.example', '//evil.example', '/\\evil.example'])(
    'refuses to redirect to %s',
    async (returnTo) => {
      const response = await post({ theme: 'dark', returnTo })
      expect(response.headers.get('Location')).toBe('/')
    },
  )

  it('coerces an unknown preference to system rather than throwing', async () => {
    const response = await post({ theme: 'chartreuse', returnTo: '/' })
    const request = new Request('http://localhost/', { headers: { Cookie: cookieOf(response) } })

    expect(response.status).toBe(302)
    await expect(readThemePreference(request)).resolves.toBe('system')
  })

  it('tolerates a missing returnTo', async () => {
    const response = await post({ theme: 'dark' })
    expect(response.headers.get('Location')).toBe('/')
  })
})

describe('theme loader', () => {
  it('sends a stray GET back to the dashboard', () => {
    const response = loader()
    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toBe('/')
  })
})
