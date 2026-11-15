# Database

PostgreSQL is the primary store for accounts, seller profiles, shops, products, job listings, orders, payments, videos, messages, notifications, and anonymous page-view totals. Seller profiles support both shops and individual service providers; service profiles store a category, service area, and public contact phone. Businesses can manage job listings on their profile; only active listings from approved seller profiles are shown publicly. Admins can grant individual sellers complimentary subscription access; seller-profile approval remains separate. Prisma schema source lives at `packages/database/prisma/schema.prisma`; committed SQL migrations live next to it.

## Local development

Set a working PostgreSQL `DATABASE_URL` in the root `.env`, then run:

```bash
pnpm --filter @shopradar/database prisma:generate
pnpm --filter @shopradar/database migrate:dev
```

Public search uses PostgreSQL `pg_trgm` GIN indexes for product, shop, and seller text fields, plus an active-product ordering index. These indexes are managed by Prisma and created by the search-index migration; apply migrations before deploying the updated API.

The API uses one shared Prisma client. It exposes `/api/health` for process liveness and `/api/ready` for a live database check. Local API startup can continue without PostgreSQL for development, but account and catalog routes report that the database is unavailable instead of inventing in-memory records.

## Production

Set `DATABASE_URL` to the provider's managed PostgreSQL connection URL, generate the client during the build, and apply committed migrations with:

```bash
pnpm --filter @shopradar/database migrate:deploy
```

Run migrations once per release, before the new API version receives traffic. The initial migration is for a fresh database. For an existing database, compare its schema and `_prisma_migrations` history before adopting the baseline; never mark it applied until the tables and columns have been verified.
