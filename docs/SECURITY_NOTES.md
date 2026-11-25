# Security notes

## Authentication and activation throttling

Login and customer activation currently use an in-memory fixed-window limiter:
- 10 failed attempts per normalized email address.
- The window is 15 minutes from the first failed attempt; subsequent failures do not extend it.
- A successful login or activation clears that email's failure bucket.
- The limiter is process-local and is not shared between multiple server replicas.

### Known account-denial risk

The limiter key intentionally uses the email address only because client-provided forwarding headers cannot be treated as a trustworthy client IP. This creates a denial-of-service risk: an attacker who knows a customer's email can deliberately submit failed login attempts and temporarily lock that customer's login for up to 15 minutes. Activation attempts use the same email-only keying model.

This behavior is a documented temporary trade-off, not a complete abuse-prevention design. Before public launch, replace it with a trusted deployment-provided client IP signal (only when the hosting platform's proxy trust is explicitly configured) combined with normalized email, or use a separate global abuse-control strategy that does not let an unauthenticated caller cheaply lock a specific account. Do not trust arbitrary X-Forwarded-For, X-Real-IP, or similar request headers.

The current 15-minute expiry must remain bounded: failed attempts do not roll the expiry forward, and a successful authentication clears the bucket.
