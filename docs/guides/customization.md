# Customization Guide

Guide for customizing the CGK platform including theming, configuration, component extension, and custom integrations.

## Theming

### Design Tokens

The platform uses CSS custom properties for theming. These are defined in your app's `globals.css`:

```css
/* apps/storefront/src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Color palette */
    --primary: hsl(222 47% 11%);       /* Deep Navy */
    --primary-foreground: hsl(0 0% 100%);
    --gold: hsl(38 92% 50%);           /* Gold accent */
    --gold-foreground: hsl(222 47% 11%);

    /* Semantic colors */
    --success: hsl(142 76% 36%);
    --warning: hsl(38 92% 50%);
    --destructive: hsl(0 84% 60%);
    --info: hsl(199 89% 48%);

    /* Background & foreground */
    --background: hsl(0 0% 100%);
    --foreground: hsl(222 47% 11%);

    /* Card */
    --card: hsl(0 0% 100%);
    --card-foreground: hsl(222 47% 11%);

    /* Border & input */
    --border: hsl(214 32% 91%);
    --input: hsl(214 32% 91%);
    --ring: hsl(222 47% 11%);

    /* Radius */
    --radius: 0.5rem;

    /* Animation durations */
    --duration-fast: 150ms;
    --duration-normal: 200ms;
    --duration-slow: 300ms;
  }

  .dark {
    --primary: hsl(210 40% 98%);
    --primary-foreground: hsl(222 47% 11%);
    --background: hsl(222 47% 11%);
    --foreground: hsl(210 40% 98%);
    /* ... other dark mode overrides */
  }
}
```

### Tenant-Specific Theming

Each tenant can have custom theme settings stored in the database:

```typescript
// Query tenant theme
const theme = await withTenant(tenantSlug, async () => {
  const result = await sql`SELECT * FROM tenant_settings WHERE key = 'theme'`
  return result.rows[0]?.value
})

// Apply theme in layout
export default function RootLayout({ children }) {
  const theme = await getTenantTheme()

  return (
    <html lang="en" style={{
      '--primary': theme.primaryColor,
      '--gold': theme.accentColor,
      '--radius': theme.borderRadius,
    }}>
      <body>{children}</body>
    </html>
  )
}
```

### Font Customization

The platform uses `next/font/google` for optimized font loading:

```typescript
// apps/admin/src/app/layout.tsx
import { Geist, Geist_Mono } from 'next/font/google'
import localFont from 'next/font/local'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

// For custom fonts
const brandFont = localFont({
  src: './fonts/BrandFont.woff2',
  variable: '--font-brand',
})

export default function RootLayout({ children }) {
  return (
    <html className={`${geistSans.variable} ${geistMono.variable} ${brandFont.variable}`}>
      <body>{children}</body>
    </html>
  )
}
```

Then use in Tailwind:

```css
/* tailwind.config.ts */
{
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)'],
        mono: ['var(--font-geist-mono)'],
        brand: ['var(--font-brand)'],
      },
    },
  },
}
```

## Configuration Options

### Platform Configuration

The `platform.config.ts` file in your project root controls platform-wide settings:

```typescript
// platform.config.ts
import { defineConfig } from '@cgk-platform/core'

export default defineConfig({
  brand: {
    name: 'My Brand',
    slug: 'my-brand',
    domain: 'mybrand.com',
    logo: '/logo.svg',
    favicon: '/favicon.ico',
  },
  features: {
    // Enable/disable platform features
    creators: true,
    abTesting: false,
    attribution: true,
    reviews: true,
    subscriptions: false,
    videoContent: true,
  },
  commerce: {
    provider: 'shopify', // or 'custom-stripe'
    currencyCode: 'USD',
    locale: 'en-US',
  },
  deployment: {
    profile: 'small', // small, medium, large
    region: 'us-east-1',
  },
})
```

### Feature Flags

Feature flags can be configured per-tenant:

```typescript
// Check feature flag
import { isFeatureEnabled } from '@cgk-platform/core'

const hasReviews = await isFeatureEnabled(tenantId, 'reviews')
if (hasReviews) {
  // Show reviews section
}

// Set feature flag (admin only)
await sql`
  INSERT INTO feature_flags (tenant_id, feature_key, enabled)
  VALUES (${tenantId}, 'reviews', true)
  ON CONFLICT (tenant_id, feature_key)
  DO UPDATE SET enabled = true
`
```

### Environment-Based Configuration

Use environment variables for environment-specific settings:

