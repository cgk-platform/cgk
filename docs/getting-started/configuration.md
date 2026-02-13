# Configuration

## Environment Variables

Create a `.env.local` file in your project root:

```bash
# Database (Required)
DATABASE_URL=postgresql://user:pass@host:5432/db

# Cache (Required)
REDIS_URL=redis://user:pass@host:6379

# Authentication (Required)
JWT_SECRET=your-jwt-secret-min-32-chars
SESSION_SECRET=your-session-secret-min-32-chars

# Shopify (Required for storefront)
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_STOREFRONT_ACCESS_TOKEN=your-storefront-token
SHOPIFY_ADMIN_ACCESS_TOKEN=your-admin-token

# Stripe (Required for payments)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Platform Configuration

Create a `platform.config.ts` in your project root:

```typescript
import { defineConfig } from '@cgk-platform/core'

export default defineConfig({
  brand: {
    name: 'My Brand',
    slug: 'mybrand',
    domain: 'mybrand.com',
  },
  features: {
    creators: true,
    attribution: true,
    customCheckout: false,
  },
  shopify: {
    storeDomain: process.env.SHOPIFY_STORE_DOMAIN!,
  },
})
```

## Tenant Configuration

For multi-tenant setups, each tenant has its own schema and configuration:

```typescript
// Tenant context is automatically resolved from subdomain
// tenant1.yourdomain.com -> tenant1 schema
// tenant2.yourdomain.com -> tenant2 schema
```

## Next Steps

- [Deployment](./deployment.md) - Deploy to production
