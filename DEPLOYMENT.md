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

`package-lock.json` is the only file that reliably conflicts, because both
branches regenerate it. Resolve it by taking the branch's lockfile and rerunning
`npm install`, never by hand-merging JSON:

```bash
git checkout --ours package-lock.json && npm install
```

If a change belongs on both branches, it belongs on `main`. Land it there and
merge down. The overlay should only ever grow if Cloudflare itself demands it.

## Why the demo is honest

The deployed app is `main`'s code. The runtime differs; the application does not.
`app/lib`, every component, every hook and all 69 end-to-end specs are identical,
and the suite runs against **workerd**, the runtime we deploy to — so the demo is
tested more strictly than `main` is, not less.
