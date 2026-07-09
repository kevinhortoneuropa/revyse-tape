import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Button } from './Button'

describe('Button', () => {
  it('renders its children', () => {
    render(<Button>Refresh</Button>)
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument()
  })

  // The HTML default is "submit", which would make any stray button inside a
  // Remix <Form> submit it.
  it('defaults to type="button"', () => {
    render(<Button>Go</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })

  it('allows the type to be overridden', () => {
    render(<Button type="submit">Go</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })

  it('calls onClick', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Go</Button>)

    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not fire when disabled', async () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Go
      </Button>,
    )

    await userEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('merges a caller className over its own', () => {
    render(<Button className="px-8">Go</Button>)
    expect(screen.getByRole('button').className).toContain('px-8')
    expect(screen.getByRole('button').className).not.toContain('px-4')
  })

  it('forwards a ref', () => {
    const ref = { current: null as HTMLButtonElement | null }
    render(<Button ref={ref}>Go</Button>)
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })
})
