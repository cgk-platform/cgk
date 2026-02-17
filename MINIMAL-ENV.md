# Minimum Viable Environment Configuration

This guide shows the **absolute minimum** environment variables needed to get `pnpm dev` running for local development.

## Quick Start (4 Variables)

Create `.env.local` in each app directory (e.g., `apps/admin/.env.local`):

```bash
# 1. Database - REQUIRED
POSTGRES_URL=postgresql://user:password@localhost:5432/cgk_dev

# 2. JWT Secret - REQUIRED  
JWT_SECRET=your-secret-here-generate-with-openssl-rand-base64-32

# 3. Session Secret - REQUIRED
SESSION_SECRET=your-secret-here-generate-with-openssl-rand-base64-32

# 4. App URL - REQUIRED (varies per app)
APP_URL=http://localhost:3200  # 3200 for admin, 3201 for orchestrator, etc.
```

## Generate Secrets

```bash
# Generate JWT_SECRET
openssl rand -base64 32

# Generate SESSION_SECRET  
openssl rand -base64 32
```

## Per-App URLs

Each app needs its own `APP_URL` matching its dev port:

| App | Port | APP_URL |
|-----|------|---------|
| admin | 3200 | `http://localhost:3200` |
| orchestrator | 3201 | `http://localhost:3201` |
| storefront | 3202 | `http://localhost:3202` |
| creator-portal | 3203 | `http://localhost:3203` |
| contractor-portal | 3204 | `http://localhost:3204` |
| mcp-server | 3205 | `http://localhost:3205` |

## Next Public Variables

For storefront and public-facing apps, also set:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3202
NEXT_PUBLIC_API_URL=http://localhost:3200/api
```

## Optional (But Recommended)

### Redis Cache (Upstash)

```bash
KV_REST_API_URL=https://your-upstash-url.upstash.io
KV_REST_API_TOKEN=your-upstash-token
```

Or direct Upstash:

```bash
UPSTASH_REDIS_REST_URL=https://your-upstash-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-token
```

### Shopify (If Using Shopify Commerce)

```bash
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_STOREFRONT_TOKEN=your-storefront-token
SHOPIFY_ADMIN_TOKEN=your-admin-token
```

## Full .env.example

For the complete list of all possible environment variables (100+ options), see:
- `apps/admin/.env.example`
- `apps/orchestrator/.env.example`
- Other app-specific `.env.example` files

**Note**: The `.env.example` files contain every possible variable across all features. You **do not** need to set them all for basic development.

## Environment File Architecture

CGK uses **per-app** environment files, not a root `.env`:

```
cgk/
├── apps/
│   ├── admin/
│   │   ├── .env.example      # Template
│   │   └── .env.local         # Your local config (gitignored)
│   ├── orchestrator/
│   │   ├── .env.example
│   │   └── .env.local
│   └── ...
└── .env.local                 # ❌ Won't work (Next.js reads from app dirs)
```

## Common Issues

### "POSTGRES_URL is not defined"

Solution: Make sure you created `.env.local` in the **app directory** (e.g., `apps/admin/.env.local`), not at the root.

### "Relation does not exist"

Solution: Run migrations:

```bash
pnpm db:migrate
```

### "Invalid JWT secret"

Solution: Generate a proper secret:

```bash
openssl rand -base64 32
```

Then set it as `JWT_SECRET` in `.env.local`.

## Docker Compose Quick Setup

If you don't have PostgreSQL installed locally:

```bash
# Start PostgreSQL and Redis via Docker
docker-compose up -d

# Use this connection string
POSTGRES_URL=postgresql://cgk:cgk@localhost:5432/cgk
```

The `docker-compose.yml` includes:
- PostgreSQL 17 (user: `cgk`, pass: `cgk`, db: `cgk`)
- Redis 8
- Adminer UI at http://localhost:8080

## Production Deployment

For production (Vercel), use:

```bash
# Pull environment variables from Vercel
vercel env pull
```

This will create `.env.local` files with your production secrets.

## Need Help?

Run the system check:

```bash
npx @cgk-platform/cli doctor
```

This will verify:
- ✅ Node.js 22+
- ✅ pnpm installed
- ✅ POSTGRES_URL set
- ⚠️ Redis configured (optional)
- ⚠️ JWT_SECRET set
