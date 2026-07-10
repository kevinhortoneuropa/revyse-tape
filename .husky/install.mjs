// Git hooks are for humans. CI checks out, installs, and runs the gate directly;
// installing hooks there is wasted work, and in some build images — Cloudflare's
// among them — a failure in `prepare` fails the whole build.
//
// Husky honours HUSKY=0, not CI. This makes the guard a property of the
// repository rather than of a setting somebody has to remember.
if (process.env.CI) process.exit(0)

const { default: husky } = await import('husky')
husky()
