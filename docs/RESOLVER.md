# Resolver — first implementation

## Endpoint
`GET /d/{code}`

The resolver:
1. Validates the public code format before querying the database.
2. Looks up the code, its activation timestamp, product status, and current destination.
3. Returns HTTP 302 with no-store headers for a valid activated code.
4. Returns 404 for unknown, unactivated, or archived product codes.
5. Returns 410 when a stored destination is malformed or uses a non-HTTP(S) scheme.
6. Returns 503 on database/runtime failure.

## Important behavior
- Uses HTTP 302 only; destinations must remain changeable.
- Does not cache redirect responses.
- Allows only `http:` and `https:` destinations.
- Does not write analytics or wait for an analytics service. This keeps the redirect path independent of analytics.
- Does not infer ownership from a scan.

## Not yet production-complete
- Database migrations have not yet been generated or applied.
- There is no local PostgreSQL instance connected and no runtime integration test has been executed.
- Asynchronous scan-event ingestion/worker is intentionally not wired yet; add an outbox/queue and worker separately without putting it on the redirect critical path.
- Rate limiting, abuse monitoring, and operational dashboards remain to be added before public launch.
