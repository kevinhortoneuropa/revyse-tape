import type { HTMLAttributes } from 'react'

import { cn } from './cn'

export type CardProps = HTMLAttributes<HTMLDivElement>

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-card)]',
        className,
      )}
      {...props}
    />
  )
}
