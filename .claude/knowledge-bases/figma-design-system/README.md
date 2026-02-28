# Storefront Development Expert - CGK Platform

## Design Principles
1. **Tenant-Themed Components** - CSS custom properties, never hardcoded colors
2. **Block-Based Architecture** - Landing pages as JSONB config, not code
3. **Server-First Rendering** - RSC by default, `'use client'` only when needed
4. **Local DB + Shopify Fallback** - Fast product reads from PostgreSQL cache

## Figma → Deployed Workflow (5 Steps)

### Step 1: Extract Design Tokens from Figma
```bash
# Use Figma MCP to get design context
figma.get_design_context(nodeId: "123:456")
# Returns: { screenshot, code, tokens: { colors, spacing, typography } }

# Or get variable definitions
figma.get_variable_defs(nodeId: "123:456")
# Returns: { 'color/primary': '#374d42', 'spacing/base': '16px', ... }
```

**Use Figma tokens to update tenant theme**:
```typescript
// Update tenant theme in database
await sql`
  UPDATE public.organizations
  SET settings = jsonb_set(
    settings,
    '{theme}',
    ${JSON.stringify({
      primaryColor: '#374d42',     // From Figma
      secondaryColor: '#828282',   // From Figma
      fontFamily: 'Inter',         // From Figma
      baseFontSize: '16px'         // From Figma
    })}
  )
  WHERE slug = ${tenantId}
`
```

### Step 2: Build Theme-Aware Component
```tsx
// CORRECT - Use CSS custom properties
import { cn } from '@cgk-platform/ui'  // Import from main entry ONLY

export function ProductCard({ product }: { product: Product }) {
  return (
    <div className={cn(
      // Use CSS variables for theme colors
      'bg-[hsl(var(--portal-background))]',
      'border-[hsl(var(--portal-border))]',
      'hover:shadow-lg transition-all duration-normal'  // Use theme duration tokens
    )}>
      <Image
        src={product.image.url}
        alt={product.title}
        fill
        sizes="(max-width: 768px) 100vw, 50vw"  // Responsive sizes
        className="object-cover"
      />
      <h3 className="text-[hsl(var(--portal-foreground))] font-heading">
        {product.title}
      </h3>
      <p className="text-[hsl(var(--portal-muted-foreground))]">
        ${product.price}
      </p>
    </div>
  )
}

// WRONG - Hardcoded colors
<div className="bg-slate-900 text-white">  // ❌ Not tenant-themed

// WRONG - Subpath imports
import { cn } from '@cgk-platform/ui/lib/utils'  // ❌ No subpath exports
```

**Available CSS Custom Properties**:
```css
/* Light mode (default) */
--portal-primary              /* Primary brand color */
--portal-secondary            /* Secondary color */
--portal-accent               /* Accent color */
--portal-background           /* Background color */
--portal-foreground           /* Text color */
--portal-muted-foreground     /* Muted text */
--portal-border               /* Border color */
--portal-error                /* Error color */
--portal-success              /* Success color */
--portal-warning              /* Warning color */

/* Dark mode variants (auto-applied when dark mode enabled) */
--portal-dark-primary
--portal-dark-background
--portal-dark-foreground
/* ... (full set) */
```

### Step 3: Store Block Configuration (for Landing Pages)
```typescript
// Block system for landing pages
import { BlockProps } from '@/components/blocks/types'

// Define block type
interface HeroConfig {
  headline: string
  subheadline?: string
  backgroundImage?: { src: string, alt: string }
  primaryButton?: { text: string, href: string }
  secondaryButton?: { text: string, href: string }
  height?: 'compact' | 'normal' | 'tall'
  alignment?: 'left' | 'center' | 'right'
}

// Create block component
export function HeroBlock({ block, className }: BlockProps<HeroConfig>) {
  const {
    headline,
    subheadline,
    backgroundImage,
    primaryButton,
    secondaryButton,
    height = 'normal',
    alignment = 'center'
  } = block.config

  const heightClasses = {
    compact: 'h-[400px]',
    normal: 'h-[600px]',
    tall: 'h-[800px]'
  }

  return (
    <section className={cn('relative', heightClasses[height], className)}>
      {backgroundImage && (
        <Image
          src={backgroundImage.src}
          alt={backgroundImage.alt}
          fill
          className="object-cover"
        />
      )}
      <div className={cn(
        'relative z-10 flex flex-col justify-center h-full',
        {
          'items-start': alignment === 'left',
          'items-center text-center': alignment === 'center',
          'items-end text-right': alignment === 'right'
        }
      )}>
        <h1 className="text-5xl font-heading font-bold text-[hsl(var(--portal-foreground))]">
          {headline}
        </h1>
        {subheadline && (
          <p className="mt-4 text-xl text-[hsl(var(--portal-muted-foreground))]">
            {subheadline}
          </p>
        )}
        <div className="mt-8 flex gap-4">
          {primaryButton && (
            <Button asChild size="lg">
              <a href={primaryButton.href}>{primaryButton.text}</a>
            </Button>
          )}
          {secondaryButton && (
            <Button asChild variant="outline" size="lg">
              <a href={secondaryButton.href}>{secondaryButton.text}</a>
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}

// Store block config in database
await withTenant(tenantId, async () => {
  await sql`
    UPDATE landing_pages
    SET blocks = ${JSON.stringify([{
      id: 'hero_1',
      type: 'hero',
      order: 0,
      config: {
        headline: 'Welcome to Our Store',
        subheadline: 'Shop the latest products',
        backgroundImage: { src: '/hero-bg.jpg', alt: 'Hero' },
        primaryButton: { text: 'Shop Now', href: '/products' },
        height: 'tall',
        alignment: 'center'
      }
    }])}
    WHERE slug = 'home'
  `
})
```

