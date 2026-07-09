---
status: accepted
---

# No state management library

There is no Redux, no Zustand, no Jotai, and no React Context in this app. Not
because state libraries are bad, but because when we enumerated the state, three
of the five pieces turned out not to be React state at all.

| State            | Owner                                      | Survives a 30s poll?          |
| ---------------- | ------------------------------------------ | ----------------------------- |
| Quotes           | Remix loader                               | replaced wholesale, by design |
| Ordering         | `localStorage`, via `useSyncExternalStore` | must                          |
| Filter           | URL search param                           | must                          |
| Theme            | cookie, read in the root loader            | must                          |
| Drag in progress | dnd-kit internal                           | n/a                           |

What remains for a store to hold is a `string[]` and an enum. A store would add a
dependency, a provider, and a second place for the truth to live, in exchange for
nothing.

## The distinction that actually mattered

Not "which library", but **who owns what**:

> The server owns a map of Quotes keyed by Symbol. The client owns a list of
> Symbols. No array index ever crosses the boundary.

Every non-obvious bug in this project is a violation of that sentence.
`useRevalidator` re-runs the loader every 30 seconds and returns quotes in the
API's order; if the grid rendered straight from `useLoaderData`, each poll would
silently reset the user's arrangement — on a timer, so nobody would notice until
they left a tab open. And dnd-kit reports positions within the _filtered_ list,
so applying them to the full ordering silently reorders cards the user cannot
see. Both disappear once ordering is a list of symbols and rendering is a join.

## Why each home

**Ordering → localStorage.** The brief asks for it, and a card arrangement is a
personal workspace preference rather than a description of the view. Read through
`useSyncExternalStore` with a `getServerSnapshot`, because
`useState(() => localStorage.getItem(...))` throws during SSR and desynchronises
hydration.

**Filter → URL.** `?q=eth` describes what you are looking at, so it should be
shareable and the back button should work. `shouldRevalidate` stops a keystroke
from refetching Coinbase, which is what makes this free.

**Theme → cookie.** A cookie is readable in the root loader, so the server emits
`<html class="dark">` in the first byte. localStorage is only readable after
hydration, which is why localStorage-based dark mode flashes.

## Consequences

Ordering is applied after hydration rather than during SSR, so a returning user
with a custom arrangement sees one frame in the API's order. Moving it to a
cookie would fix that, at the cost of sending it on every request and ignoring
the brief's explicit ask for localStorage.

If a team already runs Zustand, this maps onto it directly: `useOrdering` becomes
a store slice with the `persist` middleware, and the reducer logic — `reorder`
and `reconcile` — is already pure, already exhaustively tested, and moves
unchanged. The theme would still want a cookie regardless, because `persist`
rehydrates on the client and cannot prevent the flash.
