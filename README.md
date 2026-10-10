# ShopRadar

ShopRadar is a local product discovery and shopping platform that helps customers find nearby products, compare prices, and connect with trusted local sellers.

## Monorepo structure

- apps/web — responsive Next.js storefront
- apps/api — NestJS backend API
- apps/mobile — Expo React Native mobile app
- packages/database — Prisma schema and database utilities
- packages/auth — auth helpers and security utilities
- packages/config — shared configuration
- packages/types — shared TypeScript contracts
- packages/validation — validation helpers
- packages/api-client — shared API helpers for app integrations
- docs — architecture, security, payment, maps, and deployment documents
- scripts — automation helpers
- tests — unit, integration, and e2e tests

## Brand and design system

- Primary navy: #102A43
- Action orange: #FF7A00
- Success green: #16A34A
- Background: #F1F5F9
- White surfaces: #FFFFFF
- Text: #1E293B
- Borders: #E2E8F0
- Muted text: #64748B

Tagline: "Find it. Compare it. Get it."

## Required software

- Node.js 20+
- pnpm 9+
- PostgreSQL 15+
- Git
- Optional: Docker for local database containerization

## Install dependencies

```bash
pnpm install
```

## Environment setup

Copy the example environment file and update values for your local environment:

```bash
cp .env.example .env
```

Set `DATABASE_URL` to a working PostgreSQL database for account and catalogue features. Use a local development `JWT_SECRET`; production must use a unique random value of at least 32 characters. `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` is optional because the map has a no-key fallback.

Payments stay disabled until Safaricom credentials and a public HTTPS callback are available. Video uploads need persistent storage in production. See [production deployment](docs/deployment.md) for the launch checklist.

## Database setup

Start PostgreSQL locally or via Docker, then run:

```bash
pnpm --filter @shopradar/database prisma:generate
pnpm --filter @shopradar/database migrate:dev
```

The project does not currently include a seed script. Create an administrator after migration with the `admin:create` script described in the deployment guide.

## Run the apps

Web:

```bash
pnpm --dir apps/web dev
```

API:

```bash
pnpm --dir apps/api dev
```

Mobile:

```bash
pnpm --dir apps/mobile start
```

## Health checks

The backend includes a basic health endpoint:

- GET /api/health
- GET /api/ready

These are intended for local verification and deployment checks.

## Testing

```bash
pnpm test
```

## Important notes

- Do not commit real M-Pesa, Google Maps, or database credentials.
- Use sandbox credentials for local development.
- Payment and settlement flows are business-critical and require verified credentials before production use.
- This repository is still evolving through the project phases described in the master plan.

## Next planned phase

The next phase is database and auth hardening, followed by seller and shop ownership rules and product search foundation.
