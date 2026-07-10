# Deploying — the `deploy/cloudflare` overlay branch

`main` targets Node, depends on no vendor, and deploys nowhere. This branch is a
thin overlay that runs the same app as a **Cloudflare Worker**, so there is a live
demo without `main` carrying a `server.ts`, a `wrangler.jsonc`, or an opinion
about anybody's infrastructure. See
[ADR-0006](./docs/adr/0006-deployment-lives-on-an-overlay-branch.md) for why, and
[ADR-0007](./docs/adr/0007-server-render-on-cloudflare-workers.md) for how.

## Running it

```bash
npm install
npm run dev        # vite dev; wrangler's platform proxy provides context.cloudflare
npm start          # build, then serve the real Worker on workerd via `wrangler dev`
npm run deploy     # build, then `wrangler deploy`  (needs `npx wrangler login`)
npm run test:e2e   # 69 specs against workerd, not against Node
```

## The overlay contract

The branch exists to be **boring to merge**. Everything that could live on `main`
does. What remains is a deliberately short list.

**Additive — cannot conflict, ever:**

|                                       |                                                                   |
| ------------------------------------- | ----------------------------------------------------------------- |
| `server.ts`                           | the Worker's `fetch` handler                                      |
| `wrangler.jsonc`                      | `main` + `assets`, and comments on everything deliberately absent |
| `load-context.ts`                     | types `context.cloudflare`                                        |
| `DEPLOYMENT.md`, `docs/adr/0007-*.md` | this                                                              |

**Replaced — one file, on purpose:**

|                        |                                                                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `app/env.server.ts`    | the seam. `main` returns `process.env`; here, `context.cloudflare.env`. Every caller is byte-identical.                    |
| `app/entry.server.tsx` | Web Streams. `renderToPipeableStream` does not exist on workerd, and `nodejs_compat` cannot fix a package-exports problem. |

**Config — small, and in files `main` rarely edits:**

`package.json` (adapter swap, `wrangler`, one scoped `overrides` entry),
`vite.config.ts` (the dev proxy plus `workerd` resolve conditions),
`tsconfig.json` (`types`), `playwright.config.ts` (boots `wrangler dev`),
`eslint.config.js` (one rule), `commitlint.config.js` (one scope), `.gitignore`
(`.dev.vars`).

**Four one-line import swaps:** `@remix-run/node` → `@remix-run/cloudflare` in
`root.tsx`, `routes/_index.tsx`, `routes/theme.tsx`, `features/theme/theme.server.ts`.

**Nothing in `app/lib`. Nothing in `e2e/`. No component. No hook.**
`git diff main..deploy/cloudflare -- app/lib e2e/` is empty, and that is a
property worth keeping.

## Keeping it in sync

Merges go **one way only**: `main` → `deploy/cloudflare`. Never the reverse.

```bash
git switch deploy/cloudflare
git merge main
npm ci && npm run verify && npm run test:e2e
```

Two files conflict, and only two:

**`package.json`** — both branches edit the `scripts` block, and git cannot know
that `deploy` is ours while `prepare` is theirs. Resolve by hand; it is always
three lines. (The first `main` → overlay merge conflicted here, and nowhere else.)

**`package-lock.json`** — when `main` changes a dependency. Never hand-merge
JSON. Take the branch's lockfile and let npm reconcile it:

```bash
git checkout --ours package-lock.json && npm install
```

If a change belongs on both branches, it belongs on `main`. Land it there and
merge down. The overlay should only ever grow if Cloudflare itself demands it.

## Publishing: Cloudflare Workers Builds

No credential ever enters this repository. Cloudflare's GitHub App reads it, builds
this branch, and deploys. Install the App scoped to **only this repository**.

### One-time setup

1. **Workers & Pages → Create application → Import a repository.** The flow
   creates the Worker; it does not need to exist first.
2. **The Worker must be named `revyse-tape`** — Workers Builds fails the build
   unless the dashboard name matches `name` in `wrangler.jsonc`.
3. **Settings → Build → Branch control → production branch: `deploy/cloudflare`.**
   It defaults to the repository's default branch, which is `main`.
4. **Turn OFF "Builds for non-production branches."** This one matters. `main` has
   no `wrangler.jsonc`, so a build triggered by a push to `main` fails and paints
   the repo red. Left on, every commit to `main` produces a failed Cloudflare build
   for a Worker that `main` never claimed to be.
5. **Build command: `npm run build`.** Deploy command: leave the default,
   `npx wrangler deploy`. Root directory: repository root.

Nothing else. No build variables, no secrets, no runtime `vars` — the app needs no
API key, and `COINBASE_BASE_URL` / `COINBASE_CACHE_TTL_MS` exist only so the
end-to-end suite can point at a mock upstream.

### What the repository already does for you

- **`.node-version`** pins Node. Workers Builds reads `.node-version` / `.nvmrc` /
  a `NODE_VERSION` variable — it does **not** read `engines.node`. Without the
  file you silently get their default.
- **`.husky/install.mjs`** exits early when `CI` is set. `npm ci` runs `prepare`,
  which ran `husky`; husky honours `HUSKY=0`, not `CI`, so the guard lives in the
  repo rather than in a dashboard field somebody has to remember.
- **No `build.command` in `wrangler.jsonc`.** `wrangler deploy` would run it, and
  Workers Builds runs its own build command first — you would build twice.
- **`build/client` is gitignored, and that is fine.** Workers Builds clones, runs
  the build command, _then_ deploys, so the assets exist by the time
  `wrangler deploy` reads `assets.directory`. If the build command is ever blank,
  the deploy fails for a confusing reason: the directory does not exist.

The demo lands at `revyse-tape.<your-subdomain>.workers.dev`. Set the subdomain
under Workers & Pages if the account has never had one.

Free plan: 3,000 build minutes a month, one concurrent build, 20 minutes maximum
per build. This build takes well under one.

### Deploying by hand instead

```bash
npx wrangler login     # once, interactive
npm run deploy         # build, then wrangler deploy
```

## Why the demo is honest

The deployed app is `main`'s code. The runtime differs; the application does not.
`app/lib`, every component, every hook and all 69 end-to-end specs are identical,
and the suite runs against **workerd**, the runtime we deploy to — so the demo is
tested more strictly than `main` is, not less.
