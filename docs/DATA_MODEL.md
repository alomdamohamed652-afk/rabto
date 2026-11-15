# Data model — initial draft

This is the first relational model for the RABTO MVP. It is a starting schema, not yet a deployed database migration.

## Main groups
- Identity and tenancy: users, workspaces, workspace_members.
- Product catalog and production: product_types, product_batches, products.
- Physical activation: product_codes, product_claims.
- Digital experiences: digital_pages, product_page_links.
- Link routing: link_destinations, link_versions.
- Per-channel entitlements: credit_accounts, credit_ledger.
- Orders: orders, order_items.
- Traceability: audit_logs.

## Invariants to enforce in service transactions and database migrations
1. NFC and QR are separate product codes and separate credit accounts.
2. A product can be claimed only once. The activation secret is stored as a hash, never plaintext.
3. Destination changes create a new link_versions row and consume one credit from the matching channel in the same database transaction.
4. Reverting to an earlier URL is still a new version and a new debit.
5. Editing a digital page does not consume link credits.
6. credit_ledger and audit_logs are append-only. Database triggers/permissions must prevent UPDATE and DELETE before production.
7. Resolver reads the current destination and responds with HTTP 302. Analytics must be asynchronous and must not be on the redirect critical path.
8. Digital page JSON must be validated against an allow-listed block schema; never render arbitrary HTML or JavaScript.
9. Do not store raw IP addresses.

## Notes
- Monetary values use integer minor units to avoid floating-point arithmetic.
- The initial model intentionally does not introduce ERP, payroll, advanced inventory, or complex manufacturing.
- Generate and review the first SQL migration before connecting any production data.
