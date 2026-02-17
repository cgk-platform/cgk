# Deployment Guide

Guide for deploying CGK applications to production.

## Vercel Deployment

CGK is optimized for deployment on Vercel with serverless functions.

### 1. Connect Repository

```bash
# Install Vercel CLI
npm i -g vercel

# Link project
vercel link
```

### 2. Configure Projects

Each app needs its own Vercel project:

| App | Vercel Project | Root Directory |
|-----|----------------|----------------|
| Admin | `cgk-admin` | `apps/admin` |
| Storefront | `cgk-storefront` | `apps/storefront` |
| Orchestrator | `cgk-orchestrator` | `apps/orchestrator` |
| Creator Portal | `cgk-creator-portal` | `apps/creator-portal` |

Configure in Vercel dashboard or `vercel.json`:

```json
{
  "buildCommand": "cd ../.. && pnpm build --filter admin",
  "outputDirectory": ".next",
  "framework": "nextjs"
}
```

### 3. Add Storage

Add database and cache via Vercel Storage:

```bash
# Add Neon PostgreSQL
vercel storage add

# Add Upstash Redis (optional)
vercel storage add
```

### 4. Set Environment Variables

Add all required environment variables to Vercel:

```bash
# Add to all projects
for app in admin storefront orchestrator creator-portal; do
  echo "Adding to $app..."
  (cd apps/$app && \
    vercel env add JWT_SECRET production && \
    vercel env add SESSION_SECRET production)
done

# Pull to local
pnpm env:pull
```

### 5. Deploy

```bash
# Deploy to production
vercel --prod

# Or via Git push (if configured)
git push origin main
```

## Environment Variables

### Required Variables (All Apps)

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `POSTGRES_URL` | PostgreSQL connection | Vercel Storage / Neon |
| `JWT_SECRET` | JWT signing secret | Generate with `openssl rand -base64 32` |
| `SESSION_SECRET` | Session encryption key | Generate with `openssl rand -base64 32` |

### App-Specific Variables

**Admin (`apps/admin`):**

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | Admin app URL |
| `SHOPIFY_API_KEY` | Shopify app API key |
| `SHOPIFY_API_SECRET` | Shopify app secret |

**Storefront (`apps/storefront`):**

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_STOREFRONT_URL` | Storefront URL |
| `SHOPIFY_STOREFRONT_TOKEN` | Storefront API token |
| `SHOPIFY_STORE_DOMAIN` | myshop.myshopify.com |

**Trigger.dev (Background Jobs):**

| Variable | Description |
|----------|-------------|
| `TRIGGER_API_KEY` | Trigger.dev API key |
| `TRIGGER_API_URL` | Trigger.dev API URL |

### Optional Variables

| Variable | Description |
|----------|-------------|
| `KV_REST_API_URL` | Upstash Redis URL |
| `KV_REST_API_TOKEN` | Upstash Redis token |
| `INTEGRATION_ENCRYPTION_KEY` | For encrypting tenant credentials |
| `SENTRY_DSN` | Sentry error tracking |

### Managing Environment Variables

```bash
# Add to Vercel (interactive)
vercel env add VAR_NAME production

# Add to Vercel (non-interactive)
echo "value" | vercel env add VAR_NAME production

# Pull to local
pnpm env:pull

# List all env vars
vercel env ls
```

## Database Setup

### Create Database (Neon)

1. Go to Vercel Storage or Neon directly
2. Create a new PostgreSQL database
3. Copy the connection string to `POSTGRES_URL`

### Run Migrations

```bash
# Ensure env vars are set
source .env.local

# Run public schema migrations
npx @cgk-platform/cli migrate --public-only

# Create initial tenant
npx @cgk-platform/cli tenant:create my_brand --name "My Brand"
```

### Production Migration Checklist

1. Test migration locally first
2. Back up production database
3. Run with `--dry-run` to preview
4. Run migration during low-traffic period
5. Monitor for errors

```bash
# Backup before migration
pg_dump $POSTGRES_URL > backup-$(date +%Y%m%d).sql

# Preview migration
npx @cgk-platform/cli migrate --dry-run

