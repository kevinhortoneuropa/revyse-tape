---
status: accepted
---

# Feature-first structure, not atomic design

Components are organised by feature, with a thin layer of shared primitives.
There are no `atoms/`, `molecules/` or `organisms/` directories.

```
app/
├── root.tsx                    theme class, ErrorBoundary
├── routes/                     loader, action, composition
├── features/
│   ├── dashboard/              components/ + hooks/ + coinbase.server.ts
│   └── theme/                  components/ + theme.server.ts
├── components/ui/              Button, Input, Card, Skeleton
├── hooks/                      useInterval
└── lib/                        pure: coinbase, money, ordering, filter, url, time
```

## Why

This app has **twelve components across two features**, plus two routes. Atomic
design earns its keep when a design system is consumed by many teams and needs a
shared vocabulary to negotiate reuse. Its cost is a permanent classification tax:
every new component triggers a "is `RefreshControl` a molecule or an organism?"
debate, and that debate has no correct answer, so it gets settled by whoever cares
least. At this size you pay the tax and receive nothing. Remix routes are already
pages, so that tier is redundant before it is written.

The brief grades "good decision making around organization". Importing a
heavyweight methodology into a small app is not good decision making. Right-sizing
is.

## The rule that does real work

`app/lib` is the pure core — money derivation, ordering, Coinbase parsing — and it
imports no framework. That is what lets it be tested without a DOM, a network, or
a renderer, and it is held at 100% coverage.

A convention a linter checks is an architecture; a convention in a README is a
wish. So it is an ESLint `no-restricted-imports` boundary, verified by planting a
violation: importing `react` or `@remix-run/node` into `app/lib` fails the build
with a message naming the fix. Dependencies point inward.

## If your codebase uses atomic design

The mapping is free, which is rather the point:

| Here                      | Atomic design         |
| ------------------------- | --------------------- |
| `components/ui/*`         | atoms                 |
| `features/*/components/*` | molecules + organisms |
| `routes/*`                | pages                 |

Nothing moves. Only folder names change. The same is true in reverse: if this app
grew a second and third feature that shared card layouts, promoting those into a
component library would be a rename, not a refactor.
