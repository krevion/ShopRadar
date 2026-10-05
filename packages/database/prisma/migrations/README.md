# Prisma schema changes

The repository currently has no baseline migration. For a local development database, apply the current schema (including video uploads and M-Pesa subscription references) with:

```powershell
pnpm --filter @shopradar/database exec prisma db push
pnpm --filter @shopradar/database exec prisma generate
```

Before deploying to a persistent environment, create and review a migration from the complete schema rather than using `db push`.