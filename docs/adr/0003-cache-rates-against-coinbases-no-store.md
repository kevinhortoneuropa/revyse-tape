---
status: accepted
---

# Cache exchange rates server-side, overriding Coinbase's `no-store`

`GET /v2/exchange-rates?currency=USD` responds with `cache-control: no-store`. We
cache it anyway, in memory, for 10 seconds.

The loader re-runs on every revalidation, and every open browser polls on its own
30-second timer. Without a cache, fifty tabs mean fifty upstream requests every
thirty seconds for a byte-identical payload. Coinbase's public endpoints allow
roughly 10k requests per hour per IP; a single moderately-trafficked deployment
would exhaust that and the dashboard would start failing for everyone.

Overriding an upstream cache directive deserves to be a conscious act, so it is
recorded here rather than buried in a client.

## Why this is safe

The directive is advisory to _shared caches_, and Coinbase does not honour it
themselves: the response arrives with `cf-cache-status: HIT`, so Cloudflare is
already serving a cached copy at the edge. A 10-second TTL is well inside the
window in which these prices are meaningfully current — the dashboard's own
refresh interval is 30 seconds, three times longer.

The cache is per-process and in-memory. It holds no user data, so there is no
cross-tenant leakage: every visitor sees the same public prices.

## Consequences

On a serverless platform each instance keeps its own cache, so the effective hit
rate falls as instances scale out. That is acceptable — the goal is bounding
upstream load, not maximising hit rate. A shared cache (Redis) would be the next
step, and would need this decision revisited because it is genuinely a _shared_
cache, which is what `no-store` addresses.

The cache also performs single-flight de-duplication: concurrent callers arriving
during a miss await one in-flight promise rather than each starting a request.
This matters more than the TTL on a cold start, where twenty simultaneous
requests would otherwise produce twenty upstream fetches. Failures are never
cached, so an outage does not persist past its own recovery.
