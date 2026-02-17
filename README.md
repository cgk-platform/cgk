# CGK - Commerce Growth Kit

A multi-tenant e-commerce platform designed for agencies managing multiple DTC brands. Built for portability, scalability, and AI-first development.

## Features

- **Multi-tenant Architecture**: Schema-per-tenant PostgreSQL isolation
- **Dual Commerce Support**: Shopify Headless (default) + Custom+Stripe
- **AI-First Documentation**: Every package includes CLAUDE.md for AI-assisted development
- **White-Label Ready**: Fully customizable per-brand theming
- **Modern Stack**: Next.js 16, React 19, TypeScript 5.9, Tailwind CSS 4

## Quick Start

Get a brand site running in under 10 minutes:

```bash
# 1. Create a new brand site
npx @cgk-platform/cli create my-brand

# 2. Navigate to the project
cd my-brand

# 3. Configure environment (copy and edit)
cp apps/admin/.env.example apps/admin/.env.local

# 4. Set minimum required variables in .env.local:
#    - POSTGRES_URL (or DATABASE_URL)
#    - JWT_SECRET
#    - SESSION_SECRET
#    - APP_URL=http://localhost:3200

# 5. Run database migrations
pnpm db:migrate

# 6. Start development server
pnpm dev
```

**Minimum Required Environment Variables:**
- `POSTGRES_URL` or `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT signing (generate with: `openssl rand -base64 32`)
- `SESSION_SECRET` - Secret for session encryption (generate with: `openssl rand -base64 32`)
- `APP_URL` - Your app URL (http://localhost:3200 for local dev)

## Prerequisites

- **Node.js**: 22.x or higher (LTS)
- **pnpm**: 10.x or higher
- **PostgreSQL**: 17+ (for multi-tenant database, via Neon)
- **Redis**: 8+ (optional, for caching, via Upstash)

### Check Your System

```bash
npx @cgk-platform/cli doctor
```

## Installation

### New Project

```bash
# Create with default template (full features)
npx @cgk-platform/cli create my-brand

# Create with specific template
npx @cgk-platform/cli create my-brand --template storefront-only
npx @cgk-platform/cli create my-brand --template basic

# Install dependencies (auto-run by CLI, or manual)
pnpm install --frozen-lockfile  # Uses pnpm-lock.yaml for reproducible builds
```

### Existing Project

```bash
# Initialize CGK in an existing Next.js project
npx @cgk-platform/cli init
```

## Templates

| Template | Description | Use Case |
|----------|-------------|----------|
| `full` | Admin + Storefront + Creator Portal | Complete platform with all features |
| `basic` | Admin portal only | Minimal setup for admin-only needs |
| `storefront-only` | Headless Shopify frontend | When using existing Shopify backend |

## Configuration

Create a `platform.config.ts` in your project root:

```typescript
import { defineConfig } from '@cgk-platform/core'

export default defineConfig({
  platform: {
    name: 'My Brand',
    domain: 'mybrand.com',
    environment: 'development',
  },
  features: {
    commerce: true,
    subscriptions: false,
    creatorPortal: false,
    analytics: true,
  },
  commerce: {
    provider: 'shopify',
    shopify: {
      storeDomain: process.env.SHOPIFY_STORE_DOMAIN!,
      storefrontAccessToken: process.env.SHOPIFY_STOREFRONT_TOKEN!,
      adminAccessToken: process.env.SHOPIFY_ADMIN_TOKEN!,
    },
  },
  database: {
    provider: 'neon',
    connectionString: process.env.DATABASE_URL!,
  },
})
```

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Shopify (if using Shopify commerce)
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_STOREFRONT_TOKEN=your-storefront-token
SHOPIFY_ADMIN_TOKEN=your-admin-token

# Authentication
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret

# Stripe (if using payments)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Packages

| Package | Description |
|---------|-------------|
| `@cgk-platform/core` | Core configuration and types |
| `@cgk-platform/db` | Database utilities with tenant isolation |
| `@cgk-platform/auth` | JWT + session authentication |
| `@cgk-platform/ui` | React components (shadcn/ui based) |
| `@cgk-platform/commerce` | Commerce provider abstraction |
| `@cgk-platform/shopify` | Shopify Admin & Storefront clients |
| `@cgk-platform/payments` | Stripe + Wise payment handling |
| `@cgk-platform/jobs` | Background job abstraction |
| `@cgk-platform/analytics` | GA4 and attribution tracking |
| `@cgk-platform/logging` | Structured logging |
| `@cgk-platform/mcp` | MCP server utilities |
| `@cgk-platform/cli` | Command-line tools |

## Tenant Isolation

CGK uses schema-per-tenant PostgreSQL isolation. **Always** use the tenant context:

```typescript
import { withTenant } from '@cgk-platform/db'

