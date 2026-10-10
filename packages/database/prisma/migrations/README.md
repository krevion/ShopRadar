# Prisma schema changes

The repository currently has no baseline migration. For a local development database, apply the current schema (including video uploads and M-Pesa subscription references) with:

```powershell
pnpm --filter @shopradar/database exec prisma db push
pnpm --filter @shopradar/database exec prisma generate
```

Before deploying to a persistent environment, create and review a migration from the complete schema rather than using `db push`.
# Database migrations

The initial migration creates the application tables and notification model. The seller-location migration adds shop coordinates after that baseline. The seller-address migration adds optional building name, room/unit number, and street fields.

For a new database, generate the Prisma client and apply committed migrations:

```bash
pnpm --filter @shopradar/database prisma:generate
pnpm --filter @shopradar/database migrate:deploy
```

Use `migrate dev` only for local schema development. Before adopting these migrations on an existing database, compare the deployed schema and migration history first; do not mark the baseline as applied until the existing tables match it.
