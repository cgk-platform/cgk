# Featured Products Integration Guide

This guide shows how to extend the existing `HeaderWrapper` component to fetch and display featured products in the mega menu dropdowns.

## Current Implementation

The `HeaderWrapper.tsx` currently fetches menu structure from Shopify:

```typescript
// Current: HeaderWrapper.tsx
const menu = await getMenu(client, 'new-menu')
if (menu) {
  menuItems = menu.items.map(mapMenuItem)
}
```

## Enhanced Implementation

### Step 1: Extend MenuItem Type

The `MenuItem` type in `MegaMenu.tsx` already supports `featuredProducts`:

```typescript
export interface MenuItem {
  id: string
  title: string
  url: string
  items: MenuItem[]
  featuredProducts?: MegaMenuProduct[] // Already defined!
}
```

### Step 2: Create Product Fetcher

Add this function to `HeaderWrapper.tsx` or create a new file `lib/shopify/featured-products.ts`:

```typescript
import { createStorefrontClient } from '@cgk-platform/shopify'
import type { MegaMenuProduct } from '@/components/navigation/MegaMenuProductCard'

const FEATURED_PRODUCTS_QUERY = `#graphql
  query FeaturedProducts($handle: String!, $first: Int!) {
    collection(handle: $handle) {
      products(first: $first, sortKey: BEST_SELLING) {
        nodes {
          id
          title
          handle
          description
          tags
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          featuredImage {
            url
            altText
          }
        }
      }
    }
  }
`

export async function fetchFeaturedProducts(
  client: ReturnType<typeof createStorefrontClient>,
  collectionHandle: string,
  limit: number = 3
): Promise<MegaMenuProduct[]> {
  try {
    const response = await client.query<{
      collection: {
        products: {
          nodes: Array<{
            id: string
            title: string
            handle: string
            description: string
            tags: string[]
            priceRange: {
              minVariantPrice: {
                amount: string
                currencyCode: string
              }
            }
            featuredImage: {
              url: string
              altText: string | null
            } | null
          }>
        }
      } | null
    }>(FEATURED_PRODUCTS_QUERY, {
      variables: { handle: collectionHandle, first: limit },
    })

    if (!response.collection) return []

    return response.collection.products.nodes.map((product) => ({
      title: product.title,
      description: product.description.substring(0, 120), // Truncate for card
      price: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: product.priceRange.minVariantPrice.currencyCode,
      }).format(Number.parseFloat(product.priceRange.minVariantPrice.amount)),
      handle: product.handle,
      image: {
        url: product.featuredImage?.url || '/placeholder-product.png',
        alt: product.featuredImage?.altText || product.title,
      },
      badge: product.tags.includes('best-seller') ? 'BEST SELLER' : undefined,
    }))
  } catch (error) {
    console.error(`Failed to fetch featured products for ${collectionHandle}:`, error)
    return []
  }
}
```

### Step 3: Update HeaderWrapper

Modify `HeaderWrapper.tsx` to fetch featured products:

```typescript
export async function HeaderWrapper(props: HeaderWrapperProps) {
  let menuItems: MenuItem[] = []

  const config = await getTenantConfig()
  if (config?.shopify) {
    try {
      const client = createStorefrontClient({
        storeDomain: config.shopify.storeDomain,
        storefrontAccessToken: config.shopify.storefrontAccessToken,
      })

      const menu = await getMenu(client, 'new-menu')
      if (menu) {
        // Map menu items and fetch featured products in parallel
        menuItems = await Promise.all(
          menu.items.map(async (item) => {
            const mapped = mapMenuItem(item)

            // Only fetch products for collection URLs
            if (item.url.includes('/collections/')) {
              const collectionHandle = item.url.split('/').pop()
              if (collectionHandle) {
                mapped.featuredProducts = await fetchFeaturedProducts(
                  client,
                  collectionHandle,
                  3 // Show 3 products per dropdown
                )
              }
            }

            return mapped
          })
        )
      }
    } catch (error) {
      console.error('Failed to fetch navigation menu:', error)
    }
  }

  return <StorefrontHeader {...props} menuItems={menuItems} />
}
```

