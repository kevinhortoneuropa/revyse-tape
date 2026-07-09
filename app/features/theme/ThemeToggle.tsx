import { useFetcher, useLocation } from '@remix-run/react'

import { Button } from '~/components/ui/Button'
import { nextThemePreference, type ThemePreference } from '~/lib/theme'

const LABELS: Record<ThemePreference, string> = {
  system: 'Follow system theme',
  light: 'Light theme',
  dark: 'Dark theme',
}

const ICONS: Record<ThemePreference, string> = {
  system:
    'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364-.707-.707M6.343 6.343l-.707-.707m12.728 0-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  light:
    'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364-.707-.707M6.343 6.343l-.707-.707m12.728 0-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  dark: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z',
}

export function ThemeToggle({ preference }: { readonly preference: ThemePreference }) {
  const fetcher = useFetcher()
  const location = useLocation()

  // Show the pending preference immediately rather than waiting for the server
  // round trip. Falls back to the committed value when nothing is in flight.
  const submitted = fetcher.formData?.get('theme')
  const current = typeof submitted === 'string' ? (submitted as ThemePreference) : preference
  const next = nextThemePreference(current)

  return (
    <fetcher.Form method="post" action="/theme">
      {/* Without JavaScript this returns the browser to where it started. */}
      <input type="hidden" name="returnTo" value={`${location.pathname}${location.search}`} />
      <Button
        type="submit"
        name="theme"
        value={next}
        size="icon"
        variant="outline"
        title={`${LABELS[current]}. Switch to ${LABELS[next].toLowerCase()}.`}
        aria-label={`${LABELS[current]}. Switch to ${LABELS[next].toLowerCase()}.`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5"
        >
          <path d={ICONS[current]} />
        </svg>
        {current === 'system' ? (
          <span className="absolute -mt-6 ml-6 text-[9px] font-bold tracking-tight">AUTO</span>
        ) : null}
      </Button>
    </fetcher.Form>
  )
}
