# API

The NestJS API is mounted under `/api`. Production requests require PostgreSQL; database-backed routes return `503` when the database is unavailable. Admin routes require a signed-in, active account whose `ADMIN` role is confirmed from PostgreSQL.

## Public routes

- `GET /api/health` — process liveness.
- `GET /api/ready` — database readiness.
- `GET /api/products`, `GET /api/products/featured` — products from approved shops.
- `GET /api/categories` — categories present in listed inventory.
- `GET /api/shops`, `GET /api/shops/nearby?latitude=…&longitude=…&radiusKm=…` — approved shop locations.
- `GET /api/sellers`, `GET /api/sellers/:id` — approved seller profiles.
- `GET /api/search?q=…` — product, shop, and seller search.

## Signed-in routes

Send `Authorization: Bearer <accessToken>` for account-specific endpoints.

- `POST /api/auth/register`, `POST /api/auth/login` — customer or seller accounts. Public registration cannot create admins.
- `POST /api/sellers/profile`, `PATCH /api/sellers/location`, `GET /api/sellers/me`, `GET /api/sellers/analytics` — seller setup and dashboard data.
- `POST /api/products`, `PATCH /api/products/:id`, `DELETE /api/products/:id` — manage products in the signed-in seller's shop.
- `GET /api/products/mine` — view the signed-in seller's inventory.
- `GET /api/notifications`, `PATCH /api/notifications/:id/read` — the signed-in user's notifications.
- `/api/videos` and `/api/sellers/:id/messages` — video publishing and seller interactions, subject to seller approval and subscription eligibility.

## Admin routes

Create an admin with the `admin:create` script after migrations. Admin-only routes include:

- `GET /api/admin/overview`, `GET /api/admin/sellers`.
- `PATCH /api/admin/sellers/:id/status` with `{ "status": "APPROVED" | "REJECTED" | "PENDING" }`.
- `GET /api/users`, `PATCH /api/admin/users/:id/active`.
- `GET /api/reports`.

## Deferred payments

`GET /api/payments/status` returns whether checkout is enabled. M-Pesa initiation and callback processing return `503` while `PAYMENTS_ENABLED=false`. Keep it disabled until real Safaricom credentials and a public HTTPS callback are configured. The generic client-supplied-amount initiation route is not exposed.
