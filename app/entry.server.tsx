import type { EntryContext } from '@remix-run/cloudflare'
import { RemixServer } from '@remix-run/react'
import { isbot } from 'isbot'
import { renderToReadableStream } from 'react-dom/server'

/**
 * Web Streams, not Node streams.
 *
 * `renderToPipeableStream` does not exist on workerd. That is not a missing
 * Node API — `nodejs_compat` would not help — it is a package-exports problem:
 * workerd resolves `react-dom/server` to the edge build, which exports only
 * `renderToReadableStream`. `cloudflareDevProxyVitePlugin` is what sets the
 * `workerd` resolve condition that makes this import land on the right file.
 */

/** How long a render may stay open before we give up on it. */
const ABORT_DELAY = 5_000

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
): Promise<Response> {
  let statusCode = responseStatusCode

  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort()
  }, ABORT_DELAY)

  const body = await renderToReadableStream(
    <RemixServer context={remixContext} url={request.url} abortDelay={ABORT_DELAY} />,
    {
      signal: controller.signal,
      onError(error: unknown) {
        statusCode = 500
        // An abort is our own timeout firing, not a bug worth logging.
        if (!controller.signal.aborted) console.error(error)
      },
    },
  )

  void body.allReady.then(() => {
    clearTimeout(timeoutId)
  })

  // Bots need the whole document before they see anything; browsers can start
  // painting from the shell.
  const userAgent = request.headers.get('user-agent')
  if (userAgent !== null && isbot(userAgent)) {
    await body.allReady
  }

  responseHeaders.set('Content-Type', 'text/html')
  return new Response(body, { headers: responseHeaders, status: statusCode })
}
