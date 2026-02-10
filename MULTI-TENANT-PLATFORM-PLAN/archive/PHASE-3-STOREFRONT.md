# Phase 3: Storefront

**Duration**: 4 weeks
**Focus**: Multi-tenant Shopify headless storefront

---

## Required Reading Before Starting

**Planning docs location**: `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/`

| Document | Full Path |
|----------|-----------|
| INTEGRATIONS | `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/CODEBASE-ANALYSIS/INTEGRATIONS-2025-02-10.md` |
| API-ROUTES | `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/CODEBASE-ANALYSIS/API-ROUTES-2025-02-10.md` |

---

## Required Skills for This Phase

**CRITICAL**: Customer-facing UI requires high design quality.

| Skill | Usage |
|-------|-------|
| `/frontend-design` | **REQUIRED** - Production-grade storefront UI |
| Context7 MCP | Shopify Storefront API, React patterns |
| `obra/superpowers@test-driven-development` | TDD for cart and checkout flows |

### Pre-Phase Checklist
```bash
# Verify skills are installed
npx skills list | grep -E "(frontend-design|documentation-lookup|test-driven)"

# If missing, install:
npx skills add anthropics/skills@frontend-design -g -y
npx skills add upstash/context7@documentation-lookup -g -y
npx skills add obra/superpowers@test-driven-development -g -y
```

### Storefront Development Workflow
1. **Always invoke `/frontend-design`** for all storefront components
2. **ALWAYS use Shopify Dev MCP** for any Shopify API work:
   - `learn_shopify_api(api: "storefront-graphql")` - Learn Storefront API
   - `introspect_graphql_schema(query: "products")` - Explore schema
   - `validate_graphql_codeblocks(...)` - Validate queries before use
3. Use Context7 MCP to look up React/Next.js patterns
4. Focus on performance (LCP < 2.5s) and conversion-optimized UI
5. Create distinctive, brand-appropriate designs (not generic e-commerce)

### Shopify Function Pattern (Rust/WASM)

For checkout customization, follow RAWDOG's Rust pattern:
```
shopify-app/extensions/[function]-rust/
├── Cargo.toml            # shopify_function = "0.8", serde
├── src/run.rs            # Function logic
├── src/run.graphql       # Input query
└── shopify.extension.toml
```
Build: `cargo build --target=wasm32-wasip1 --release`

---

## Objectives

1. Build headless storefront using **Commerce Provider abstraction**
2. Implement Shopify provider (default) with Custom provider interface ready
3. Implement multi-tenant product/cart management
4. Port e-commerce features (reviews, bundles, A/B testing)
5. Set up attribution tracking system
6. Enable per-brand customization

### Commerce Provider Strategy

All storefront components use the `CommerceProvider` interface from `@cgk/commerce`. This enables:

- **Default**: Shopify Headless checkout (implemented in Phase 3)
- **Future**: Custom+Stripe checkout (interface ready, implementation deferred)
- **Per-tenant**: Feature flag `commerce.provider` controls which backend is active

See [COMMERCE-PROVIDER-SPEC-2025-02-10.md](./COMMERCE-PROVIDER-SPEC-2025-02-10.md) for full specification.

---

## Week 1: Storefront Foundation

### Tasks

#### [PARALLEL] Storefront App Setup
- [ ] Configure Next.js with tenant awareness
- [ ] **Integrate Commerce Provider abstraction** (supports Shopify + future Custom)
- [ ] Set up product page templates using provider interface
- [ ] Create cart management system using provider interface

#### [PARALLEL] Commerce Provider Integration
```typescript
// apps/storefront/src/lib/commerce.ts
import { createCommerceProvider } from '@cgk/commerce'
import { getTenantConfig } from './tenant'

// Cached provider instance per request
let providerPromise: Promise<CommerceProvider> | null = null

export async function getCommerceProvider() {
  if (!providerPromise) {
    providerPromise = createProvider()
  }
  return providerPromise
}

async function createProvider() {
  const tenant = await getTenantConfig()

  // Factory uses feature flag 'commerce.provider' to select backend
  // Default: Shopify, Opt-in: Custom+Stripe
  return createCommerceProvider(tenant.id, {
    type: 'auto',  // Respect feature flag
    shopifyConfig: {
      storeDomain: tenant.shopify?.storeDomain,
      storefrontToken: tenant.shopify?.storefrontToken,
      apiVersion: '2025-01',
    },
    customConfig: {
      stripePublishableKey: tenant.stripe?.publishableKey,
      // Custom provider config (used when feature flag = 'custom')
    },
  })
}

// Provider-agnostic product fetching
export async function getProduct(handle: string) {
  const commerce = await getCommerceProvider()
  return commerce.products.getByHandle(handle)
}
```

