import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CoinbaseDataError, CoinbaseUnavailableError } from '~/lib/coinbase/errors'

const getDashboardData = vi.fn()

vi.mock('~/features/dashboard/coinbase.server', () => ({
  getCoinbaseClient: () => ({
    getDashboardData: () => getDashboardData() as unknown,
    invalidate: vi.fn(),
  }),
}))

const { headers, loader, shouldRevalidate } = await import('./_index')

type LoaderArgs = Parameters<typeof loader>[0]

/** remix-serve passes an empty load context; readEnv falls back to process.env. */
const loaderArgs = { context: {} } as LoaderArgs

type RevalidateArgs = Parameters<typeof shouldRevalidate>[0]

/** A plain navigation with no form submission and no query string. */
const baseArgs: RevalidateArgs = {
  currentUrl: new URL('http://localhost/'),
  currentParams: {},
  nextUrl: new URL('http://localhost/'),
  nextParams: {},
  defaultShouldRevalidate: true,
}

const revalidate = (overrides: Partial<RevalidateArgs>): boolean =>
  shouldRevalidate({ ...baseArgs, ...overrides })

beforeEach(() => {
  getDashboardData.mockReset()
})

describe('dashboard loader', () => {
  it('returns the assets and the fetch time', async () => {
    getDashboardData.mockResolvedValue({
      assets: [{ symbol: 'BTC' }],
      dropped: [],
      fetchedAt: 1234,
    })

    await expect(loader(loaderArgs)).resolves.toEqual({
      assets: [{ symbol: 'BTC' }],
      fetchedAt: 1234,
    })
  })

  // Both are expected failure modes, not bugs. The ErrorBoundary renders a 503
  // rather than a stack trace.
  it.each([
    ['upstream unavailable', new CoinbaseUnavailableError('down')],
    ['unusable payload', new CoinbaseDataError('no BTC rate')],
  ])('turns %s into a 503 response', async (_label, error) => {
    getDashboardData.mockRejectedValue(error)

    const thrown: unknown = await loader(loaderArgs).catch((e: unknown) => e)

    expect(thrown).toBeInstanceOf(Response)
    expect((thrown as Response).status).toBe(503)
    await expect((thrown as Response).text()).resolves.toContain('temporarily unavailable')
  })

  // A genuine bug must not be disguised as a friendly outage message.
  it('lets an unexpected error bubble as a real failure', async () => {
    getDashboardData.mockRejectedValue(new TypeError('undefined is not a function'))
    await expect(loader(loaderArgs)).rejects.toThrow(TypeError)
  })
})

describe('dashboard shouldRevalidate', () => {
  // The whole reason URL-backed filter state is affordable. setSearchParams is
  // a navigation, and Remix re-runs loaders on navigation, so without this each
  // keystroke would hit Coinbase.
  it('does not refetch when only the query string changes', () => {
    expect(
      revalidate({
        currentUrl: new URL('http://localhost/'),
        nextUrl: new URL('http://localhost/?q=eth'),
      }),
    ).toBe(false)
  })

  it('does not refetch as the filter is edited', () => {
    expect(
      revalidate({
        currentUrl: new URL('http://localhost/?q=et'),
        nextUrl: new URL('http://localhost/?q=eth'),
      }),
    ).toBe(false)
  })

  // Changing the theme cannot change a price.
  it('does not refetch on a theme submission', () => {
    expect(revalidate({ formAction: '/theme' })).toBe(false)
  })

  // useRevalidator() leaves the URL untouched, so it must fall through and
  // actually refetch — otherwise the auto-refresh timer would do nothing.
  it('refetches when the URL is unchanged, as useRevalidator leaves it', () => {
    expect(revalidate({})).toBe(true)
  })

  it('refetches on a real navigation to another path', () => {
    expect(
      revalidate({
        currentUrl: new URL('http://localhost/other'),
        nextUrl: new URL('http://localhost/'),
      }),
    ).toBe(true)
  })

  it('honours the default when Remix says not to revalidate', () => {
    expect(revalidate({ defaultShouldRevalidate: false })).toBe(false)
  })
})

describe('dashboard headers', () => {
  it('lets a CDN cache briefly but never the browser', () => {
    // The implementation ignores its arguments; call it as the nullary function
    // it really is rather than fabricating a HeadersArgs.
    const value = new Headers((headers as () => HeadersInit)()).get('Cache-Control')

    expect(value).toContain('max-age=0')
    expect(value).toContain('s-maxage=10')
    expect(value).toContain('stale-while-revalidate')
  })
})