### Step 4: Render with Tenant Context
```typescript
// apps/storefront/src/app/lp/[slug]/page.tsx
export default async function LandingPage({ params }: { params: { slug: string } }) {
  const { slug } = await params

  // Get tenant context from middleware
  const tenantSlug = await getTenantSlug()
  if (!tenantSlug) {
    return notFound()
  }

  // Get tenant config (includes theme)
  const tenantConfig = await getTenantConfig()

  // Get landing page data
  const page = await withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM landing_pages
      WHERE slug = ${slug}
      LIMIT 1
    `
    const row = result.rows[0]
    return row ? (toCamelCase(row as Record<string, unknown>) as unknown as LandingPage) : null
  })

  if (!page) {
    return notFound()
  }

  // Render blocks
  return (
    <div className="flex flex-col gap-8">
      <BlockList blocks={page.blocks} />
    </div>
  )
}

// BlockList component
function BlockList({ blocks }: { blocks: LandingPageBlock[] }) {
  const sortedBlocks = blocks.sort((a, b) => a.order - b.order)

  return (
    <>
      {sortedBlocks.map((block) => (
        <BlockRenderer key={block.id} block={block} />
      ))}
    </>
  )
}

// BlockRenderer maps block type to component
function BlockRenderer({ block }: { block: LandingPageBlock }) {
  switch (block.type) {
    case 'hero':
      return <HeroBlock block={block} />
    case 'benefits':
      return <BenefitsBlock block={block} />
    case 'faq':
      return <FAQBlock block={block} />
    case 'testimonials':
      return <TestimonialsBlock block={block} />
    case 'pricing':
      return <PricingBlock block={block} />
    // ... 70+ block types
    default:
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Unknown block type: ${block.type}`)
      }
      return null
  }
}
```

### Step 5: Deploy & Test
```bash
# Deploy to Vercel
git push → Vercel auto-deploys

# Storefront accessible at:
# - https://{tenantSlug}.cgk.com (subdomain)
# - https://www.customdomain.com (custom domain)

# Theme is injected server-side (no FOUC)
# Products pulled from local DB (fast)
# Shopify API used as fallback (cache miss)
```

## Server Component vs Client Component

### Use Server Components (Default)
```tsx
// NO 'use client' directive - this is a Server Component
import { getTenantSlug } from '@/lib/tenant'
import { sql, withTenant } from '@cgk-platform/db'

export default async function ProductsPage() {
  const tenantSlug = await getTenantSlug()

  // Server-side data fetching
  const products = await withTenant(tenantSlug, async () => {
    return sql`SELECT * FROM products ORDER BY created_at DESC LIMIT 20`
  })

  return (
    <div className="grid grid-cols-3 gap-6">
      {products.rows.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
```

### Use Client Components (When Needed)
```tsx
'use client'  // ONLY add when you need interactivity

import { useState } from 'react'
import { Button } from '@cgk-platform/ui'

export function AddToCartButton({ productId }: { productId: string }) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)

    await fetch('/api/cart/add', {
      method: 'POST',
      body: JSON.stringify({ productId })
    })

    setLoading(false)
  }

  return (
    <Button onClick={handleClick} disabled={loading}>
      {loading ? 'Adding...' : 'Add to Cart'}
    </Button>
  )
}
```

## Theme System Architecture

### Theme Injection (Server-Side)
```tsx
// apps/storefront/src/app/layout.tsx
import { getTenantConfig } from '@/lib/tenant'
import { ThemeStyles } from '@/components/theme-styles'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const config = await getTenantConfig()

  return (
    <html lang="en">
      <head>
        <ThemeStyles config={config} />  {/* Server-rendered CSS variables */}
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}

// components/theme-styles.tsx (Server Component)
export function ThemeStyles({ config }: { config: TenantConfig }) {
  const theme = config.settings.theme

  return (
    <style id="portal-theme-styles" dangerouslySetInnerHTML={{
      __html: `
        :root {
          --portal-primary: ${hexToHSL(theme.primaryColor)};
          --portal-secondary: ${hexToHSL(theme.secondaryColor)};
          --portal-accent: ${hexToHSL(theme.accentColor)};
          --portal-background: ${hexToHSL(theme.backgroundColor)};
          --portal-foreground: ${hexToHSL(theme.foregroundColor)};
          --portal-border: ${hexToHSL(theme.borderColor)};
        }

        [data-theme="dark"] {
          --portal-primary: ${hexToHSL(theme.darkPrimaryColor)};
          --portal-background: ${hexToHSL(theme.darkBackgroundColor)};
          /* ... dark mode overrides */
        }
      `
    }} />
  )
}

function hexToHSL(hex: string): string {
  // Convert #374d42 → "150 20% 26%"
  // ... conversion logic
}
```

### Dark Mode Toggle (Client Component)
```tsx
'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@cgk-platform/ui'

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const stored = localStorage.getItem('theme') as 'light' | 'dark' | null
    if (stored) {
      setTheme(stored)
      document.documentElement.setAttribute('data-theme', stored)
    }
  }, [])

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    localStorage.setItem('theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme}>
      {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
    </Button>
  )
}
```

## Product Data Flow

### Query Products from Local DB (Fast)
```typescript
import { sql, withTenant } from '@cgk-platform/db'

async function getProducts(tenantSlug: string, limit = 20) {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id,
        title,
        description,
        handle,
        price_cents,
        currency,
        image_url,
        image_alt
      FROM products
      WHERE status = 'active'
      ORDER BY created_at DESC
      LIMIT ${limit}
    `

    return result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      handle: row.handle,
      price: row.price_cents / 100,
      currency: row.currency,
      image: {
        url: row.image_url,
        alt: row.image_alt
      }
    }))
  })
}
```

### Fallback to Shopify (Cache Miss)
```typescript
import { getShopifyStorefrontClient } from '@cgk-platform/shopify'