```typescript
// lib/config.ts
export const config = {
  isProd: process.env.NODE_ENV === 'production',
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  shopifyDomain: process.env.SHOPIFY_STORE_DOMAIN,

  // Feature flags from env
  enableAnalytics: process.env.ENABLE_ANALYTICS === 'true',
  enableABTesting: process.env.ENABLE_AB_TESTING === 'true',
}
```

## Extending Components

### Wrapping UI Components

Create wrapper components that extend the base UI:

```typescript
// apps/storefront/src/components/button.tsx
'use client'

import { Button as BaseButton, type ButtonProps } from '@cgk-platform/ui'
import { cn } from '@/lib/utils'

interface ExtendedButtonProps extends ButtonProps {
  loading?: boolean
  icon?: React.ReactNode
}

export function Button({
  loading,
  icon,
  children,
  disabled,
  className,
  ...props
}: ExtendedButtonProps) {
  return (
    <BaseButton
      disabled={disabled || loading}
      className={cn(loading && 'opacity-50 cursor-wait', className)}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : icon ? (
        <span className="mr-2">{icon}</span>
      ) : null}
      {children}
    </BaseButton>
  )
}
```

### Creating Composite Components

Build higher-level components from primitives:

```typescript
// apps/storefront/src/components/product-card.tsx
'use client'

import { Card, Badge, Button } from '@cgk-platform/ui'
import { formatMoney } from '@cgk-platform/commerce-primitives'
import { useCart } from '@cgk-platform/commerce-hooks'
import type { Product } from '@cgk-platform/commerce'

interface ProductCardProps {
  product: Product
  showQuickAdd?: boolean
}

export function ProductCard({ product, showQuickAdd = true }: ProductCardProps) {
  const { addItem, isUpdating } = useCart()
  const defaultVariant = product.variants[0]

  const handleQuickAdd = async () => {
    if (!defaultVariant) return
    await addItem({ variantId: defaultVariant.id, quantity: 1 })
  }

  return (
    <Card className="group relative overflow-hidden">
      {/* Image */}
      <div className="aspect-square overflow-hidden">
        <img
          src={product.featuredImage?.url}
          alt={product.title}
          className="object-cover transition-transform group-hover:scale-105"
        />
      </div>

      {/* Sale badge */}
      {product.compareAtPriceRange && (
        <Badge className="absolute top-2 right-2" variant="destructive">
          Sale
        </Badge>
      )}

      {/* Content */}
      <div className="p-4">
        <h3 className="font-medium truncate">{product.title}</h3>
        <p className="text-muted-foreground">
          {formatMoney(product.priceRange.minVariantPrice)}
        </p>

        {showQuickAdd && defaultVariant && (
          <Button
            onClick={handleQuickAdd}
            loading={isUpdating}
            className="mt-3 w-full"
            size="sm"
          >
            Add to Cart
          </Button>
        )}
      </div>
    </Card>
  )
}
```

### Slot Pattern for Customization

Use slots for flexible component customization:

```typescript
// components/page-layout.tsx
interface PageLayoutProps {
  header?: React.ReactNode
  sidebar?: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
}

export function PageLayout({
  header,
  sidebar,
  footer,
  children,
}: PageLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {header && <header className="border-b">{header}</header>}

      <div className="flex-1 flex">
        {sidebar && <aside className="w-64 border-r">{sidebar}</aside>}
        <main className="flex-1 p-6">{children}</main>
      </div>

      {footer && <footer className="border-t">{footer}</footer>}
    </div>
  )
}

// Usage
<PageLayout
  header={<CustomHeader />}
  sidebar={<CustomSidebar />}
>
  <PageContent />
</PageLayout>
```

## Custom Integrations

### Adding Third-Party Services

Tenant-managed integrations follow this pattern:

```typescript
// packages/integrations/src/my-service.ts
import { getTenantCredential, decryptCredential } from './credentials.js'
import { MyServiceSDK } from 'my-service-sdk'

let clientCache = new Map<string, { client: MyServiceSDK; expiresAt: number }>()

export async function getTenantMyServiceClient(
  tenantId: string
): Promise<MyServiceSDK | null> {
  // Check cache
  const cached = clientCache.get(tenantId)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.client
  }

  // Get encrypted credential
  const credential = await getTenantCredential(tenantId, 'my_service_api_key')
  if (!credential) return null

  // Decrypt and create client
  const apiKey = await decryptCredential(credential)
  const client = new MyServiceSDK({ apiKey })

  // Cache for 5 minutes
  clientCache.set(tenantId, {
    client,
    expiresAt: Date.now() + 5 * 60 * 1000,
  })

  return client
}

export async function requireTenantMyServiceClient(tenantId: string): Promise<MyServiceSDK> {
  const client = await getTenantMyServiceClient(tenantId)
  if (!client) {
    throw new Error('MyService not configured for this tenant')
  }
  return client
}
```

