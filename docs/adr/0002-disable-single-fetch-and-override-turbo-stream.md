---
status: accepted
---

# Disable Single Fetch and override turbo-stream to v3

A clean `npm install` of Remix v2.17.5 reports 15 vulnerabilities, six of them
HIGH and present in the production dependency tree. All six trace to one
advisory: [GHSA-rxv8-25v2-qmq8](https://github.com/advisories/GHSA-rxv8-25v2-qmq8),
a denial of service in `turbo-stream`'s serializer, **reachable only when Single
Fetch is enabled**. It is patched in `turbo-stream@3.0.0`; Remix v2 pins `2.4.1`.

`npm audit fix` proposes downgrading to `@remix-run/node@2.8.1` — a version that
predates Single Fetch. That is a rollback, not a fix. Because Remix v2 is EOL
([ADR-0001](./0001-remix-v2-despite-end-of-life.md)), no forward patch will exist.

We close the path twice over:

1. **Single Fetch stays disabled.** The advisory scopes reachability to it, so the
   vulnerable code is never called. We lose nothing: Single Fetch's benefit is
   collapsing parallel loader requests across nested routes, and this app has one
   route with one loader.
2. **`turbo-stream` is overridden to `^3.2.0`,** so the vulnerable code is not
   installed at all. Supply-chain scanners see a clean tree, not an argument about
   reachability.

## Consequences

`turbo-stream@3` is API-incompatible with Remix v2's `single-fetch` module: v2's
`decode` accepted a string, v3 requires an `ArrayBuffer`. Enabling `v3_singleFetch`
with this override in place throws `ERR_INVALID_ARG_TYPE` on the first server
render.

This is deliberate and desirable. A future contributor who turns Single Fetch on —
because a blog post recommends it, or an agent suggests it — gets an immediate,
unmissable failure at development time, rather than silently reintroducing an
unpatchable DoS into production. The incompatibility is a guardrail.

`AGENTS.md` records this as an invariant.

Result: **0 production vulnerabilities.** Five remain, all dev-only (`vite` and
`esbuild` development-server issues, plus Remix's own build toolchain). None are
present in the built artifact. None are fixable without leaving Vite 6, which
Remix v2's peer dependencies forbid.
