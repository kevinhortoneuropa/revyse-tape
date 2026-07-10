---
status: accepted
---

# Deployment lives on an overlay branch, not on `main`

`main` targets Node, depends on no hosting vendor, and deploys nowhere. The live
demo runs from `deploy/cloudflare`, a thin overlay branch that swaps the runtime
and nothing else.

## Why not just put it on `main`

The migration works — it is a Cloudflare Worker, 305 unit tests, 69 end-to-end on
workerd, zero production vulnerabilities. Putting it on `main` would be simpler by
one branch.

It would also put `server.ts`, `wrangler.jsonc` and `context.cloudflare.env` at
the root of a repository whose brief said "Remix + React" and never mentioned
deployment. A reader whose company runs on AWS, Vercel or Fly opens the repo and
sees an assumption about their infrastructure. The overlay says the opposite:
here is the edge deployment, and here is it not being in your way.

Concretely, staying on `main` would have cost: `@remix-run/node` replaced,
`wrangler` and `@cloudflare/workers-types` in `devDependencies` (+34 packages), a
scoped npm `overrides` entry to relax a stale peer range, the
`cloudflareDevProxyVitePlugin` and `workerd` resolve conditions changing the dev
server and the SSR build for everyone, and the e2e suite requiring workerd to run
at all.

## Why not a build-time flag on one branch

`DEPLOY_TARGET=cloudflare npm run build` is achievable: switch the Vite plugins,
alias the adapter, keep both in `devDependencies`. One source of truth, and the
demo would run `main` byte for byte.

Rejected because it buys correctness we already have and pays for it in
complexity. The two runtimes need different `entry.server.tsx` files regardless —
`react-dom/server`'s Node build has no `renderToReadableStream`, and its type
definitions claim otherwise, so a shared entry would need either an ambient module
declaration or a resolver alias, on `main`, purely to serve Cloudflare. A CI
matrix, a conditional Vite config and both adapters installed is a lot of
machinery for a repository that deploys to one place.

## What makes the branch cheap

A long-lived branch costs what it _overlaps_ with, not what it contains. So
everything portable was landed on `main` first:

- `app/lib` takes `baseUrl` and `ttlMs` as constructor options rather than reading
  `process.env` at module scope. The pure core was already framework-free; it is
  now environment-free, which is the same idea one layer down. Better on Node too.
- `readEnv(context)` in `app/env.server.ts` is the seam. On `main` it returns
  `process.env`; the overlay replaces that one file and returns the request-scoped
  binding. Every caller is byte-identical on both branches.
- The Coinbase client is memoised per configuration rather than assumed singular.

What remains on the overlay is additive (`server.ts`, `wrangler.jsonc`,
`load-context.ts`), two replaced files (`app/env.server.ts`,
`app/entry.server.tsx`), a handful of config lines, and four one-line adapter
imports.

`git diff main..deploy/cloudflare -- app/lib e2e/` is **empty**.

## Consequences

**The demo is honest.** The deployed application is `main`'s. `app/lib`, every
component, every hook and all 69 end-to-end specs are identical. Only the runtime
differs — and the overlay's suite runs against **workerd**, the runtime it
deploys to, so the demo is tested more strictly than `main` is, not less.

**Merges go one way**, `main` → `deploy/cloudflare`, never back. If a change
belongs on both, it belongs on `main`. `package-lock.json` is the only file that
reliably conflicts, because both branches regenerate it; the resolution is to take
the branch's lockfile and rerun `npm install`, never to hand-merge JSON.

**The overlay can rot.** Nothing forces it to be merged, so `deploy/cloudflare`
can silently fall behind. That is the price of keeping `main` vendor-free, and it
is the reason the sync procedure is written down — in `DEPLOYMENT.md`, on the
overlay branch — rather than remembered.

The Workers decision itself is ADR-0007, which lives on `deploy/cloudflare`
because it is a decision the overlay makes, not one `main` makes.
