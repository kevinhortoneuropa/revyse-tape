import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CoinbaseDataError, CoinbaseUnavailableError } from '~/lib/coinbase/errors'

const getDashboardData = vi.fn()

vi.mock('~/features/dashboard/coinbase.server', () => ({
  coinbase: {
    getDashboardData: () => getDashboardData() as unknown,
    invalidate: vi.fn(),
  },
}))

const { headers, loader } = await import('./_index')

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

    await expect(loader()).resolves.toEqual({ assets: [{ symbol: 'BTC' }], fetchedAt: 1234 })
  })

  // Both are expected failure modes, not bugs. The ErrorBoundary renders a 503
  // rather than a stack trace.
  it.each([
    ['upstream unavailable', new CoinbaseUnavailableError('down')],
    ['unusable payload', new CoinbaseDataError('no BTC rate')],
  ])('turns %s into a 503 response', async (_label, error) => {
    getDashboardData.mockRejectedValue(error)

    const thrown: unknown = await loader().catch((e: unknown) => e)

    expect(thrown).toBeInstanceOf(Response)
    expect((thrown as Response).status).toBe(503)
    await expect((thrown as Response).text()).resolves.toContain('temporarily unavailable')
  })

  // A genuine bug must not be disguised as a friendly outage message.
  it('lets an unexpected error bubble as a real failure', async () => {
    getDashboardData.mockRejectedValue(new TypeError('undefined is not a function'))
    await expect(loader()).rejects.toThrow(TypeError)
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
