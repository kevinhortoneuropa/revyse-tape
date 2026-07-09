import { redirect, type ActionFunctionArgs } from '@remix-run/node'

import { serializeThemePreference } from '~/features/theme/theme.server'
import { parseThemePreference } from '~/lib/theme'
import { safeRedirectPath } from '~/lib/url/safe-redirect'

/**
 * The dashboard's only mutation, and the reason this app has a write path at
 * all. It is a resource route: an `action` and nothing else.
 *
 * Without JavaScript the browser posts this form natively, the server sets the
 * cookie and redirects back, and the page re-renders in the new theme. With
 * JavaScript, `useFetcher` posts in the background and no navigation happens.
 * Same code, two behaviours — which is Remix's entire thesis.
 */
export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData()

  // The form body is a trust boundary. A hand-crafted POST cannot put anything
  // but a known preference into the cookie, nor redirect a browser off-origin.
  const preference = parseThemePreference(form.get('theme'))
  const returnTo = safeRedirectPath(form.get('returnTo'))

  const headers = { 'Set-Cookie': await serializeThemePreference(preference) }

  // Remix appends `?_data=` to client-side submissions. Redirecting a fetcher
  // would make it navigate; an empty 204 lets the root loader revalidate in
  // place, so the theme swaps without a page transition.
  if (new URL(request.url).searchParams.has('_data')) {
    return new Response(null, { status: 204, headers })
  }

  return redirect(returnTo, { headers })
}

/** Nothing to GET here. Sends a stray visitor home rather than 404ing. */
export function loader() {
  return redirect('/')
}
