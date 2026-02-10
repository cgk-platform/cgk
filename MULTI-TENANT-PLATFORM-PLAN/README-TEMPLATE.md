# README Template for GitHub Repository

**Use this as the README.md in the main repository**

> **Note**: Adjust for private repo during dev phase.

---

# CGK - Commerce Growth Kit

A portable, open-source multi-tenant e-commerce platform for building white-labeled storefronts, admin portals, and creator payment systems.

**Built for AI-assisted development** - Comprehensive documentation designed for Claude, Cursor, and other AI coding tools.

---

## Features

- **Multi-Tenant Architecture**: Schema-per-tenant isolation with RLS fallback
- **White-Label Admin Portal**: Customizable admin dashboard per brand
- **Headless Storefronts**: Shopify-powered with full customization
- **Creator Payments**: Stripe Connect + Wise for domestic and international payouts
- **A/B Testing**: Edge-based variant assignment
- **Landing Page Builder**: 70+ block types, scheduled publishing
- **Attribution Engine**: 7 attribution models, touchpoint tracking
- **Background Jobs**: Event-driven with Inngest
- **MCP Server**: AI assistant tooling with Streamable HTTP

---

## Quick Start

### Prerequisites

- Node.js 22+ (LTS)
- pnpm 10+
- PostgreSQL 17+ (or Neon account)
- Redis 8+ (or Upstash account)
- Shopify Partner account (for storefront)

### Create a New Brand Site

```bash
# Create a new brand using the CLI
npx @cgk/cli create my-brand

# Navigate to the project
cd my-brand

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your credentials

# Run database migrations
npx @cgk/cli migrate

# Start development server
pnpm dev
```

Your admin portal is now running at `http://localhost:3000`!

---

## Installation Options

### Option 1: Create New Project (Recommended)

```bash
npx @cgk/cli create my-brand --template=full
```

Templates available:
- `basic` - Admin portal only
- `full` - Admin + Storefront + Creator Portal
- `storefront-only` - Just the headless storefront

### Option 2: Add to Existing Project

```bash
npx @cgk/cli init
```

### Option 3: Clone and Customize

```bash
git clone https://github.com/cgk-platform/cgk.git
cd cgk
pnpm install
pnpm dev
```

---

## Configuration

### Platform Configuration

Create `platform.config.ts` in your project root:

```typescript
import { defineConfig } from '@cgk/core'

export default defineConfig({
  brand: {
    name: 'My Brand',
    slug: 'mybrand',
    domain: 'mybrand.com'
  },

  theme: {
    colors: {
      primary: '#000000',
      accent: '#0070f3'
    }
  },

  features: {
    creators: true,
    abTesting: true,
    attribution: true,
    reviews: true,
    subscriptions: true
  },

  shopify: {
    storeDomain: 'mybrand.myshopify.com'
  },

  deployment: {
    profile: 'medium'  // small | medium | large | enterprise
  }
})
```

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Authentication
JWT_SECRET=your-secret-key
SESSION_SECRET=your-session-secret

# Shopify
SHOPIFY_STORE_DOMAIN=store.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=...

# Payments
STRIPE_SECRET_KEY=sk_...
WISE_API_KEY=...

# Background Jobs
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...
```

---

## Project Structure

```
my-brand/
├── platform.config.ts      # Platform configuration
├── package.json
├── src/
│   ├── app/                # Next.js app router
│   │   ├── admin/          # Admin portal pages
│   │   ├── api/            # API routes
│   │   └── (storefront)/   # Storefront pages
│   ├── components/         # Custom components
│   │   └── overrides/      # Component overrides
│   └── lib/                # Custom business logic
├── migrations/
│   └── brand/              # Brand-specific migrations
└── .env.local              # Environment variables
```

---

## CLI Reference

```bash
# Project management
npx @cgk/cli create <name>      # Create new brand site
npx @cgk/cli init               # Initialize in existing project
npx @cgk/cli doctor             # Check system requirements

# Updates
npx @cgk/cli check-updates      # Check for platform updates
npx @cgk/cli update             # Update all packages
npx @cgk/cli changelog <ver>    # View changelog