async function getProductByHandle(tenantSlug: string, handle: string) {
  // Try local DB first
  const cached = await withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM products WHERE handle = ${handle} LIMIT 1
    `
    return result.rows[0] || null
  })

  if (cached) {
    return mapProductFromDB(cached)
  }

  // Fallback to Shopify
  const storefront = await getShopifyStorefrontClient(tenantSlug)
  if (!storefront) return null

  const query = `
    query GetProduct($handle: String!) {
      productByHandle(handle: $handle) {
        id
        title
        description
        handle
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
        images(first: 5) {
          edges {
            node {
              url
              altText
            }
          }
        }
      }
    }
  `

  const response = await storefront.request(query, { variables: { handle } })
  const data = await response.json()

  return data.data.productByHandle
}
```

## Block System Patterns

### Available Block Types (70+)
```typescript
// apps/storefront/src/components/blocks/types.ts
export type BlockType =
  | 'hero'
  | 'benefits'
  | 'testimonials'
  | 'faq'
  | 'pricing'
  | 'cta'
  | 'features'
  | 'team'
  | 'stats'
  | 'blog-posts'
  | 'products'
  | 'video'
  | 'image-gallery'
  | 'form'
  | 'newsletter'
  // ... 50+ more

export interface LandingPageBlock {
  id: string
  type: BlockType
  order: number
  config: Record<string, any>  // Block-specific config
}

export interface BlockProps<TConfig = Record<string, any>> {
  block: LandingPageBlock & { config: TConfig }
  className?: string
}
```

### Create New Block Type
```typescript
// 1. Define config interface
interface TestimonialsConfig {
  headline?: string
  testimonials: Array<{
    quote: string
    author: string
    role: string
    avatar?: string
  }>
  layout?: 'grid' | 'carousel'
}

// 2. Create block component
export function TestimonialsBlock({ block, className }: BlockProps<TestimonialsConfig>) {
  const { headline, testimonials, layout = 'grid' } = block.config

  return (
    <section className={cn('py-16', className)}>
      {headline && (
        <h2 className="text-4xl font-heading font-bold text-center mb-12">
          {headline}
        </h2>
      )}

      <div className={cn(
        layout === 'grid' && 'grid grid-cols-1 md:grid-cols-3 gap-8',
        layout === 'carousel' && 'flex overflow-x-auto gap-6'
      )}>
        {testimonials.map((testimonial, i) => (
          <div key={i} className="bg-[hsl(var(--portal-background))] border border-[hsl(var(--portal-border))] p-6 rounded-lg">
            <p className="text-[hsl(var(--portal-muted-foreground))] italic mb-4">
              "{testimonial.quote}"
            </p>
            <div className="flex items-center gap-3">
              {testimonial.avatar && (
                <Image
                  src={testimonial.avatar}
                  alt={testimonial.author}
                  width={40}
                  height={40}
                  className="rounded-full"
                />
              )}
              <div>
                <p className="font-semibold text-[hsl(var(--portal-foreground))]">
                  {testimonial.author}
                </p>
                <p className="text-sm text-[hsl(var(--portal-muted-foreground))]">
                  {testimonial.role}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// 3. Register in BlockRenderer
function BlockRenderer({ block }: { block: LandingPageBlock }) {
  switch (block.type) {
    // ... existing cases
    case 'testimonials':
      return <TestimonialsBlock block={block} />
    // ...
  }
}
```

## Common Gotchas
1. **Importing from @cgk-platform/ui subpaths** → Use main entry only
2. **Hardcoding colors instead of CSS variables** → Use `hsl(var(--portal-primary))`
3. **Forgetting withTenant() wrapper** → All queries MUST be wrapped
4. **Using sql.unsafe()** → Doesn't exist in @vercel/postgres
5. **Not optimizing images** → Use Next.js `<Image>` with `sizes` prop
6. **Client components for static content** → Use RSC by default
7. **Type mismatches in toCamelCase** → Cast through `unknown`: `as unknown as Type`
8. **Missing 'use client' for interactivity** → useState/onClick require client component
9. **FOUC (Flash of Unstyled Content)** → Inject theme CSS in layout.tsx (server-side)
10. **Block config not validated** → Add runtime validation with Zod

## Decision Tree
```
Component needs interactivity (state, events)?
  ├─ Yes → Add 'use client' directive at top
  └─ No  → Keep as server component (RSC)

Which Shopify API?
  ├─ Backend operation (orders, inventory, bulk)? → Admin API
  ├─ Customer-facing (product display, cart)? → Storefront API
  └─ Webhook event? → Verify HMAC, trigger background job

Block or standalone component?
  ├─ Part of landing page? → Create as block with BlockProps<ConfigType>
  ├─ Reusable across pages? → Create in src/components/
  └─ App-level layout? → Add to src/app/layout.tsx

Query products from?
  ├─ Fast read (listing, search)? → Local DB (withTenant() + sql)
  ├─ Real-time inventory? → Shopify Storefront API
  └─ Admin operation? → Shopify Admin API

Tenant detection?
  ├─ Subdomain (rawdog.cgk.com)? → Extract from request.headers.host
  ├─ Custom domain (www.customdomain.com)? → Query domain_mappings table
  └─ API route? → Get from JWT token metadata
```

## Image Optimization

### Next.js Image Component
```tsx
import Image from 'next/image'

// Always use Next.js Image component
<Image
  src={product.image.url}
  alt={product.image.alt || product.title}
  fill  // Or width/height
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  className="object-cover"
  priority={isAboveFold}  // For LCP images
/>

// Shopify CDN images can be resized
const optimizedUrl = `${product.image.url}?width=800&height=600&crop=center`
```

### Responsive Sizes
```tsx
// Product grid
sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"

// Hero image
sizes="100vw"

// Thumbnail
sizes="150px"

// Blog post featured image
sizes="(max-width: 768px) 100vw, 800px"
```

## References
- Storefront app: `/apps/storefront/`
- Theme system: `/apps/storefront/src/lib/theme/`
- Block system: `/apps/storefront/src/components/blocks/`
- Tenant context: `/apps/storefront/src/lib/tenant.ts`
- Commerce provider: `/apps/storefront/src/lib/commerce.ts`
- Product queries: `/apps/storefront/src/lib/products-db.ts`
- UI library: `/packages/ui/`
- Shopify client: `/packages/shopify/`

---

*This skill ensures Figma designs become production-ready storefronts with tenant theming and optimal performance.*
