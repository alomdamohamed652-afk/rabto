# RABTO — Product Baseline

Status: initial implementation baseline. This document records the agreed MVP boundaries before application code is introduced.

## Product
RABTO connects physical products to digital experiences through independently addressable NFC and QR links. Each channel has a stable resolver URL; its destination can be changed remotely.

## MVP capabilities
- Product types, batches, SKU/attributes, and code generation.
- Separate stable NFC and QR resolver links.
- Claim/activation using a one-time secret code stored as a hash; a scan alone does not prove ownership.
- Destination management with version history and per-channel credits.
- Append-only credit ledger and audit history.
- Simple customer workspace/dashboard and a small admin dashboard.
- Simple digital pages built from safe JSON blocks and published snapshots; never accept raw HTML or JavaScript.
- Basic store/order flow supporting available items and pre-orders; optional deposit; manual confirmation initially.
- QR export as PNG, SVG, and PDF.
- Basic aggregated analytics, processed asynchronously so analytics failure cannot block resolving.
- Arabic/English and RTL support, email verification, password reset, backups, and monitoring.

## Explicit boundaries for MVP
Do not build a full ERP, HR/payroll, advanced inventory/cost/profit accounting, complex manufacturing module, custom-order workflow, online payments, advanced analytics, Redis, or ClickHouse in this phase. Represent production progress with a simple production-stage field on an order item if needed.

## Core business rules
- NFC and QR are independent channels with separate balances.
- Changing a destination consumes the applicable channel credit. Editing page content does not.
- Restoring an old destination is still a new destination change.
- Resolver responses use HTTP 302, never 301.
- Credit and audit ledgers are append-only; resets or adjustments must retain a reason and history.
- PostgreSQL is the source of truth.
- Resolver operation must remain independent of analytics availability.
- Do not store raw IP addresses.

## Initial technical direction
Use a TypeScript modular monolith with PostgreSQL. Keep boundaries clear between resolver, application/API, background event processing, and admin/customer experiences. Avoid premature infrastructure complexity.

## Domain plan (not yet purchased or configured)
- `rabtolink.com/d/{code}` — resolver
- `rabtolink.com/p/{page}` — public digital pages
- `app.rabtolink.com` — customer application
- `admin.rabtolink.com` — administration

These are architectural targets only; DNS, domain ownership, hosting, and deployment are not confirmed.

## Delivery sequence
1. Confirm repository baseline and technical stack.
2. Add application skeleton, environment validation, linting, formatting, and test/build checks.
3. Implement database schema and migrations.
4. Implement resolver and its critical tests.
5. Implement product, batch, claim, link versioning, and credit ledger.
6. Add customer/admin surfaces, pages, orders, and basic analytics.
7. Harden security, observability, backups, and deployment.

## Asset policy
Only owner-approved brand assets belong in the repository. Do not create provisional or reconstructed logo SVGs. The repository owner will upload approved image assets.
