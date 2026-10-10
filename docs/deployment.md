# Production deployment

ShopRadar is a pnpm monorepo with a Next.js web app, a NestJS API, and a PostgreSQL database. The hosting provider is not selected yet, so this guide uses standard Node.js and PostgreSQL services.

## Services to provision

- A Node.js 20 or newer web service for `apps/web`.
- A Node.js 20 or newer API service for `apps/api`.
- A managed PostgreSQL 15 or newer database with network access from the API.
- Persistent storage mounted for API video uploads. The API stores uploaded videos on disk; an ephemeral filesystem will lose them when the service restarts or deploys.

The API and web app can use separate public domains. Keep the API on HTTPS and allow only the web app's HTTPS origin in CORS.

## Production environment

Set these values in the hosting provider's secret/environment settings. Do not commit production secrets to `.env` or `.env.example`.

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | Set to `production`. |
| `DATABASE_URL` | PostgreSQL connection URL for the managed database. |
| `JWT_SECRET` | Unique random secret with at least 32 characters. |
| `WEB_ORIGIN` | Exact HTTPS web origin; multiple origins may be comma-separated. |
| `API_PUBLIC_URL` | Public HTTPS API origin used in video links. |
| `NEXT_PUBLIC_API_URL` | Public HTTPS API origin, set when building the web app. |
| `UPLOADS_DIR` | Absolute path to the persistent video volume mount. |
| `PORT` | Set automatically by many hosts; otherwise set the API listening port. |
| `PAYMENTS_ENABLED` | Keep `false` until the Safaricom production credentials and callback details are available. |

The API rejects production startup when the database URL, strong JWT secret, HTTPS web origin, HTTPS API origin, or absolute persistent upload path is missing or invalid. It also fails startup if PostgreSQL cannot be reached. The web build rejects a missing or non-HTTPS `NEXT_PUBLIC_API_URL`. `/api/health` is a liveness endpoint; `/api/ready` checks PostgreSQL and returns `503` until the API can serve database-backed requests.

## Build and release

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm --filter @shopradar/database prisma:generate
pnpm build
pnpm --filter @shopradar/database migrate:deploy
```

Run database migrations once as a release step before routing traffic to a new API version. Do not run `migrate dev` against production.

Start the API with the package's `start` script and the web app with its `start` script. Set `NEXT_PUBLIC_API_URL` during the web build because Next.js embeds public environment variables in the client bundle.

## First admin account

After the database is migrated and the API package has been built, create the initial admin through the API package's `admin:create` script. Provide `ADMIN_EMAIL` and `ADMIN_PASSWORD` as temporary environment secrets for that command. Use a unique password of 12–72 characters. The script stores only its bcrypt hash, and it does not print the password.

Public registration cannot create administrator accounts. Admin API routes verify the account role and active status against PostgreSQL on each request.

## External services and current limits

- Seller and catalog records, messages, notifications, reports, and video metadata use PostgreSQL.
- Video files require a persistent volume. Object storage support is not wired into the API yet.
- M-Pesa initiation and callbacks remain disabled. Do not set `PAYMENTS_ENABLED=true` until real Safaricom credentials and a public callback URL are ready.
- Buyer order and checkout endpoints are not implemented. The current launch scope supports product discovery, approved seller listings, seller contact, and maps; add an order flow if shoppers need to purchase in-app.
- Email verification and password recovery are not implemented; configure those before relying on email ownership for production account recovery.
- Configure a host-level rate limit for `/api/auth/login` and `/api/auth/register` when selecting the hosting provider. The hosting provider is not selected, so no provider-specific deployment has been created.
