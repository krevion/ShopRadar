# API

The NestJS API is mounted under `/api`. Production requests require PostgreSQL; database-backed routes return `503` when the database is unavailable. Admin routes accept only the short-lived token issued after the configured site-owner password is verified.

API requests are rate limited per client IP in each API process: standard reads are limited to 300/minute, writes to 60/minute, sign-ins and registration have stricter limits, video uploads are limited to 6 per 15 minutes, and page-view analytics to 120/minute. A `429` response includes `Retry-After`. Limits are process-local; production deployments with multiple API instances should also configure a shared rate limit at the hosting provider or WAF.

Only public catalog, category, shop, search, seller-profile, and video `GET` responses are cacheable. API-side in-memory caches have bounded capacity and short TTLs; authenticated and other API responses send `Cache-Control: private, no-store`.
The API and Next.js server compress responses when supported by the client.

## Public routes

- `GET /api/health` — process liveness.
- `GET /api/ready` — database readiness.
- `GET /api/products`, `GET /api/products/featured` — products from approved shops.
- `GET /api/categories` — categories present in listed inventory.
- `GET /api/shops`, `GET /api/shops/nearby?latitude=…&longitude=…&radiusKm=…` — approved shop locations.
- `GET /api/sellers`, `GET /api/sellers/:id` — approved seller profiles.
- `GET /api/search?q=…` — product, shop, and seller search. Product results include the approved seller profile ID and name so the storefront can link directly to the business profile.
- `POST /api/analytics/page-view` with `{ "path": "/shops" }` — records an anonymous page visit without storing a visitor ID or IP address. Admin pages are excluded.

## Signed-in routes

Send `Authorization: Bearer <accessToken>` for account-specific endpoints.

- `POST /api/auth/register`, `POST /api/auth/login` — customer or seller accounts. Public registration cannot create admins.
- `POST /api/sellers/profile`, `PATCH /api/sellers/location`, `GET /api/sellers/me`, `GET /api/sellers/analytics` — seller setup and dashboard data.
- `GET /api/sellers/jobs/mine`, `POST /api/sellers/jobs`, `PATCH /api/sellers/jobs/:id` — create and manage job listings for the signed-in seller. Only active listings on approved seller profiles are public.
- `POST /api/products`, `PATCH /api/products/:id`, `DELETE /api/products/:id` — manage products in the signed-in seller's shop.
- `GET /api/products/mine` — view the signed-in seller's inventory.
- `GET /api/notifications`, `PATCH /api/notifications/:id/read` — the signed-in user's notifications.
- `/api/videos` and `/api/sellers/:id/messages` — video publishing and seller interactions, subject to seller approval and subscription eligibility.

## Admin routes

`POST /api/admin/auth/login` with `{ "password": "…" }` verifies the single configured admin password and returns a 30-minute bearer token. Set `ADMIN_PASSWORD_HASH` on the API; never use the public account registration route for admin access. Admin-only routes include:

- `GET /api/admin/overview`, `GET /api/admin/sellers` — site growth, page views, customers, sellers, catalog, orders, payments, and interactions.
- `PATCH /api/admin/sellers/:id/status` with `{ "status": "APPROVED" | "REJECTED" | "PENDING" }`.
- `PATCH /api/admin/sellers/:id/complimentary-access` with `{ "enabled": true | false }` — grant or revoke complimentary seller subscription access. Profile approval remains a separate requirement for public seller visibility and video publishing.
- `GET /api/users`, `PATCH /api/admin/users/:id/active`.
- `GET /api/reports`.

## Deferred payments

`GET /api/payments/status` returns whether checkout is enabled. M-Pesa initiation and callback processing return `503` while `PAYMENTS_ENABLED=false`. Keep it disabled until real Safaricom credentials and a public HTTPS callback are configured. The generic client-supplied-amount initiation route is not exposed.
