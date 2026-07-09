import { PassThrough } from 'node:stream'

import { createReadableStreamFromReadable, type EntryContext } from '@remix-run/node'
import { RemixServer } from '@remix-run/react'
import { isbot } from 'isbot'
import { renderToPipeableStream } from 'react-dom/server'

/**
 * How long a stream may stay open before we give up on it. Bots get the fully
 * rendered document; humans get the shell as soon as it is ready.
 */
const ABORT_DELAY = 5_000

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
): Promise<Response> {
  const userAgent = request.headers.get('user-agent')

  // Bots need the whole document before they see anything, so we wait for
  // `onAllReady`. Browsers can start painting from the shell.
  const readyOption: 'onAllReady' | 'onShellReady' =
    userAgent !== null && isbot(userAgent) ? 'onAllReady' : 'onShellReady'

  return new Promise((resolve, reject) => {
    let shellRendered = false
    let statusCode = responseStatusCode

    const { pipe, abort } = renderToPipeableStream(
      <RemixServer context={remixContext} url={request.url} abortDelay={ABORT_DELAY} />,
      {
        [readyOption]() {
          shellRendered = true
          const body = new PassThrough()
          const stream = createReadableStreamFromReadable(body)

          responseHeaders.set('Content-Type', 'text/html')

          resolve(new Response(stream, { headers: responseHeaders, status: statusCode }))

          pipe(body)
        },
        onShellError(error: unknown) {
          reject(error instanceof Error ? error : new Error(String(error)))
        },
        onError(error: unknown) {
          statusCode = 500
          // Errors thrown after the shell has flushed cannot change the status
          // code, but they still need to reach the logs.
          if (shellRendered) {
            console.error(error)
          }
        },
      },
    )

    setTimeout(abort, ABORT_DELAY)
  })
}
