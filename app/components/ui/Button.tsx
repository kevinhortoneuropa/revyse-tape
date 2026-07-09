import { forwardRef, type ButtonHTMLAttributes } from 'react'

import { cn } from './cn'

const VARIANTS = {
  primary: 'bg-accent text-accent-foreground hover:opacity-90',
  ghost: 'bg-transparent text-foreground hover:bg-surface-hover',
  outline: 'border border-border bg-surface text-foreground hover:bg-surface-hover',
} as const

const SIZES = {
  sm: 'h-8 gap-1.5 px-3 text-xs',
  md: 'h-10 gap-2 px-4 text-sm',
  icon: 'size-10',
} as const

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: keyof typeof VARIANTS
  readonly size?: keyof typeof SIZES
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'outline', size = 'md', type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      // Defaulting to "button" rather than the HTML default of "submit" stops a
      // stray control inside a <Form> from submitting it.
      type={type}
      className={cn(
        'inline-flex cursor-pointer items-center justify-center rounded-lg font-medium',
        'transition-colors duration-150',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  )
})
