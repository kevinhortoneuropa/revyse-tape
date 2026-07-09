import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge class names, letting later Tailwind utilities win over earlier ones.
 *
 * `clsx` alone would emit `px-2 px-4` and leave the winner to CSS source order,
 * which is not what a caller passing `className="px-4"` expects.
 */
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs))
