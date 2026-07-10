# Revyse Tape

[![CI](https://github.com/kevinhortoneuropa/revyse-tape/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/kevinhortoneuropa/revyse-tape/actions/workflows/ci.yml)

A cryptocurrency dashboard built with Remix and React. Live Coinbase exchange
rates in USD and BTC, drag-to-reorder cards, filter by name or symbol, and a dark
mode that never flashes.

> _"The tape"_ is trader slang for the live price feed.

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

Node 20 or newer. No API key or `.env` is required — Coinbase's public endpoints
need no authentication.

```bash
npm run verify       # typecheck + lint + unit tests + build
npm run test:e2e     # Playwright, against the production build
```

---

## A note on "Remix"

The brief specifies Remix. As of June 2026 **Remix v2 is End of Life** — React
Router v8 shipped, Remix's ideas were merged into it as Framework Mode, and v2
receives no further security updates. (Remix v3 is a separate beta framework, not
the successor.)

This project builds on **Remix v2.17.5**, as asked. A take-home is not the venue
to relitigate the client's stated stack. But the cost is real and worth stating:

- Peer dependencies pin us to **React 18** and **Vite 6**.
- A clean `npm install` reports six HIGH production vulnerabilities, all from one
  unpatchable DoS in `turbo-stream`, reachable only through Single Fetch.

Both are addressed rather than ignored. Single Fetch stays disabled, `turbo-stream`
is overridden to a patched major, and **CI fails if the production dependency tree
has any known vulnerability**. The result is **zero production vulnerabilities** on
an EOL framework. Five dev-only advisories remain in Remix's own build toolchain
and cannot be fixed without leaving Vite 6.

Every v3 future flag is enabled, so the codebase already uses v3 routing
semantics: porting to React Router is an import-path change plus a codemod.

See [ADR-0001](./docs/adr/0001-remix-v2-despite-end-of-life.md) and
[ADR-0002](./docs/adr/0002-disable-single-fetch-and-override-turbo-stream.md).

---

## The idea the code is built on

> **The server owns a map of Quotes keyed by Symbol. The client owns a list of
> Symbols. No array index ever crosses that boundary.**

Two of this project's bugs are the same violation of that sentence, seen from
different angles:

**The polling bug.** `useRevalidator` re-runs the loader every 30 seconds and
returns quotes in the API's order. A grid rendered from `useLoaderData` therefore
resets the user's arrangement _on a timer_ — so it never appears in dev, only for
someone who left a tab open. Rendering is instead a join:
`ordering.flatMap(symbol => bySymbol.get(symbol) ?? [])`.

**The filtered-drag bug.** dnd-kit reports positions within the _visible_ list.
Filter to `e`, see `[ETH, ADA]`, drag ETH onto ADA — visible indices 0 and 1, but
positions 1 and 4 in the full ordering. Applying them silently reorders two cards
the user cannot see. So `reorder(ordering, active, over)` takes **symbols** and
never mentions a position; it is correct under any filter, including none.

Both disappear once ordering is a list of symbols. That is also why the drag is
easy to test: dnd-kit's entire contribution is two strings, and everything after
is a pure function.

---

## Reading the Coinbase API correctly

Three things about the API shaped the design, and all three were found by reading
real responses rather than the docs.

**Rates are inverted.** `/v2/exchange-rates?currency=USD` returns how many units
of an asset one dollar buys. `rates.DOGE = "13.66"` means about 7 cents, not
$13.66. Read it as a price and you ship a dashboard that looks entirely plausible
and is wrong by four orders of magnitude.

```
usd = 1 / rate
btc = btcRate / rate        # reduces to exactly 1 for BTC itself
```

**The rates map mixes fiat and crypto.** All 635 keys, so `AED` and `ALL` sit
beside `ADA` and `AAVE`. A naive `Object.keys(rates).slice(0, 10)` ships a
"cryptocurrency" dashboard featuring the Afghan afghani. Fiat is excluded
_structurally_, by joining against `/v2/currencies/crypto`, rather than by a
blocklist that would rot.

**A rate can be `"0"`.** A price is a rate's reciprocal, so a zero rate renders
`$∞`. `Rate` is a branded type whose only constructor rejects zero and non-finite
values, which makes the crash unrepresentable rather than merely tested.

`sort_index` is listing order, not popularity: the first twelve are the 2018
Coinbase listings — Augur, Orchid, no Solana. The brief names SOL explicitly, so
the twelve tracked symbols are a versioned product decision in
`app/lib/coinbase/assets.ts`. Identity (name, colour) still comes from the API.

---

## Decisions and trade-offs

| Decision                                                                                          | Why                                                                                                                                                                              | Trade-off                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Loader + `useRevalidator`**, no client fetch library                                            | The loader _is_ the data layer. Coinbase never reaches the browser.                                                                                                              | Reaching for TanStack Query here would mean two owners of the same data.                                                                                                                                                       |
| **No state library** ([ADR-0004](./docs/adr/0004-no-state-management-library.md))                 | Of five pieces of state, three aren't React state: filter is the URL, theme is a cookie, drag is dnd-kit's. What's left is a `string[]` and an enum.                             | If your codebase has Zustand, `useOrdering` becomes a `persist` slice and the pure `reorder`/`reconcile` move unchanged.                                                                                                       |
| **Filter in the URL**, ordering in localStorage                                                   | `?q=eth` describes _what you're looking at_ and should be shareable. Card order is a personal workspace preference. Nothing lives in two places, so there is no precedence rule. | You can't share your exact board layout.                                                                                                                                                                                       |
| **Theme in a cookie**, not localStorage                                                           | The root loader reads a cookie, so the server emits `<html class="dark">` in the first byte. **No flash.**                                                                       | Sent on every request. localStorage cannot do this — it's readable only after hydration.                                                                                                                                       |
| **`shouldRevalidate`** blocks search-only changes                                                 | `setSearchParams` is a navigation, and Remix re-runs loaders on navigation. Without it, every keystroke hits Coinbase.                                                           | Also why there is no debounce: there's no round trip to defer.                                                                                                                                                                 |
| **Server-side TTL cache** ([ADR-0003](./docs/adr/0003-cache-rates-against-coinbases-no-store.md)) | Fifty tabs polling every 30s would be fifty upstream requests for a byte-identical payload. Single-flight de-duplication collapses a cold-start stampede into one fetch.         | Deliberately overrides Coinbase's `cache-control: no-store` — which Coinbase does not honour either (`cf-cache-status: HIT`).                                                                                                  |
| **Semantic colour tokens**, zero `dark:` variants                                                 | Dark mode is a property of the theme, not of each component. It cannot be forgotten because there is nothing per-component to remember.                                          |                                                                                                                                                                                                                                |
| **Feature-first**, not atomic design ([ADR-0005](./docs/adr/0005-no-atomic-design.md))            | Twelve components across two features. Five atomic tiers would hold 2–3 files each, and every new component would trigger a classification debate with no correct answer.        | Maps onto atoms/molecules/organisms by renaming folders — nothing moves.                                                                                                                                                       |
| **`@dnd-kit` 6.3.1**                                                                              | Frozen since Dec 2024 — stable, not abandoned. Keyboard sensor and ARIA announcements for free.                                                                                  | The rewrite (`@dnd-kit/react`) is at 0.5.0; pre-1.0 in a submission is a smell. Native HTML5 DnD was never a candidate: **it does not fire on touch devices**, so a "responsive" dashboard would be un-reorderable on a phone. |

### On the authentication bonus

Skipped, deliberately. This dashboard has no protected resource — a login form
guarding public price data is theatre. The budget went to accessibility, error
boundaries, caching, and tests instead.

The write path is demonstrated anyway. The theme toggle posts to a Remix `action`,
Zod-validates the form body, sets an `httpOnly` cookie, and **works with
JavaScript disabled**: without JS the browser posts and the server redirects back;
with JS a `useFetcher` submits in the background and nothing navigates. Same
component, two behaviours — which is Remix's whole thesis, and it is covered by an
end-to-end test in a `javaScriptEnabled: false` browser context.

`returnTo` is constrained against open redirects and header injection.

---

## Type safety

`strict`, plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
`noPropertyAccessFromIndexSignature`, `verbatimModuleSyntax`. Each has caught a
real bug here.

Zod runs at the two trust boundaries — Coinbase, and anything user-writable (the
URL, the cookie, `localStorage`, a form body) — and nowhere else. Types are
derived with `z.infer`, never hand-written. `loader → useLoaderData` is _not_ a
boundary: that data is ours.

Money is nominally typed. `UsdPrice` and `BtcPrice` are both `number`, so swapping
them in a card's props is a silent, plausible bug that no test would catch and no
reviewer would see. Branding makes it a compile error. Branded types survive the
loader boundary intact — verified with `@ts-expect-error` probes asserting that
`assets[0].usd` is assignable to neither `number` nor `string`.

**`app/lib` imports no framework**, and that is enforced by an ESLint boundary
rather than by hope. It was verified by planting a violation.

---

## Testing

299 unit tests, 57 end-to-end (19 × desktop Chrome, an emulated Pixel 7, and
WebKit). `app/lib` is held at **100%** statements, branches, functions and lines;
the gate has caught three genuinely untested paths.

- **Unit** — Vitest. The pure core (`derive`, `format`, `reorder`, `reconcile`,
  schemas) exhaustively, including `rate = "0"`, denormal rates whose reciprocal
  overflows, and a corrupted `localStorage`.
- **Network** — MSW drives the real Coinbase client through 500 / 502 / 429 / 404,
  connection errors, malformed JSON, timeouts, a missing envelope, and a cache
  stampede.
- **Component** — Testing Library, including the theme toggle's optimistic flip
  and the filter's live-region announcements.
- **End-to-end** — Playwright, against the production build, with a mock upstream
  so prices are deterministic. The Coinbase fetch happens in the loader, so
  `page.route` cannot reach it.

Drag-and-drop is deliberately **not** simulated in jsdom: dnd-kit resolves drops
from `getBoundingClientRect`, and jsdom returns all zeros, so a simulated drag
silently no-ops and the test passes while asserting nothing. The seam
(`symbolsFromDragEnd`) and the logic (`reorder`) are pure and tested directly;
Playwright covers the real pointer, touch, and keyboard interactions.

`page.dragAndDrop()` does not work with dnd-kit either — see `e2e/helpers.ts` for
why, and for the helper that does.

### How the WebKit project earned its place

It was added because of a question that had nothing to do with browsers.

Auditing the code for a possible move to Cloudflare Workers turned up
`secure: process.env.NODE_ENV === 'production'` on the theme cookie — Remix's own
stacks ship exactly that line. On Workers there is no `process.env` at module
scope, so it would evaluate `false` and the cookie would quietly lose its `Secure`
attribute in production. Nothing would fail. It would just be wrong.

The obvious fix, `secure: true`, turned out to be wrong too: **Safari refuses to
return a `Secure` cookie set over `http://localhost`.** And since `remix-serve`
sets `NODE_ENV=production`, this repository had _already_ been serving one — so
**dark mode was broken in Safari, and had been all along.** A Chromium-only suite
could not see it.

Adding `{ name: 'webkit' }` failed three theme tests on the very first run. The fix
is `isSecureRequest(request)`: derive `Secure` from the transport (HTTPS URL, or
`X-Forwarded-Proto` from a TLS-terminating proxy), never from an environment
variable. The header is spoofable and trusted anyway, because it can only _add_
`Secure` — a forged value breaks nobody's session but the forger's.

WebKit then found a second bug: the filter tests asserted on the URL and read the
DOM, but `setSearchParams` changes the address bar before React commits the grid.
Chromium won that race; WebKit didn't. The tests now wait on the card count.

---

## Accessibility

- Drag-and-drop is fully **keyboard operable** (`Tab`, `Space`, arrows, `Space`),
  with every phase announced through an ARIA live region — including a drop on
  empty space, where silence would leave the user unsure whether the move took.
  The e2e tests _wait on those announcements_, so breaking them breaks the suite.
- The filter announces its match count politely.
- Prices are a `<dl>`: `dt`/`dd` expose term/definition, so a screen reader pairs
  each number with its unit.
- Focus rings appear for keyboard users only; `prefers-reduced-motion` is honoured.
- Skeletons are `aria-hidden` — the loading status belongs in one live region, not
  in a dozen grey blocks.

---

## Guidelines for AI

[`AGENTS.md`](./AGENTS.md) is the cross-tool standard file (`CLAUDE.md` imports it).
It records the invariants where the obvious change is wrong — reorder by symbol,
never render straight from `useLoaderData`, keep `app/lib` framework-free, never
write a `dark:` variant, pin every `Intl` locale — and names the lint rule or type
that enforces each. Anything mechanisable is a lint rule; the file explains why.

[`CONTEXT.md`](./CONTEXT.md) is the glossary. [`docs/adr/`](./docs/adr) records the
five decisions that were hard to reverse, surprising without context, and the
result of a real trade-off.

---

## Project layout

```
app/
├── root.tsx                  html shell; theme class from the cookie
├── routes/
│   ├── _index.tsx            loader, shouldRevalidate, composition
│   └── theme.tsx             action: the app's only mutation
├── features/
│   ├── dashboard/            AssetCard, AssetGrid, FilterInput, RefreshControl,
│   │                         useOrdering, useAutoRefresh, coinbase.server
│   └── theme/                ThemeToggle, theme.server
├── components/ui/            Button, Input, Card, Skeleton, cn
├── hooks/                    useInterval
└── lib/                      pure, framework-free, 100% covered
    ├── coinbase/             schemas, client, TTL cache, tracked assets
    ├── money/                derive, format, branded prices
    ├── ordering/             reorder, reconcile
    ├── filter/  url/  time/
    └── domain.ts             Asset, Quote, Symbol, Rate
e2e/                          Playwright specs, drag helpers, mock Coinbase
docs/adr/                     architecture decision records
```

---

## What I would do next

### Deploy to Cloudflare Workers

The app targets Node (`remix-serve`). Moving it to the edge is about 150 lines,
and the audit is already done:

| Blocker                                      | Why                                                                                                                                                                                                                                               |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `entry.server.tsx`                           | `renderToPipeableStream` + `node:stream` → `renderToReadableStream`. `nodejs_compat` does **not** help: workerd resolves `react-dom/server` to the edge build, which does not export the Node API. A package-exports problem, not a Node-API one. |
| `process.env` at module scope in `client.ts` | Undefined on Workers; `env` only exists per request. Becomes a constructor option, fed from `context.cloudflare.env`.                                                                                                                             |
| `@remix-run/node` in four files              | → `@remix-run/cloudflare`.                                                                                                                                                                                                                        |
| The `globalThis` TTL cache                   | Per-_isolate_ on Workers, so the hit rate collapses. `caches.default` is the right primitive — per-colo, GET-only, and it refuses to cache anything carrying `Set-Cookie`. Amends ADR-0003.                                                       |
| Playwright boots `remix-serve`               | Would boot `wrangler dev` (workerd) instead.                                                                                                                                                                                                      |

Nothing in `app/lib` moves except two lines, no component changes, and all 57 e2e
specs stay byte-identical.

Two things to know before starting. **The obvious `wrangler.jsonc` cannot run
SSR**: with no `main` entrypoint, no server code executes at all, and
`not_found_handling: "single-page-application"` serves `index.html` with a 200 for
every unmatched route. That config deploys a static SPA — which, since Coinbase
sends `access-control-allow-origin: *`, would genuinely _work_, and would delete
SSR, the cookie theme, the `/theme` action, the server cache and three ADRs along
with it. Second, `@remix-run/dev@2.17.5` peer-depends on `wrangler: ^3.28.2` while
wrangler is at 4.x, and npm tags 3.114.17 as `legacy`.

Deferred because this repository's value is a green pipeline and an intact
architecture, not a demo URL. The one bug the audit _did_ turn up — the theme
cookie's `Secure` flag — was fixed immediately rather than deferred with it.

### Everything else

- **Virtualise the grid** if the tracked list grew past ~100 cards.
- **A shared cache (Redis, or `caches.default` on Workers)** if this ran on more
  than one instance — which reopens ADR-0003, since `no-store` is aimed at
  _shared_ caches.
- **Server-persisted ordering** if the app ever gained accounts. That would give
  the authentication bonus an actual purpose, and change who owns Ordering.
- **Visual regression tests.** The token layer makes dark mode structurally hard
  to get wrong, but nothing currently proves the two palettes are legible.
