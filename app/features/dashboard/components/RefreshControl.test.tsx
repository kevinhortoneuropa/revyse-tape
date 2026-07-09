import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { RefreshControl } from './RefreshControl'

const NOW = 1_700_000_000_000

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(NOW)
})
afterEach(() => {
  vi.useRealTimers()
})

describe('RefreshControl', () => {
  it('shows how long ago the prices were fetched', () => {
    render(<RefreshControl fetchedAt={NOW - 12_000} isRefreshing={false} onRefresh={vi.fn()} />)
    expect(screen.getByText('12s ago')).toBeInTheDocument()
  })

  it('exposes the exact instant as a machine-readable datetime', () => {
    render(<RefreshControl fetchedAt={NOW} isRefreshing={false} onRefresh={vi.fn()} />)

    expect(screen.getByText('just now')).toHaveAttribute('dateTime', new Date(NOW).toISOString())
  })

  it('ticks so the timestamp does not go stale on screen', async () => {
    render(<RefreshControl fetchedAt={NOW - 8000} isRefreshing={false} onRefresh={vi.fn()} />)
    expect(screen.getByText('8s ago')).toBeInTheDocument()

    await vi.advanceTimersByTimeAsync(3000)
    expect(screen.getByText('11s ago')).toBeInTheDocument()
  })

  it('announces that an update is in progress', () => {
    render(<RefreshControl fetchedAt={NOW} isRefreshing onRefresh={vi.fn()} />)
    expect(screen.getByText('Updating…')).toBeInTheDocument()
  })

  it('calls onRefresh when pressed', async () => {
    const onRefresh = vi.fn()
    render(<RefreshControl fetchedAt={NOW} isRefreshing={false} onRefresh={onRefresh} />)

    await userEvent.click(screen.getByRole('button', { name: /refresh exchange rates now/i }))
    expect(onRefresh).toHaveBeenCalledOnce()
  })

  it('cannot be pressed while a refresh is in flight', async () => {
    const onRefresh = vi.fn()
    render(<RefreshControl fetchedAt={NOW} isRefreshing onRefresh={onRefresh} />)

    await userEvent.click(screen.getByRole('button', { name: /refresh/i }))
    expect(onRefresh).not.toHaveBeenCalled()
  })

  // Clock skew between the server's fetchedAt and the browser's Date.now().
  it('never claims the prices arrive from the future', () => {
    render(<RefreshControl fetchedAt={NOW + 5000} isRefreshing={false} onRefresh={vi.fn()} />)
    expect(screen.getByText('just now')).toBeInTheDocument()
  })
})