#### [PARALLEL] Provider-Agnostic Components
```typescript
// apps/storefront/src/components/product-page.tsx
import { getCommerceProvider } from '@/lib/commerce'
import type { Product } from '@cgk/commerce'

export async function ProductPage({ handle }: { handle: string }) {
  const commerce = await getCommerceProvider()
  const product = await commerce.products.getByHandle(handle)

  // Same component works with Shopify or Custom provider
  return <ProductDetails product={product} />
}
```

### Deliverables
- Product listing page
- Product detail page
- Cart with Shopify integration
- Basic checkout flow

---

## Week 2: E-Commerce Features

### Cart Attributes System

```typescript
// apps/storefront/src/lib/cart/attributes.ts
import { getTenantConfig } from '../tenant'

export interface CartAttributes {
  _tenant: string
  _visitor_id: string
  _ab_test_id?: string
  _ab_variant_id?: string
  _attribution_source?: string
  _attribution_campaign?: string
  _free_gifts?: string
}

export async function buildCartAttributes(
  existingAttributes: Record<string, string>
): Promise<CartAttributes> {
  const tenant = await getTenantConfig()
  const visitorId = getOrCreateVisitorId()

  return {
    _tenant: tenant.slug,
    _visitor_id: visitorId,
    ...existingAttributes,
  }
}
```

### Reviews Integration

```typescript
// apps/storefront/src/lib/reviews/index.ts
export async function getProductReviews(productId: string) {
  const tenant = await getTenantConfig()

  // Check if using Yotpo or internal
  if (tenant.features.yotpoEnabled) {
    return getYotpoReviews(productId, tenant.yotpo)
  }

  return getInternalReviews(productId)
}

export async function getProductRating(productId: string) {
  const tenant = await getTenantConfig()

  return withTenant(tenant.slug, async () => {
    const [rating] = await sql`
      SELECT
        COUNT(*) as count,
        AVG(rating) as average
      FROM reviews
      WHERE product_id = ${productId}
        AND status = 'approved'
    `
    return rating
  })
}
```

### Bundle Builder

```typescript
// apps/storefront/src/components/bundle-builder.tsx
'use client'

import { useState } from 'react'
import { useBundlePricing } from '@/hooks/use-bundle-pricing'

export function BundleBuilder({ products }: { products: Product[] }) {
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const { pricing, callouts } = useBundlePricing(selectedProducts)

  return (
    <div className="space-y-6">
      {/* Product selection */}
      <div className="grid grid-cols-3 gap-4">
        {products.map(product => (
          <ProductCard
            key={product.id}
            product={product}
            selected={selectedProducts.includes(product.id)}
            onToggle={() => toggleProduct(product.id)}
          />
        ))}
      </div>

      {/* Pricing summary */}
      <div className="bg-muted p-4 rounded-lg">
        <div className="text-sm text-muted-foreground">
          {callouts.subscription}
        </div>
        <div className="text-2xl font-bold">
          ${(pricing.total / 100).toFixed(2)}
        </div>
        {pricing.savings > 0 && (
          <div className="text-green-600">
            Save ${(pricing.savings / 100).toFixed(2)}
          </div>
        )}
      </div>

      {/* Add to cart */}
      <Button onClick={() => addBundleToCart(selectedProducts)}>
        Add Bundle to Cart
      </Button>
    </div>
  )
}
```

---

## Week 3: A/B Testing & Attribution

### A/B Test Assignment

```typescript
// apps/storefront/src/lib/ab-testing/assignment.ts
import { getTenantConfig } from '../tenant'
import { getVisitorId } from '../visitor'

export async function getVariantAssignment(testId: string) {
  const tenant = await getTenantConfig()
  const visitorId = getVisitorId()

  // Check for existing assignment
  const existing = await getExistingAssignment(visitorId, testId)
  if (existing) return existing

  // Get test configuration
  const test = await getActiveTest(testId, tenant.slug)
  if (!test) return null

  // Assign variant using consistent hashing
  const variantIndex = hashToIndex(visitorId + testId, test.variants.length)
  const variant = test.variants[variantIndex]

  // Store assignment
  await recordAssignment(visitorId, testId, variant.id)

  return variant
}
```

### Attribution Tracking

