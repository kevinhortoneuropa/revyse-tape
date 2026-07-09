import { forwardRef, type InputHTMLAttributes } from 'react'

import { cn } from './cn'

export type InputProps = InputHTMLAttributes<HTMLInputElement>

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground',
        'placeholder:text-muted',
        'transition-colors duration-150',
        className,
      )}
      {...props}
    />
  )
})
