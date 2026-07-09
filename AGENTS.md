# AGENTS.md

Guidance for AI agents and humans working in this repository.

This file does not describe the stack — you can read `package.json`. It records
the **invariants where the obvious, locally-correct change is wrong**, and what
enforces each one. Prefer enforcement over documentation: if a rule can be a lint
rule or a type, it is one, and this file explains why.

Read [`CONTEXT.md`](./CONTEXT.md) for the vocabulary. Read [`docs/adr/`](./docs/adr)
for why the architecture is shaped this way.

---

## Commands

|                                                 |                                                                 |
| ----------------------------------------------- | --------------------------------------------------------------- |
| `npm run dev`                                   | dev server                                                      |
| `npm run verify`                                | typecheck + lint + unit tests + build — run this before pushing |
| `npm run test` / `test:watch` / `test:coverage` | Vitest                                                          |
| `npm run test:e2e`                              | Playwright (builds and boots the app plus a mock Coinbase)      |

`pre-commit` runs lint-staged. `pre-push` runs `typecheck`, `lint`, `test`, `build`.
The build is in there because it is the only check that exercises Remix's route
discovery — a colocated test file under `app/routes/` typechecks, lints and tests
clean, then fails to build.

---

## The one sentence this codebase is built on

> **The server owns a map of Quotes keyed by Symbol. The client owns a list of
> Symbols. No array index ever crosses that boundary.**

Every subtle bug this project has had was a violation of it.

---

## Invariants

### Reorder by symbol, never by index

`onDragEnd` gives you `active.id` and `over.id`, which are symbols. Pass them to
`reorder(ordering, active, over)`.

Cards are dragged while a filter is applied, so the indices dnd-kit sees are
positions in the **visible** list. Filter to `e`, see `[ETH, ADA]`, drag ETH onto
ADA — visible indices 0 and 1. In the full ordering those live at 1 and 4.
Applying visible indices to the full list silently reorders two cards the user
cannot see, so nobody ever notices.

→ **Enforced:** `reorder` accepts `CurrencySymbol`, not `number`. `symbolsFromDragEnd`
is the only bridge from dnd-kit, and it is a pure function with its own tests.

### Never render the grid straight from `useLoaderData`

The loader returns quotes in the API's order. `useRevalidator` re-runs it every
30 seconds. Rendering `assets.map(...)` resets the user's arrangement on a timer
— invisible in dev, and only reported by users who leave a tab open.

Render the **join**: `ordering.flatMap(symbol => bySymbol.get(symbol) ?? [])`.

→ **Enforced:** `noUncheckedIndexedAccess` makes every lookup `Quote | undefined`,
so the missing-asset case cannot be forgotten.

### `app/lib` imports no framework

It is the pure core: money, ordering, Coinbase parsing, URL parsing. It is tested
without a DOM, a network, or a renderer, and held at **100% coverage**. Importing
`useState` into a formatting module always looks harmless.

→ **Enforced:** ESLint `no-restricted-imports` on `app/lib/**`. Move it to a hook
in `app/features/*/hooks/` or `app/hooks/` instead.

### Zod runs at trust boundaries, and only there

There are exactly two: **Coinbase → our server**, and **the URL / localStorage /
form body → our app**. Parse there, derive types with `z.infer`, never hand-write
the shape.

The boundary that does _not_ exist is `loader → useLoaderData`. That data is ours;
we serialised it. Re-validating it client-side double-parses and drags Zod into
the browser bundle for no added safety.

Parsing anything user-writable must be **total** — a hand-edited cookie, a pasted
link, or a corrupted localStorage value must never throw. Use `.catch()`.

### Failure is two-tier, never all-or-nothing

A malformed **envelope** throws: rendering an empty dashboard would dress an
outage up as a success. A malformed **element** among 408 is dropped and counted:
one bad record must not take the page down. Fewer than `MINIMUM_ASSETS` survivors
throws, because that is a signal, not a display problem.

### Prices are branded. Do not cast them

`UsdPrice` and `BtcPrice` are both `number`. Swapping them in a card's props is a
silent, plausible, invisible bug. Construct them through `toUsdPrice` / `toBtcPrice`,
which reject zero and non-finite values — that is what makes `$∞` from a delisted
asset's `"0"` rate unrepresentable rather than merely untested.

→ **Enforced:** ESLint `consistent-type-assertions` with `objectLiteralTypeAssertions: never`.

### Never write a `dark:` variant

Add a semantic token to `app.css` instead. Colours are declared once as `--l-*` /
`--d-*` and resolved into semantic names; components write `bg-surface` and know
nothing about colour mode. A `dark:` variant is a colour mode leaking into a
component, and the next component will forget it.

### Pin the locale on every `Intl` formatter

Unset, `Intl.NumberFormat` resolves to the **server's** locale during SSR and the
**browser's** during hydration. `63.213,17` versus `63,213.17` is a hydration
mismatch on the price text. Invisible in dev on a US machine.

### Do not enable `v3_singleFetch`

It is the reachability condition for [GHSA-rxv8-25v2-qmq8][ghsa], an unpatchable
DoS in Remix v2's `turbo-stream`. `turbo-stream` is overridden to v3, which is
API-incompatible with Remix's single-fetch module, so turning the flag on fails
loudly on the first server render. That is deliberate. See
[ADR-0002](./docs/adr/0002-disable-single-fetch-and-override-turbo-stream.md).

→ **Enforced:** CI fails if the production dependency tree has any known vulnerability.

[ghsa]: https://github.com/advisories/GHSA-rxv8-25v2-qmq8

### `json()` is deprecated — return a bare object

Its deprecation notice points at Single Fetch, which the previous invariant
forbids. A bare object from a loader carries full type information through
`useLoaderData<typeof loader>()`, brands included.

`throw new Response(...)` from a loader is fine, and is how you hand a status
code to an `ErrorBoundary`.

### Do not send Ordering to the server

It is client state, persisted to `localStorage` and reconciled against whatever
the server sent. A `useSubmit` on drag looks like persistence and is a
regression. See [ADR-0004](./docs/adr/0004-no-state-management-library.md).

---

## Testing

- **`app/lib` is held at 100%** statements, branches, functions and lines. The
  gate is real; it has found three genuinely untested paths so far.
- **Do not simulate a pointer drag in jsdom.** dnd-kit resolves drops from
  `getBoundingClientRect`, and jsdom returns all zeros — so no card is ever over
  another, and the drag silently no-ops. Such a test passes while asserting
  nothing. Test `symbolsFromDragEnd` and `reorder` instead; Playwright covers the
  real interaction.
- **Do not use `page.dragAndDrop()`.** Use `dragCard()` from `e2e/helpers.ts`,
  which crosses dnd-kit's activation constraint and moves in steps.
- **Never `waitForTimeout`.** Wait on a real signal: `aria-pressed`, a live-region
  announcement, or a change in the persisted ordering.
- MSW covers the Coinbase client at the network layer. Playwright uses a mock
  upstream (`e2e/mock-coinbase.mjs`) because the fetch happens in the loader, on
  the server, where `page.route` cannot reach it.

## Style

- Conventional Commits, with scopes from the enum in `commitlint.config.js`.
- Comments explain **why**, never what. If a comment restates the code, delete it.
- Prefer a total lookup map over modular arithmetic on an index: there is no
  bounds check to get wrong, and no unreachable fallback to pretend to test.
