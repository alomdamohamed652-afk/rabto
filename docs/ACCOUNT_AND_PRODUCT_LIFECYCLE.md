# RABTO — Account, assignment, and code lifecycle

## Ownership model
- A customer signs in through a user account.
- A customer workspace is the tenant boundary for that customer products, batches, pages, orders, and related records.
- Every customer-owned record must be scoped by its workspace. Reads and writes must derive the workspace from the authenticated session and verified membership, never trust a client-supplied workspace ID by itself.
- Platform administrators are distinct from workspace owners/admins. A platform administrator can provision customer workspaces and assign products to them; workspace roles only govern access inside one customer workspace.

## Provisioning flow
1. A platform administrator creates the customer user and their workspace.
2. The user is added to workspace_members as owner.
3. The administrator creates product types/batches and generates product records and their QR/NFC channel codes.
4. Products are assigned to the customer workspace at creation/provisioning time. Their workspace_id is the ownership link; a product must never appear in two customer workspaces.
5. The customer dashboard lists only products belonging to workspaces in which the signed-in user has a valid membership.
6. The customer can manage allowed destinations, digital page content, and view their own product codes, balances, orders, and history. Platform-only actions remain unavailable to customer roles.

## Code security
- Resolver public codes are opaque random values and are not customer identifiers.
- Activation secrets are one-time credentials. Show the raw secret only during provisioning/secure handoff and persist only its SHA-256 hash.
- A scan alone does not activate or claim a product.
- Database unique constraints are the final guard against code collisions; generation workflows must retry on unique conflicts.
- Never expose activation-secret hashes in customer or admin dashboard responses.

## Implementation status
- The schema distinguishes platform administrator role from workspace roles.
- Product/code generation primitives create opaque public codes and one-time activation secrets.
- Customer provisioning UI/API, authentication/session enforcement, assignment screens, QR image/PDF rendering, and database-backed generation transactions are still pending. Do not expose provisioning as an unauthenticated endpoint.

## Batch provisioning implementation
- `provisionProductBatch` is a server-side, transaction-scoped primitive for platform admins.
- It verifies the platform admin role, workspace existence, and that the active product type belongs to that workspace.
- It creates the batch, products, independent QR/NFC public codes, hashed one-time activation secrets, initial destination/version records, zeroed per-channel credit accounts, and an audit event atomically.
- It returns raw activation secrets exactly once to the trusted provisioning caller. Never log or persist those raw values.
- It does not create an HTTP endpoint or replace session authentication. A future admin route must authenticate the session before calling it.
- Product codes remain inactive until the separate claim/activation flow completes; scans before activation resolve to unavailable.

## Customer dashboard read model
- `listWorkspaceProductsForMember` scopes the product listing through the signed-in user workspace membership and returns product metadata, channel public codes, activation status, and channel credit balances.
- It deliberately excludes activation-secret hashes and internal ledger details.
- The user ID must come from the authenticated server session. Do not expose this function through a route that trusts a browser-supplied user ID.