// Correct - uses tenant context
const orders = await withTenant(tenantId, () =>
  sql`SELECT * FROM orders`
)

// NEVER query without tenant context
```

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Docker

```bash
# Build image
docker build -t my-brand .

# Run container
docker run -p 3000:3000 my-brand
```

### Platform Setup

After deployment, run the setup wizard:

```bash
npx @cgk-platform/cli setup
```

This will:
1. Verify database connection
2. Set up Redis cache (if configured)
3. Run database migrations
4. Create initial admin user

## Development

### Monorepo Structure

```
cgk/
├── apps/
│   ├── admin/                 # Tenant admin dashboard (port 3200)
│   ├── orchestrator/          # Super admin platform (port 3201)
│   ├── storefront/            # Customer-facing storefront (port 3202)
│   ├── creator-portal/        # Creator/influencer portal (port 3203)
│   ├── contractor-portal/     # Contractor workspace (port 3204)
│   ├── mcp-server/            # Claude MCP integration (port 3205)
│   └── shopify-app/           # Shopify embedded app
├── packages/                   # 30+ shared packages (@cgk-platform/*)
│   ├── core/                  # Core configuration and types
│   ├── db/                    # Database utilities with tenant isolation
│   ├── auth/                  # JWT + session authentication
│   ├── ui/                    # React components (shadcn/ui)
│   ├── commerce/              # Commerce provider abstraction
│   ├── shopify/               # Shopify Admin & Storefront clients
│   ├── payments/              # Stripe + Wise payment handling
│   ├── jobs/                  # Background job abstraction
│   ├── integrations/          # Third-party integrations
│   ├── video/                 # Mux video processing
│   ├── dam/                   # Digital asset management
│   ├── esign/                 # E-signature (Docusign)
│   ├── tax/                   # Tax calculation (TaxJar)
│   ├── ai-agents/             # AI agent utilities
│   ├── ab-testing/            # A/B testing framework
│   ├── communications/        # Email/SMS (Resend/Twilio)
│   ├── analytics/             # GA4 and attribution tracking
│   ├── health/                # Health checks and monitoring
│   ├── logging/               # Structured logging
│   ├── feature-flags/         # Feature flag management
│   ├── scheduling/            # Task scheduling
│   ├── support/               # Support ticket integration
│   └── cli/                   # Command-line tools
├── starters/                   # Project templates (basic, full, storefront-only)
└── MULTI-TENANT-PLATFORM-PLAN/ # Architecture documentation
```

### Commands

```bash
# Development
pnpm dev                          # Start all apps in dev mode
pnpm dev --filter admin           # Start only admin app
pnpm dev --filter orchestrator    # Start only orchestrator
pnpm build                        # Build all packages
pnpm typecheck                    # Run TypeScript checks
pnpm lint                         # Run ESLint
pnpm test                         # Run tests

# Database
pnpm db:migrate                   # Run migrations
pnpm db:seed                      # Seed database

# Package Management
pnpm changeset                    # Create a changeset for releases
pnpm version-packages             # Version packages
pnpm release                      # Publish to npm

# Lockfile Management
pnpm install --frozen-lockfile    # Install with exact versions (CI/production)
pnpm install                      # Update pnpm-lock.yaml (development)
```

> **Note on Lockfile**: Always commit `pnpm-lock.yaml`. Use `--frozen-lockfile` in CI/Docker for reproducible builds.

### Docker Development

Use `docker-compose` for local development with PostgreSQL and Redis:

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down
```

The `docker-compose.yml` provides:
- PostgreSQL 17 (port 5432)
- Redis 8 (port 6379)
- Adminer web UI (port 8080)

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and contribution guidelines.

## License

MIT - see [LICENSE](./LICENSE) for details.

## Support

- **Repository**: [github.com/cgk-platform/cgk](https://github.com/cgk-platform/cgk)
- **Issues**: [GitHub Issues](https://github.com/cgk-platform/cgk/issues)
- **Discussions**: [GitHub Discussions](https://github.com/cgk-platform/cgk/discussions)
