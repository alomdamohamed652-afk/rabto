# RABTO ops runbook (portable, no host chosen)

Status: draft. No host, domain, mail account, storage account or paid service has been chosen or approved. Nothing here is verified against a live deployment.

## Required configuration (names only, no values in the repo)
- DATABASE_URL: a PostgreSQL database. Apply every file in `drizzle/` in order (or `drizzle-kit migrate`). Never edit applied migration journal entries; a new migration needs a journal `when` greater than the last entry.
- SESSION_SECRET: long random string. Rotating it signs everyone out.
- ANALYTICS_CONSUMER_SECRET: long random string for the scan-event consumer.
- TRUSTED_PROXY_HOPS: number of trusted reverse proxies in front of the app. Wrong values weaken IP rate limits, so set it from the real host setup.
- NODE_ENV=production for real runs. The development mail sink is refused in production.

## Mail (provider-agnostic, off by default)
Password reset and email verification stay "not active" until a transport is configured. A Brevo-shaped HTTPS transport exists in `src/lib/mailer.ts`:
- RABTO_MAIL_PROVIDER=brevo, RABTO_MAIL_API_KEY, RABTO_MAIL_FROM_EMAIL, optional RABTO_MAIL_FROM_NAME.
- Tested only against a local mock (`scripts/e2e/mail2.mjs`). It has never contacted a real provider.
- Deliverability with a free Gmail sender address is UNPROVEN for real users (the owner reports it worked in his own test; Brevo recommends an authenticated domain). Test real inbox and spam placement before relying on it.
- Use a RABTO-owned provider account. Never reuse another project's account or credentials.
- Provider limits (for example a daily send cap) must be checked against real volume.

## Not built, needs decisions
- Photo storage (candidate named by the owner, not final). Upload code is not wired.
- Credit metering, plan expiry and lapsed-plan behavior, payment or subscription terms.
- Contact destination for the enquiry page (enquiries are stored only, nothing is sent).
- Final identity asset (a CSS placeholder mark is in use).

## Operations to set up on whatever host is chosen
- Backups of PostgreSQL with a tested restore.
- Monitoring and alerting on 5xx rate, database connectivity and mail failures.
- Scan resolver isolation and caching: see `docs/RESOLVER.md`. The separate resolver service, edge cache and worker are not built.
- Run the migration step before starting a new version.

## Test commands
`npm run build`, then `RABTO_E2E=1 PGBIN=<postgres bin> bash scripts/e2e/run.sh <flow>.mjs` (see `scripts/e2e/`). `E2E_PROD=1` runs the production build.
