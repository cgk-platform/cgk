# Mock Products System

This document describes the mock/fallback product data system for when Shopify GraphQL isn't available.

## Overview

The storefront includes a comprehensive mock product system that displays realistic product data with real images when the Shopify connection isn't available. This allows the storefront to function independently for development, demos, and testing.

## Files

### `/src/lib/mock-products.ts`

Main mock products data file containing:

- 8 realistic products (SleeperSaver Pro, Classic Sleeper, Flex Sleeper, etc.)
- Realistic pricing ($49.99 - $199.99)
- Sale pricing on select products
- Full product details including descriptions, variants, and options
- Real images from `/public/assets/`

**Available Functions:**

- `getMockProducts(count?)` - Get all or subset of mock products
- `getMockProductByHandle(handle)` - Get single product by handle
- `getMockProductsSimplified(count)` - Get simplified products for list views

### `/src/app/api/products/route.ts`

Products list API with automatic fallback:

1. Tries to fetch from Shopify
2. On failure, returns mock products
3. Adds `mock: true` flag to response

### `/src/app/api/products/[handle]/route.ts`

Product detail API with automatic fallback:

1. Tries to fetch from Shopify
2. On failure, looks up mock product by handle
3. Returns 404 if handle doesn't match any mock product

### `/src/components/DemoModeBadge.tsx`

Visual indicator component:

- Checks if API is returning mock data
- Displays badge in bottom-left corner when in demo mode
- Shows "🎨 Demo Mode - Using mock product data" message

## Mock Products

### Available Products

| Handle                    | Name                    | Price   | Sale Price | Sizes                          |
| ------------------------- | ----------------------- | ------- | ---------- | ------------------------------ |
| `sleepersaver-pro`        | SleeperSaver Pro        | $149.99 | $199.99    | Queen, Full                    |
| `classic-sleeper-support` | Classic Sleeper Support | $99.99  | -          | Queen, Full, Twin              |
| `flex-sleeper-support`    | Flex Sleeper Support    | $129.99 | -          | Queen, Full                    |
| `premium-support-board`   | Premium Support Board   | $179.99 | $229.99    | Queen (Standard/Extra Support) |
| `comfort-plus-board`      | Comfort Plus Board      | $79.99  | -          | Full, Twin                     |
| `elite-sleeper-pro`       | Elite Sleeper Pro       | $199.99 | -          | Queen                          |
| `standard-support`        | Standard Support        | $59.99  | -          | Full, Twin                     |
| `deluxe-support-board`    | Deluxe Support Board    | $159.99 | $189.99    | Queen, Full                    |

### Product Images

All mock products use real images from `/public/assets/`:

- `sleepersaver-thumb.webp` - Primary product image
- `classic-sleeper-thumb.webp` - Secondary product image
- `flex-sleeper-thumb.webp` - Tertiary product image
- `grey-gold-living-room.webp` - Lifestyle image
- `product-display.webp` - Detail image

## Usage

### Automatic Fallback

The system works automatically. No code changes required in components:

```tsx
// This code works with both real Shopify data and mock data
const response = await fetch('/api/products')
const data = await response.json()

// Check if using mock data (optional)
if (data.mock) {
  console.log('Demo mode active')
}

// Use products normally
data.data.forEach((product) => {
  console.log(product.title, product.priceRange.minVariantPrice.amount)
})
```

### Checking Demo Mode

Components can check if mock data is being used:

```tsx
const response = await fetch('/api/products?first=1')
const data = await response.json()

if (data.mock === true) {
  // Show demo mode indicator
  console.log('Running in demo mode')
}
```

### Direct Access to Mock Data

For testing or development, you can import mock data directly:

```tsx
import { getMockProducts, getMockProductByHandle } from '@/lib/mock-products'

// Get all mock products
const products = getMockProducts()

// Get specific product
const product = getMockProductByHandle('sleepersaver-pro')
```

## Console Messages

When mock data is active, you'll see these console messages:

```
⚠️  Shopify connection not available, using mock data: [error]
🎨 Demo Mode: Displaying mock products with real images
```

Or for individual products:

```
⚠️  Shopify connection not available, trying mock data: [error]
🎨 Demo Mode: Displaying mock product "SleeperSaver Pro"
```

## Visual Indicator

The `DemoModeBadge` component automatically displays in the bottom-left corner when mock data is active:

```
┌─────────────────────────────┐
│ 🎨 Demo Mode                │
│    Using mock product data  │
└─────────────────────────────┘
```

## Adding New Mock Products

To add new mock products:

1. Open `/src/lib/mock-products.ts`
2. Add new product object to `MOCK_PRODUCTS` array
3. Use existing images from `/public/assets/` or add new ones
4. Follow the TypeScript interface for proper structure

Example:

```typescript
{
  id: 'gid://shopify/Product/mock-9',
  title: 'New Product Name',
  handle: 'new-product-name',
  description: 'Product description...',
  descriptionHtml: '<p>HTML description...</p>',
  priceRange: {
    minVariantPrice: {
      amount: '99.99',
      currencyCode: 'USD',
    },
  },
  featuredImage: {
    url: '/assets/your-image.webp',
    altText: 'New Product Name',
    width: 800,
    height: 800,
  },
  // ... variants, options, etc.
}
```

## Testing

### Test with Mock Data

To test the mock data system without Shopify:

1. Ensure Shopify credentials are not configured or invalid
2. Start the dev server: `pnpm dev`
3. Visit `http://localhost:3000`
4. Products should load from mock data
5. Demo badge should appear in bottom-left corner

### Test with Real Shopify Data

To test with real Shopify:

1. Configure valid Shopify credentials in database
2. Start the dev server: `pnpm dev`
3. Visit `http://localhost:3000`
4. Products should load from Shopify
5. No demo badge should appear

## Benefits

1. **Development without Shopify** - Work on the storefront without needing Shopify credentials
2. **Demos and screenshots** - Show realistic product data for presentations
3. **Testing** - Test UI with known product data
4. **Offline mode** - Storefront works even if Shopify is down
5. **Fast prototyping** - Quickly test new features with local data

## Limitations

- Mock products don't support:
  - Add to cart functionality (requires real Shopify)
  - Checkout (requires real Shopify)
  - Inventory management
  - Dynamic pricing updates
  - Product search/filtering by real attributes

- For full functionality, connect to Shopify

## Real Images

All mock products use real product images from the Meliusly brand:

- Professional product photography
- Lifestyle images
- Detail shots
- Optimized WebP format
- Proper dimensions for both list and detail views

This ensures the mock data looks professional and realistic for demos and development.