# Database
npx @cgk/cli migrate            # Run migrations
npx @cgk/cli migrate --status   # Check migration status
npx @cgk/cli migrate --rollback # Rollback last migration

# Tenants
npx @cgk/cli tenant:create      # Create new tenant
npx @cgk/cli tenant:list        # List tenants
npx @cgk/cli tenant:export <id> # Export tenant data

# Development
npx @cgk/cli dev                # Start dev server
npx @cgk/cli build              # Build for production
npx @cgk/cli typecheck          # Run TypeScript checks
```

---

## Packages

| Package | Description |
|---------|-------------|
| `@cgk/core` | Types, utilities, config schemas |
| `@cgk/db` | Database client, tenant utilities |
| `@cgk/auth` | JWT, sessions, middleware |
| `@cgk/ui` | shadcn/ui components |
| `@cgk/shopify` | Shopify Admin/Storefront clients |
| `@cgk/payments` | Stripe + Wise payment abstraction |
| `@cgk/jobs` | Background job abstraction (Inngest) |
| `@cgk/mcp` | MCP server utilities |
| `@cgk/analytics` | GA4, attribution tracking |
| `@cgk/commerce-hooks` | Headless React hooks |
| `@cgk/logging` | Structured logging |
| `@cgk/cli` | Command-line interface |

---

## Customization

### Override Components

Create files in `src/components/overrides/` to customize platform components:

```typescript
// src/components/overrides/Button.tsx
import { Button as CoreButton } from '@cgk/ui'

// Extend with custom styles
export const Button = styled(CoreButton, {
  // Your customizations
})
```

### Custom Blocks

Add custom landing page blocks:

```typescript
// src/components/blocks/CustomHero.tsx
export function CustomHero({ config }) {
  return (
    <section>
      {/* Your custom block implementation */}
    </section>
  )
}

// Register in platform.config.ts
export default defineConfig({
  blocks: {
    custom: {
      'custom-hero': CustomHero
    }
  }
})
```

### Custom API Routes

Add brand-specific API routes in `src/app/api/`:

```typescript
// src/app/api/custom/route.ts
export async function GET() {
  // Your custom logic
}
```

---

## Deployment

### Vercel (Recommended)

```bash
# Deploy to Vercel
npx @cgk/cli deploy

# Preview deployment
npx @cgk/cli deploy --preview
```

### Self-Hosted

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

### Docker

```bash
docker build -t my-brand .
docker run -p 3000:3000 my-brand
```

---

## Updating

### Check for Updates

```bash
npx @cgk/cli check-updates
```

### Apply Updates

```bash
# Update packages
pnpm update "@cgk/*" --latest

# Run any new migrations
npx @cgk/cli migrate

# Check for breaking changes
npx @cgk/cli changelog
```

### Release Channels

```bash
# Stable (default)
pnpm update "@cgk/*" --latest

# Beta
pnpm update "@cgk/*@beta"

# Canary (daily builds)
pnpm update "@cgk/*@canary"
```

---

## AI Development

This platform is designed for AI-assisted development. Each package includes a `CLAUDE.md` file with:

- Package purpose and context
- Key patterns and code examples
- File structure and exports
- Common gotchas and warnings

When using AI coding tools, they can read these files for context-aware assistance.

### Logging for AI Debugging

Logs are structured for AI parsing:

```typescript
import { logger } from '@cgk/logging'

logger.info('order.sync.complete', {
  orderId: 'order_123',
  duration: 450,
  itemCount: 3
})
```

Query logs with:
```bash
npx @cgk/cli logs --action="order.*" --since="1h"
```

---

## Documentation

- [Getting Started Guide](./docs/getting-started/installation.md)
- [Configuration Reference](./docs/getting-started/configuration.md)
- [API Reference](./docs/api-reference/README.md)
- [Deployment Guide](./docs/getting-started/deployment.md)
- [Architecture Overview](./docs/architecture/README.md)

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and contribution guidelines.

---

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

## Support

- [GitHub Issues](https://github.com/cgk-platform/cgk/issues)
- [Discussions](https://github.com/cgk-platform/cgk/discussions)
- [Discord Community](https://discord.gg/cgk-platform)