## Optimization Strategies

### 1. Cache Featured Products

Use Next.js cache to avoid re-fetching on every request:

```typescript
import { cache } from 'react'

export const fetchFeaturedProducts = cache(
  async (
    client: ReturnType<typeof createStorefrontClient>,
    collectionHandle: string,
    limit: number = 3
  ): Promise<MegaMenuProduct[]> => {
    // ... same implementation
  }
)
```

### 2. Parallel Fetching

The `Promise.all` approach already fetches products in parallel for all menu items.

### 3. Error Boundaries

Wrap the mega menu in an error boundary to gracefully handle fetch failures:

```tsx
import { ErrorBoundary } from 'react-error-boundary'

function HeaderErrorFallback() {
  return (
    <nav>
      <Link href="/">Home</Link>
      <Link href="/products">Shop All</Link>
    </nav>
  )
}

export function HeaderWithBoundary(props: HeaderWrapperProps) {
  return (
    <ErrorBoundary fallback={<HeaderErrorFallback />}>
      <HeaderWrapper {...props} />
    </ErrorBoundary>
  )
}
```

## Shopify Tags Strategy

### Tag Featured Products in Shopify Admin

To control which products appear as "BEST SELLER":

1. In Shopify Admin, go to Products
2. Edit a product
3. Add tag: `best-seller`
4. Save product

The integration automatically checks for this tag and displays the badge.

### Other Useful Tags

```typescript
// Extend badge logic:
badge: product.tags.includes('best-seller')
  ? 'BEST SELLER'
  : product.tags.includes('new-arrival')
    ? 'NEW'
    : product.tags.includes('limited-edition')
      ? 'LIMITED'
      : undefined
```

## Collection Handle Mapping

### Common Patterns

```typescript
// URL -> Collection Handle extraction
'/collections/sleeper-sofa-support' -> 'sleeper-sofa-support'
'/collections/sofa-support' -> 'sofa-support'
'/collections/bed-support' -> 'bed-support'
```

### Handle Edge Cases

```typescript
function extractCollectionHandle(url: string): string | null {
  try {
    const urlObj = new URL(url, 'https://example.com') // Base URL for parsing
    const parts = urlObj.pathname.split('/')
    const collectionsIndex = parts.indexOf('collections')

    if (collectionsIndex !== -1 && parts[collectionsIndex + 1]) {
      return parts[collectionsIndex + 1]
    }

    return null
  } catch {
    return null
  }
}
```

## Testing

### Local Testing with Sample Data

1. Use the sample data in `/apps/storefront/src/lib/sample-mega-menu-data.ts`
2. Test the UI with mock products
3. Verify hover states, keyboard navigation, accessibility

### Testing with Shopify Sandbox

1. Create a Shopify development store
2. Add 3+ products to a collection
3. Tag one product with `best-seller`
4. Verify products appear in dropdown
5. Verify badge appears on tagged product

## Performance Benchmarks

Expected performance with featured products:

- **Initial Page Load**: +50-100ms (3 collections × 3 products)
- **Cached Load**: <10ms (React cache hit)
- **Dropdown Open**: <16ms (no data fetching, already loaded)

Monitor with:

```typescript
console.time('menu-fetch')
const menuItems = await fetchMenuWithProducts()
console.timeEnd('menu-fetch')
```

## Accessibility Considerations

### Product Card Focus Order

Products should be focusable in reading order (left-to-right, top-to-bottom):

```tsx
// Already handled by grid layout
<div className="grid gap-6 md:grid-cols-3">{/* Natural focus order: 1, 2, 3 */}</div>
```

### Screen Reader Announcements

When dropdown opens with products:

```tsx
<div role="region" aria-label="Featured Products">
  {/* Products here */}
</div>
```

## Complete Example

Here's the full updated `HeaderWrapper.tsx`:

