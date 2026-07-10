---
status: accepted
---

# Server-render on Cloudflare Workers, not Cloudflare Pages

_This ADR applies only on the `deploy/cloudflare` branch. `main` deploys nowhere
and depends on no vendor — see
[ADR-0006](./0006-deployment-lives-on-an-overlay-branch.md)._

The app runs as a Cloudflare **Worker** with static assets: `main` points at
`server.ts`, `assets.directory` at `build/client`. Cloudflare has told people to
start new projects on Workers rather than Pages since April 2025.

Remix v2's only _first-class_ Cloudflare adapter targets Pages Functions
(`@remix-run/cloudflare-pages`). We use `@remix-run/cloudflare` from a
hand-written `server.ts` instead, which is what Remix's own
`templates/cloudflare-workers` does.

## The configuration that looks right and is not

```jsonc
{ "assets": { "directory": "./dist", "not_found_handling": "single-page-application" } }
```

This is the config everyone reaches for, and it **cannot run this app**.

- **No `main`** means no Worker script, so no server code executes at all.
- **`not_found_handling: "single-page-application"`** answers every unmatched
  route with `index.html` and a `200`, so even with a `main` the Worker would
  never see a page request.

It would deploy a client-rendered SPA. That is not hypothetical — Coinbase sends
`access-control-allow-origin: *`, so a browser really can fetch rates directly —
and it would delete SSR, the cookie-backed theme, the `/theme` action, the
server-side cache, and the sentence the architecture rests on: _the loader is the
data layer_.

`assets.run_worker_first` defaults to `false`, so a matching static file is served
from the edge and the Worker is never invoked; everything else falls through to
SSR. Nothing to bind, no `env.ASSETS.fetch()` call.

## What is Cloudflare-specific, and what turned out not to be

Two runtime facts force real changes:

**`renderToPipeableStream` does not exist on workerd.** `nodejs_compat` does not
help — it is a package-exports problem, not a missing Node API. workerd resolves
`react-dom/server` to the edge build, which exports only `renderToReadableStream`.
`cloudflareDevProxyVitePlugin` sets the `workerd` resolve condition that makes the
import land correctly, and it must precede `remix()` or it throws.

**`process.env` at module scope is `undefined`.** There is no process-level
environment; `env` arrives with the request.

Everything else turned out to be portable, and was landed on `main` instead:

- `app/lib` takes `baseUrl` and `ttlMs` as constructor options rather than reading
  `process.env`. That is a better boundary on Node too.
- `readEnv(context)` in `app/env.server.ts` is the seam. This branch replaces that
  **one file**; every caller is byte-identical on both branches.
- The Coinbase client is memoised per configuration rather than assumed singular.

**`nodejs_compat` is not enabled.** Once the Node streams were gone, nothing
reachable imports a `node:*` module. Verified against the built Worker.

## Consequences

**The e2e suite runs on the real runtime.** Playwright boots `wrangler dev`
(workerd) rather than `remix-serve`, so SSR output, hydration, bundling and module
resolution are exercised as deployed. All 69 specs are byte-identical with `main`;
only the server they boot differs.

**The TTL cache is per-isolate**, which amends
[ADR-0003](./0003-cache-rates-against-coinbases-no-store.md) — on this branch
only. That ADR already noted the hit rate falls as instances scale out; Workers
sharpens _instances_ into _isolates_, which are numerous and short-lived.
Single-flight de-duplication still collapses a cold start's stampede into one
upstream fetch, and bounding load per isolate remains the goal. `caches.default`
is the natural next step — per-colo, surviving isolate churn — but it is GET-only,
refuses anything carrying `Set-Cookie`, and would need an abstraction to keep
`app/lib` testable in Node.

**wrangler is pinned to 4.107.1**, not to latest:

- `@remix-run/dev@2.17.5` optionally peers on `wrangler: ^3.28.2` — the version
  that introduced `getPlatformProxy`, which wrangler 4 still exports. The range is
  stale rather than meaningful, so a scoped `overrides` entry relaxes exactly that
  one peer.
- `@remix-run/cloudflare@2.17.5` peers on `@cloudflare/workers-types@^4`, and
  **`wrangler@4.108.0` moved its own peer to `^5`**, deadlocking the tree.
  `4.107.1` is the last release that agrees with Remix.

Staying on the wrangler 3 line would have satisfied the peer range with no
override — and would have added four dev-only advisories, two HIGH and all
unpatchable, because 3.x is the legacy line. The override is the cheaper debt.