```typescript
// apps/storefront/src/lib/attribution/pixel.ts
export function initAttributionTracking() {
  // Capture UTM parameters
  const params = new URLSearchParams(window.location.search)
  const attribution = {
    source: params.get('utm_source'),
    medium: params.get('utm_medium'),
    campaign: params.get('utm_campaign'),
    content: params.get('utm_content'),
    term: params.get('utm_term'),
    clickId: params.get('fbclid') || params.get('gclid') || params.get('ttclid'),
  }

  // Store in cookie and session
  if (hasAttribution(attribution)) {
    storeAttribution(attribution)
    recordTouchpoint(attribution)
  }
}

export async function recordTouchpoint(data: AttributionData) {
  const visitorId = getVisitorId()
  const tenant = await getTenantSlug()

  await fetch('/api/attribution/touchpoint', {
    method: 'POST',
    body: JSON.stringify({
      visitorId,
      tenant,
      ...data,
      landingPage: window.location.pathname,
      timestamp: Date.now(),
    }),
  })
}
```

### GA4 & Meta Tracking

```typescript
// apps/storefront/src/lib/analytics/index.ts
export function trackAddToCart(product: Product, variant: Variant) {
  // GA4
  gtag('event', 'add_to_cart', {
    currency: 'USD',
    value: variant.price / 100,
    items: [{
      item_id: variant.id,
      item_name: product.title,
      price: variant.price / 100,
      quantity: 1,
    }],
  })

  // Meta Pixel
  fbq('track', 'AddToCart', {
    content_ids: [variant.id],
    content_name: product.title,
    value: variant.price / 100,
    currency: 'USD',
  })

  // TikTok Pixel
  ttq.track('AddToCart', {
    content_id: variant.id,
    content_name: product.title,
    value: variant.price / 100,
    currency: 'USD',
  })
}
```

---

## Week 4: Theming & Customization

### Per-Tenant Theming

```typescript
// apps/storefront/src/app/layout.tsx
import { getTenantConfig } from '@/lib/tenant'
import { generateThemeStyles } from '@/lib/theme'

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const tenant = await getTenantConfig()
  const themeStyles = generateThemeStyles(tenant.theme)

  return (
    <html lang="en">
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeStyles }} />
        <link rel="icon" href={tenant.faviconUrl || '/favicon.ico'} />
      </head>
      <body>
        <TenantProvider value={tenant}>
          {children}
        </TenantProvider>
      </body>
    </html>
  )
}
```

### Dynamic Landing Pages

```typescript
// apps/storefront/src/app/lp/[slug]/page.tsx
import { getLandingPage } from '@/lib/landing-pages'
import { BlockRenderer } from '@/components/blocks/renderer'

export default async function LandingPage({
  params,
}: {
  params: { slug: string }
}) {
  const page = await getLandingPage(params.slug)

  if (!page || page.status !== 'published') {
    notFound()
  }

  return (
    <main>
      {page.blocks.map(block => (
        <BlockRenderer key={block.id} block={block} />
      ))}
    </main>
  )
}
```

---

## File Structure

```
apps/storefront/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Homepage
│   │   ├── products/
│   │   │   ├── page.tsx          # Product listing
│   │   │   └── [handle]/
│   │   │       └── page.tsx      # Product detail
│   │   ├── collections/
│   │   │   └── [handle]/
│   │   │       └── page.tsx
│   │   ├── cart/
│   │   │   └── page.tsx
│   │   ├── lp/
│   │   │   └── [slug]/
│   │   │       └── page.tsx      # Landing pages
│   │   └── api/
│   │       ├── cart/
│   │       ├── attribution/
│   │       └── webhooks/
│   │
│   ├── components/
│   │   ├── product/
│   │   ├── cart/
│   │   ├── blocks/               # Landing page blocks
│   │   └── reviews/
│   │
│   ├── lib/
│   │   ├── shopify.ts
│   │   ├── tenant.ts
│   │   ├── cart/
│   │   ├── reviews/
│   │   ├── ab-testing/
│   │   ├── attribution/
│   │   └── analytics/
│   │
│   └── hooks/
│       ├── use-cart.ts
│       ├── use-bundle-pricing.ts
│       └── use-ab-test.ts
│
└── package.json
```

---

## Success Criteria

- [ ] **Commerce Provider abstraction working** (factory respects feature flag)
- [ ] Products load via provider interface (works with Shopify, ready for Custom)
- [ ] Cart persists via provider interface
- [ ] Checkout completes successfully (Shopify by default)
- [ ] **Custom checkout UI scaffolded** (ready for future Stripe integration)
- [ ] Reviews display and submit
- [ ] A/B tests assign correctly
- [ ] Attribution captures touchpoints
- [ ] Per-tenant theming works
- [ ] Landing pages render
- [ ] Mobile performance (LCP < 2.5s)
- [ ] **Feature flag `commerce.provider` toggles checkout mode** (even if Custom not fully implemented)

---

## Dependencies for Next Phase

Phase 4 (Creator Portal) requires:
- [x] Tenant configuration system
- [x] Attribution tracking working
- [x] Order webhooks processing