# Run migration
npx @cgk-platform/cli migrate
```

## Domain Configuration

### Custom Domains

Add custom domains in Vercel:

1. Go to Project Settings > Domains
2. Add your domain
3. Update DNS records as instructed

### Subdomain Strategy

| Subdomain | App | Example |
|-----------|-----|---------|
| `admin.` | Admin portal | admin.mybrand.com |
| `www.` / root | Storefront | mybrand.com |
| `creators.` | Creator portal | creators.mybrand.com |
| `api.` | API routes | api.mybrand.com |

### Middleware for Subdomains

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const subdomain = hostname.split('.')[0]

  // Route based on subdomain
  if (subdomain === 'admin') {
    return NextResponse.rewrite(new URL('/admin' + request.nextUrl.pathname, request.url))
  }

  if (subdomain === 'creators') {
    return NextResponse.rewrite(new URL('/creator-portal' + request.nextUrl.pathname, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

## SSL Certificates

Vercel automatically provisions SSL certificates for custom domains. Ensure:

1. DNS is properly configured
2. Domain ownership is verified
3. Wait for certificate provisioning (usually < 5 minutes)

## CDN and Caching

### Static Asset Caching

Vercel automatically caches static assets. Configure cache headers in `next.config.ts`:

```typescript
// next.config.ts
const config = {
  images: {
    remotePatterns: [
      { hostname: 'cdn.shopify.com' },
      { hostname: 'images.unsplash.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/image:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
    ]
  },
}
```

### API Route Caching

```typescript
// Force dynamic for API routes that need fresh data
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Or set specific revalidation time
export const revalidate = 60  // 60 seconds
```

## Monitoring and Logging

### Enable Vercel Analytics

```bash
# Install analytics
pnpm add @vercel/analytics

# Add to layout
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

### Error Tracking with Sentry

```bash
# Install Sentry
pnpm add @sentry/nextjs

# Initialize
npx @sentry/wizard@latest -i nextjs
```

Configure `sentry.client.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.VERCEL_ENV || 'development',
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
})
```

### Structured Logging

```typescript
import { createLogger } from '@cgk-platform/logging'

const logger = createLogger({
  service: 'admin',
  level: process.env.LOG_LEVEL || 'info',
})

// In API routes
logger.info('Order created', {
  tenantId,
  orderId,
  amount: order.totalPrice.amount,
})
```

## Post-Deployment Checklist

### Immediate Checks

- [ ] All apps accessible via their URLs
- [ ] Authentication working (login/logout)
- [ ] Database connected (check doctor command)
- [ ] API routes responding correctly
- [ ] Static assets loading (images, fonts)

### Functionality Checks

- [ ] Create a test order
- [ ] Process a test payment
- [ ] Send a test email
- [ ] Run a background job
- [ ] Check webhook endpoints

### Performance Checks

- [ ] Run Lighthouse audit
- [ ] Check Core Web Vitals in Vercel
- [ ] Test load time in different regions
- [ ] Verify CDN caching headers

### Security Checks

- [ ] SSL certificates valid
- [ ] Sensitive env vars not exposed client-side
- [ ] API routes properly authenticated
- [ ] CORS configured correctly
- [ ] Rate limiting in place

## Rollback Procedure

If deployment fails:

```bash
# List recent deployments
vercel ls

# Rollback to previous deployment
vercel rollback

# Or specify deployment ID
vercel rollback dpl_xxxxxxxxxxxx
```

## Scaling Considerations

### Vercel Function Sizing

Configure function memory and duration in `vercel.json`:

```json
{
  "functions": {
    "api/heavy-operation.ts": {
      "memory": 1024,
      "maxDuration": 60
    }
  }
}
```

### Database Connections

For high-traffic apps, consider connection pooling:

```typescript
// Use Neon serverless driver
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)
```

### Background Job Scaling

Scale Trigger.dev workers as needed:

1. Go to Trigger.dev dashboard
2. Navigate to project settings
3. Adjust concurrency limits

## Troubleshooting

### Build Failures

```bash
# Check build logs
vercel logs

# Run build locally to debug
pnpm build
```

### Function Timeouts

- Check function duration in Vercel logs
- Optimize database queries
- Consider background jobs for long operations

### Database Connection Issues

- Verify `POSTGRES_URL` is set correctly
- Check network/firewall rules
- Ensure IP is whitelisted (if applicable)

### Cold Starts

Minimize cold starts by:
- Reducing bundle size
- Lazy loading non-critical code
- Using edge functions where appropriate

```typescript
// Use edge runtime for fast responses
export const runtime = 'edge'

export async function GET() {
  // Fast, globally distributed response
  return Response.json({ status: 'ok' })
}
```
