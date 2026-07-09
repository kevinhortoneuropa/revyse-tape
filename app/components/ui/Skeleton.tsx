import type { HTMLAttributes } from 'react'

import { cn } from './cn'

/**
 * A shimmering placeholder. Always `aria-hidden`: a screen reader should hear
 * the loading status from a live region, not from a dozen decorative blocks.
 */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn('animate-pulse rounded-md bg-border/70', className)}
      {...props}
    />
  )
}
