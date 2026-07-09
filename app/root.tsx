import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useFetchers,
  useRouteError,
  useRouteLoaderData,
} from '@remix-run/react'
import type { LinksFunction, LoaderFunctionArgs } from '@remix-run/node'
import type { ReactNode } from 'react'

import { readThemePreference } from '~/features/theme/theme.server'
import { parseThemePreference, themeClass, type ThemePreference } from '~/lib/theme'

import stylesheet from './app.css?url'

export const links: LinksFunction = () => [
  // The loader hits Coinbase on every request; warm the connection early.
  { rel: 'preconnect', href: 'https://api.coinbase.com' },
  { rel: 'stylesheet', href: stylesheet },
]

export async function loader({ request }: LoaderFunctionArgs) {
  return { theme: await readThemePreference(request) }
}

/**
 * The preference a theme submission is currently posting, if any.
 *
 * Lets `<html>` flip the instant the button is pressed rather than after the
 * server round trip, without the toggle having to reach up into the root.
 */
function usePendingTheme(): ThemePreference | undefined {
  const pending = useFetchers().find((f) => f.formAction === '/theme')
  const submitted = pending?.formData?.get('theme')

  return typeof submitted === 'string' ? parseThemePreference(submitted) : undefined
}

export function Layout({ children }: { readonly children: ReactNode }) {
  // Layout also renders inside the root ErrorBoundary, where no loader ran.
  // useRouteLoaderData returns undefined there; useLoaderData would throw.
  const data = useRouteLoaderData<typeof loader>('root')
  const theme = usePendingTheme() ?? data?.theme ?? 'system'

  return (
    // `system` emits no class, letting the stylesheet's prefers-color-scheme
    // query decide. Written server-side, so the first byte is already correct
    // and there is no flash of the wrong theme.
    <html lang="en" className={themeClass(theme) || undefined}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="min-h-dvh">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  return <Outlet />
}

export function ErrorBoundary() {
  const error = useRouteError()

  const isResponse = isRouteErrorResponse(error)
  const title = isResponse ? `${String(error.status)} ${error.statusText}` : 'Something went wrong'
  const detail: unknown = isResponse ? error.data : undefined

  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted">
          {typeof detail === 'string'
            ? detail
            : 'An unexpected error occurred. Reloading may help.'}
        </p>
      </div>
    </main>
  )
}
