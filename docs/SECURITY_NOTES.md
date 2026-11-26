# Security notes

## Authentication and activation rate limits

Login and activation throttles are stored in PostgreSQL, not process memory, so every application instance shares the same counters.

Login limits:
- Email + client IP: 10 failed attempts in a fixed 15-minute window; only that pair is locked.
- IP-wide: 50 failed attempts in a fixed 15-minute window across different email addresses.
- Unknown client IP: 30 failed attempts per normalized email in a fixed 15-minute window. This bucket is used only when the application cannot establish a client IP because trusted proxy hops are unset/invalid or the forwarded chain is unusable. It does not apply to known-IP requests, including recently trusted account/IP pairs.
- Account: 100 failed attempts in a fixed one-hour window, followed by progressive database-backed delay (250 ms increasing exponentially in 10-attempt bands, capped at 30 seconds). The account row is locked with SELECT FOR UPDATE while a login attempt is evaluated, and locked_until is checked/updated in the same transaction. This prevents parallel requests from bypassing the delay. A recently trusted account/IP pair bypasses the account delay, but not its own email+IP or IP-wide hard limits.
- Successful login clears only the matching email+IP bucket, or the email+unknown-IP bucket when the source IP is unknown. IP-wide and account counters remain.
- Successful login stores HMAC hashes for the account and IP pair. That pair is trusted for 30 days.

Activation:
- 10 failed attempts per 15 minutes, keyed by authenticated user ID + client IP.
- If client IP is unavailable, a per-user unknown-IP key is used rather than trusting an unverified header.

## Deployment requirement: configure trusted proxy hops before launch

**Before public launch, set TRUSTED_PROXY_HOPS for the actual deployment platform and verify it with real HTTP requests through that platform's complete proxy chain. Do not leave this as an assumed default and do not guess the number.**

- TRUSTED_PROXY_HOPS must be an integer from 1 to 20 matching the exact number of trusted reverse proxies between client and app. The selected address is the Nth X-Forwarded-For entry from the right.
- X-Real-IP, Forwarded, and other client-supplied address headers are not used.
- If TRUSTED_PROXY_HOPS is unset/invalid, or the chain lacks enough valid IP entries, client IP is unknown. Per-IP login protection is unavailable; the email+unknown-IP 30/15m bucket and account throttle remain active.
- If TRUSTED_PROXY_HOPS is set too low/high, or an untrusted proxy can append/replace forwarding entries, the selected IP may be attacker-controlled. A wrong value can either disable effective IP protection or permit IP spoofing, depending on the platform's proxy behavior. Verify proxy behavior and spoof resistance before enabling it.

Remaining limitations:
- The migration creating login_attempts and trusted_login_ips must be applied before deploying code that queries them.
- A database outage or missing migration fails closed with a server error.
- Requests for the same account are serialized while password verification runs. This prevents concurrent attempts from racing past the account delay, but increases lock contention for a targeted account.
- Account delay is a soft throttle implemented as a temporary database lock, not a permanent account ban. Trusted account/IP pairs are exempt for 30 days.
- IP and account values are HMAC-hashed. Rotating SESSION_SECRET resets rate-limit identity and trusted-IP history.
- Expired counter and trusted-IP rows are not purged automatically; add periodic retention cleanup when operational monitoring is available.
- No Redis or paid external service is required.
