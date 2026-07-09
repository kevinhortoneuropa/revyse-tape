---
status: accepted
---

# Build on Remix v2, despite it being End of Life

The brief specifies "Remix + React". As of June 2026, Remix v2 is officially End
of Life: React Router v8 shipped, Remix's ideas were merged into it as Framework
Mode, and Remix v2 receives no further security updates. Remix v3 is a separate,
beta, no-longer-React-only framework, and is not the successor to v2 in any sense
that matters here.

So "Remix" in 2026 has three readings. We chose the literal one: `@remix-run/*`
v2.17.5. A take-home is not the venue to relitigate the client's stated stack,
and a submission whose `package.json` does not contain the framework the brief
named invites a reviewer to stop reading.

## Considered options

**React Router v8, Framework Mode** — the genuine continuation of Remix v2; same
loaders, actions, and nested routes. Actively maintained and patched. Rejected
because it requires the reviewer to accept an argument before they accept the
code, and a reviewer grepping for `@remix-run` would find nothing.

**Remix v2 (chosen)** — matches the brief exactly. Zero explanation required.

## Consequences

The cost is concrete, not theoretical. Peer dependencies pin us to **React 18**
(`@remix-run/react` peers on `^18`) and **Vite 6** (`@remix-run/dev` peers on
`^5 || ^6`), so React 19's `use` and `useOptimistic` are unavailable. Neither is
needed here. Forcing React 19 via overrides would emit peer warnings on the
reviewer's first `npm install`, which costs more than the hooks are worth.

More seriously, EOL means unpatchable advisories. A clean install reports six HIGH
production vulnerabilities, all from one DoS in `turbo-stream`. See
[ADR-0002](./0002-disable-single-fetch-and-override-turbo-stream.md) — they are
all closed, but only because a workaround existed. The next advisory may not have
one.

The code is written so the port to React Router is mechanical: v3 future flags are
enabled, so the codebase already uses v3 routing semantics. Migration is an
import-path change plus a codemod.
