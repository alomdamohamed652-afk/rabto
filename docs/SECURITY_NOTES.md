# Security notes

## Authentication and activation rate limits

Login and activation throttles are stored in PostgreSQL, not process memory, so every application instance shares the same counters.

Login limits:
- Email + IP: 10 failed attempts in a fixed 15-minute window; only that pair is locked.
- IP-wide: 50 failed attempts in a fixed 15-minute window across email addresses.
- Account: 100 failed attempts in a fixed one-hour window, then progressive server-side delay (250 ms, increasing exponentially in 10-attempt bands, capped at 30 seconds). This is a soft delay, not a lock.
- Successful login clears only the matching email+IP counter. IP-wide and account counters remain.
- Successful login stores HMAC hashes for the account and IP pair. That pair bypasses account delay for 30 days; the pair/IP hard limits still apply.

Activation:
- 10 failed attempts per 15 minutes, keyed by authenticated user ID + client IP.
- If client IP is unavailable, a per-user unknown-IP key is used rather than trusting an unverified header.

Trusted proxy configuration:
- TRUSTED_PROXY_HOPS must be an integer from 1 to 20 matching the exact number of trusted reverse proxies between client and app. The selected address is the Nth X-Forwarded-For entry from the right.
- X-Real-IP, Forwarded, and other client-supplied address headers are not used.
- If TRUSTED_PROXY_HOPS is unset, empty, invalid, or the chain lacks enough valid IP entries, client IP is unknown. IP-specific login limits then cannot operate, but account limits still apply.

Misconfiguration risk: if TRUSTED_PROXY_HOPS is set incorrectly, or an untrusted proxy can append/replace forwarding entries, an attacker may influence the selected address. Verify the provider's actual proxy chain and that trusted proxies overwrite or safely append X-Forwarded-For. Never guess the hop count.

Remaining limitations:
- The migration must be applied before deploying code that queries these tables. No database migration is run by this commit.
- A database outage or missing migration fails closed with a server error.
- Requests already in flight when a threshold is reached may finish; atomic upserts prevent lost increments but cannot cancel concurrent password checks.
- The account delay is intentionally soft. It can still add latency for untrusted IPs targeting an account; a successful account/IP pair is exempt for 30 days.
- IP and account values are HMAC-hashed. Rotating SESSION_SECRET resets rate-limit identity and trusted-IP history.
- Expired counter and trusted-IP rows are not purged automatically in this change; add periodic retention cleanup when operational monitoring is available.
- No Redis or paid external service is required.
