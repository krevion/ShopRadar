# Database migrations

The initial migration creates the application tables and notification model. The seller-location migration adds shop coordinates. The seller-address migration adds optional building name, room/unit number, and street fields. The site-analytics migration adds route and timestamp page views without collecting visitor IDs or IP addresses.

For a new database, generate the Prisma client and apply committed migrations:

```bash
pnpm --filter @shopradar/database prisma:generate
pnpm --filter @shopradar/database migrate:deploy
```

Use `migrate dev` only for local schema development. Before adopting these migrations on an existing database, compare the deployed schema and migration history first; do not mark the baseline as applied until the existing tables match it.