```typescript
/**
 * Header Wrapper (Server Component)
 *
 * Fetches navigation menu and featured products from Shopify Storefront API.
 */

import { cache } from 'react'
import { createStorefrontClient, getMenu } from '@cgk-platform/shopify'
import type { ShopifyMenuItem } from '@cgk-platform/shopify'

import { getTenantConfig } from '@/lib/tenant'
import { StorefrontHeader } from './StorefrontHeader'
import type { MenuItem } from './MegaMenu'
import type { MegaMenuProduct } from '../navigation/MegaMenuProductCard'

interface HeaderWrapperProps {
  storeName: string
  tenantSlug: string
  theme: {
    tenantId: string
    logoUrl: string | null
    logoHeight: number
    darkModeEnabled: boolean
  }
  logoComponent?: React.ReactNode
  darkModeToggle?: React.ReactNode
}

const FEATURED_PRODUCTS_QUERY = `#graphql
  query FeaturedProducts($handle: String!, $first: Int!) {
    collection(handle: $handle) {
      products(first: $first, sortKey: BEST_SELLING) {
        nodes {
          id
          title
          handle
          description
          tags
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          featuredImage {
            url
            altText
          }
        }
      }
    }
  }
`

const fetchFeaturedProducts = cache(
  async (
    client: ReturnType<typeof createStorefrontClient>,
    collectionHandle: string,
    limit: number = 3
  ): Promise<MegaMenuProduct[]> => {
    try {
      const response = await client.query(FEATURED_PRODUCTS_QUERY, {
        variables: { handle: collectionHandle, first: limit },
      })

      if (!response.collection) return []

      return response.collection.products.nodes.map((product: any) => ({
        title: product.title,
        description: product.description.substring(0, 120),
        price: new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: product.priceRange.minVariantPrice.currencyCode,
        }).format(Number.parseFloat(product.priceRange.minVariantPrice.amount)),
        handle: product.handle,
        image: {
          url: product.featuredImage?.url || '/placeholder-product.png',
          alt: product.featuredImage?.altText || product.title,
        },
        badge: product.tags.includes('best-seller') ? 'BEST SELLER' : undefined,
      }))
    } catch (error) {
      console.error(`Failed to fetch featured products for ${collectionHandle}:`, error)
      return []
    }
  }
)

export async function HeaderWrapper(props: HeaderWrapperProps) {
  let menuItems: MenuItem[] = []

  const config = await getTenantConfig()
  if (config?.shopify) {
    try {
      const client = createStorefrontClient({
        storeDomain: config.shopify.storeDomain,
        storefrontAccessToken: config.shopify.storefrontAccessToken,
      })

      const menu = await getMenu(client, 'new-menu')
      if (menu) {
        menuItems = await Promise.all(
          menu.items.map(async (item) => {
            const mapped = mapMenuItem(item)

            if (item.url.includes('/collections/')) {
              const collectionHandle = item.url.split('/').pop()
              if (collectionHandle) {
                mapped.featuredProducts = await fetchFeaturedProducts(client, collectionHandle, 3)
              }
            }

            return mapped
          })
        )
      }
    } catch (error) {
      console.error('Failed to fetch navigation menu:', error)
    }
  }

  return <StorefrontHeader {...props} menuItems={menuItems} />
}

function mapMenuItem(item: ShopifyMenuItem): MenuItem {
  return {
    id: item.id,
    title: item.title,
    url: item.url,
    items: item.items.map((child) => ({
      id: child.id,
      title: child.title,
      url: child.url,
      items: child.items.map((grandchild) => ({
        id: grandchild.id,
        title: grandchild.title,
        url: grandchild.url,
        items: [],
      })),
    })),
  }
}
```

## Next Steps

1. Copy the `fetchFeaturedProducts` function to your codebase
2. Update `HeaderWrapper.tsx` with the enhanced implementation
3. Test with Shopify sandbox store
4. Add performance monitoring
5. Deploy to production

## Questions?

Refer to:

- `/apps/storefront/MEGA-MENU-IMPLEMENTATION.md` - Implementation details
- `/apps/storefront/MEGA-MENU-DESIGN-PARITY.md` - Design specifications
- `/apps/storefront/src/lib/sample-mega-menu-data.ts` - Data structure examples
