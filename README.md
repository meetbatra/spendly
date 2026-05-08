# Spendly

Next.js 16 + Prisma 7 starter for an AI-powered spend audit app.

## Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy env template and fill values:
   ```bash
   cp .env.local.example .env
   ```
3. Start dev server:
   ```bash
   npm run dev
   ```

## Prisma 7 Configuration

- `prisma/schema.prisma` keeps only `provider = "postgresql"` in `datasource`.
- Prisma client generator uses `provider = "prisma-client"` with output at `src/generated/prisma`.
- `prisma.config.ts` controls CLI connection URLs:
  - `DIRECT_URL` (preferred for CLI and migrations)
  - fallback to `DATABASE_URL` if `DIRECT_URL` is not set
- Runtime Prisma client uses `DATABASE_URL` from `src/lib/prisma.ts`.
- `postinstall` runs `prisma generate` so Vercel builds always regenerate client.

## Environment Variables

Use pooled + direct URLs for serverless Postgres (Supabase/Neon style):

```env
DATABASE_URL="postgres://...pooler...:6543/postgres?pgbouncer=true"
DIRECT_URL="postgres://...:5432/postgres"
SHADOW_DATABASE_URL="postgres://.../shadow_db" # optional
```

## Deployment (Vercel)

- Build script for migrations + build:
  ```bash
  npm run vercel-build
  ```
- Set Vercel Build Command to `npm run vercel-build` if you want automatic `prisma migrate deploy`.
- Keep separate preview and production database URLs to avoid preview migrations affecting production.