### Webhook Handlers

Create webhook handlers for third-party services:

```typescript
// apps/admin/src/app/api/webhooks/my-service/route.ts
import { NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/webhooks'
import { withTenant, sql } from '@cgk-platform/db'

export async function POST(request: Request) {
  // 1. Get raw body for signature verification
  const body = await request.text()
  const signature = request.headers.get('x-my-service-signature')

  // 2. Verify signature
  const isValid = verifyWebhookSignature(body, signature)
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // 3. Parse event
  const event = JSON.parse(body)

  // 4. Extract tenant from event metadata
  const tenantId = event.metadata?.tenantId
  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenant' }, { status: 400 })
  }

  // 5. Process with tenant context
  return withTenant(tenantId, async () => {
    switch (event.type) {
      case 'payment.completed':
        await handlePaymentCompleted(event.data)
        break
      case 'subscription.updated':
        await handleSubscriptionUpdated(event.data)
        break
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  })
}

// Disable body parsing for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
}
```

### Custom API Clients

Create custom API clients for external services:

```typescript
// lib/external-api.ts
interface ExternalAPIConfig {
  baseUrl: string
  apiKey: string
  timeout?: number
}

export class ExternalAPIClient {
  private baseUrl: string
  private apiKey: string
  private timeout: number

  constructor(config: ExternalAPIConfig) {
    this.baseUrl = config.baseUrl
    this.apiKey = config.apiKey
    this.timeout = config.timeout || 30000
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      return response.json()
    } finally {
      clearTimeout(timeoutId)
    }
  }

  async getItem(id: string) {
    return this.request<{ id: string; name: string }>('GET', `/items/${id}`)
  }

  async createItem(data: { name: string }) {
    return this.request<{ id: string }>('POST', '/items', data)
  }
}

// Usage with tenant credentials
export async function getExternalClient(tenantId: string) {
  const apiKey = await getTenantCredential(tenantId, 'external_api_key')
  if (!apiKey) return null

  return new ExternalAPIClient({
    baseUrl: 'https://api.external-service.com/v1',
    apiKey: await decryptCredential(apiKey),
  })
}
```

## Overriding Default Behavior

### Custom Authentication

Override the default auth flow:

```typescript
// lib/auth/custom-auth.ts
import { validateSession } from '@cgk-platform/auth'

export async function customAuthMiddleware(request: Request) {
  // Check for custom header
  const customToken = request.headers.get('x-custom-token')
  if (customToken) {
    return validateCustomToken(customToken)
  }

  // Fall back to default session auth
  return validateSession(request)
}
```

### Custom Error Handling

Create custom error boundaries and handlers:

```typescript
// app/error.tsx
'use client'

import { useEffect } from 'react'
import { Button } from '@cgk-platform/ui'
import { logError } from '@/lib/logging'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to your error tracking service
    logError(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
      <p className="text-muted-foreground mb-6">
        {error.message || 'An unexpected error occurred'}
      </p>
      <div className="flex gap-4">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Refresh page
        </Button>
      </div>
    </div>
  )
}
```

### Custom Logging

Extend the logging package:

```typescript
// lib/logging.ts
import { createLogger } from '@cgk-platform/logging'

const baseLogger = createLogger({
  service: 'my-app',
  level: process.env.LOG_LEVEL || 'info',
})

export const logger = {
  ...baseLogger,

  // Add custom methods
  withTenant(tenantId: string) {
    return {
      info: (message: string, meta?: Record<string, unknown>) =>
        baseLogger.info(message, { tenantId, ...meta }),
      error: (message: string, error?: Error, meta?: Record<string, unknown>) =>
        baseLogger.error(message, { tenantId, error, ...meta }),
      // ... other levels
    }
  },

  // Add custom event tracking
  trackEvent(event: string, properties: Record<string, unknown>) {
    baseLogger.info('event', { event, ...properties })

    // Also send to analytics
    if (typeof window !== 'undefined' && window.analytics) {
      window.analytics.track(event, properties)
    }
  },
}
```
