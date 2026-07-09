import { createRemixStub } from '@remix-run/testing'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { ThemePreference } from '~/lib/theme'

import { ThemeToggle } from './ThemeToggle'

type StubAction = (args: { request: Request }) => null | Promise<null>

function renderToggle(preference: ThemePreference, action: StubAction = () => null) {
  const Stub = createRemixStub([
    { path: '/', Component: () => <ThemeToggle preference={preference} /> },
    { path: '/theme', action },
  ])

  render(<Stub initialEntries={['/?q=eth']} />)
}

describe('ThemeToggle', () => {
  it.each([
    ['system', 'Switch to light theme'],
    ['light', 'Switch to dark theme'],
    ['dark', 'Switch to follow system theme'],
  ] as const)('from %s, offers to switch to the next preference', (preference, expected) => {
    renderToggle(preference)
    expect(screen.getByRole('button', { name: new RegExp(expected, 'i') })).toBeInTheDocument()
  })

  it('announces the current theme to assistive technology', () => {
    renderToggle('dark')
    expect(screen.getByRole('button').getAttribute('aria-label')).toMatch(/^Dark theme\./)
  })

  // Without JavaScript the browser posts this natively, so it must be a real
  // form with a real action and a returnTo that survives the round trip.
  it('renders a real form that posts to /theme', () => {
    renderToggle('light')

    const form = screen.getByRole('button').closest('form')
    expect(form).toHaveAttribute('action', '/theme')
    expect(form).toHaveAttribute('method', 'post')
  })

  it('carries the current path and query in returnTo', () => {
    renderToggle('light')

    const returnTo = screen.getByRole('button').closest('form')?.querySelector('[name="returnTo"]')
    expect(returnTo).toHaveValue('/?q=eth')
  })

  it('submits the next preference, not the current one', async () => {
    const action = vi.fn<StubAction>().mockReturnValue(null)
    renderToggle('light', action)

    await userEvent.click(screen.getByRole('button'))

    expect(action).toHaveBeenCalledOnce()
    const form = await action.mock.calls[0]![0].request.formData()
    expect(form.get('theme')).toBe('dark')
    expect(form.get('returnTo')).toBe('/?q=eth')
  })

  it('flips its label optimistically while the submission is in flight', async () => {
    // The action never resolves, so the fetcher stays in a submitting state.
    const action: StubAction = () => new Promise<null>(() => undefined)
    renderToggle('light', action)

    await userEvent.click(screen.getByRole('button'))

    // Already showing the *dark* state's affordance, before the server replied.
    expect(
      screen.getByRole('button', { name: /Switch to follow system theme/i }),
    ).toBeInTheDocument()
  })
})
