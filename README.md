# CGK - Commerce Growth Kit

A multi-tenant e-commerce platform designed for agencies managing multiple DTC brands. Built for portability, scalability, and AI-first development.

## Features

- **Multi-tenant Architecture**: Schema-per-tenant PostgreSQL isolation
- **Dual Commerce Support**: Shopify Headless (default) + Custom+Stripe
- **AI-First Documentation**: Every package includes CLAUDE.md for AI-assisted development
- **White-Label Ready**: Fully customizable per-brand theming
- **Modern Stack**: Next.js 16, React 19, TypeScript 5.9, Tailwind CSS 4

## Quick Start

Get a brand site running in under 5 minutes:

```bash
# Create a new brand site
npx @cgk-platform/cli create my-brand

# Navigate to the project
cd my-brand

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

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
├── apps/              # Applications (docs, admin)
├── packages/          # Shared packages (@cgk-platform/*)
├── starters/          # Project templates
└── docs/              # Documentation
```

### Commands

```bash
# Development
pnpm dev              # Start all packages in dev mode
pnpm build            # Build all packages
pnpm typecheck        # Run TypeScript checks
pnpm lint             # Run ESLint
pnpm test             # Run tests

# Package Management
pnpm changeset        # Create a changeset for releases
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and contribution guidelines.

## License

MIT - see [LICENSE](./LICENSE) for details.

## Support

- **Documentation**: [docs.cgk.dev](https://docs.cgk.dev)
- **Issues**: [GitHub Issues](https://github.com/your-org/cgk/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/cgk/discussions)
