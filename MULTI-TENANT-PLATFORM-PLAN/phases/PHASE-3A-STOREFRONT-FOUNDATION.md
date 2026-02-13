# PHASE-3A: Storefront Foundation

> **STATUS**: ✅ COMPLETE (2026-02-13)

**Status**: ✅ COMPLETE (2026-02-11)

**Duration**: 1 week (Week 11)
**Depends On**: PHASE-1D-PACKAGES (Commerce Provider interface), PHASE-2PO-FLAGS (Feature flags)
**Parallel With**: None
**Blocks**: PHASE-3B-STOREFRONT-CART, PHASE-3C-STOREFRONT-FEATURES, PHASE-3D-STOREFRONT-THEMING

---

## ⚠️ MANDATORY: Tenant Isolation

**READ FIRST**: [TENANT-ISOLATION.md](../TENANT-ISOLATION.md)

Storefront is tenant-scoped via subdomain/domain detection. Key requirements:
- Middleware detects tenant from domain and sets `x-tenant-id` header
- Product queries ONLY return products from current tenant's local DB
- Cart data stored in tenant-prefixed Redis keys
- Never expose tenant A's products on tenant B's storefront

---

## Goal

Build the multi-tenant storefront app foundation with Commerce Provider integration, enabling product pages to work seamlessly with Shopify (default) while being ready for future Custom+Stripe provider.

**Key Architecture Decision**: Products are synced from Shopify to a local PostgreSQL database during onboarding. The Commerce Provider reads from the local DB for fast page loads, with webhook-driven real-time sync. See [DOMAIN-SHOPIFY-CONFIG-SPEC](../DOMAIN-SHOPIFY-CONFIG-SPEC-2025-02-10.md) for complete product sync specification.

---

## Success Criteria

- [x] Storefront app scaffolded with tenant-aware Next.js configuration
- [x] Commerce Provider factory integrated and respecting `commerce.provider` feature flag
- [x] **Product reads from LOCAL PostgreSQL database (not Shopify API on every request)**
- [x] Product listing page renders products from local DB with < 100ms query time
- [x] Product detail page displays full product info with variants from local DB
- [x] Provider-agnostic components work identically with Shopify (Custom ready)
- [x] Full-text search queries local DB
- [x] Fallback to Shopify API if product not in local DB (race condition handling)
- [x] `npx tsc --noEmit` passes

---

## Deliverables

### Storefront App Setup
- `apps/storefront/` Next.js app with tenant awareness
- Middleware for tenant detection (subdomain or custom domain)
- Root layout with tenant context provider
- Homepage placeholder

### Commerce Provider Integration
- `apps/storefront/src/lib/commerce.ts` - Cached provider instance per request
- Factory usage with `type: 'auto'` to respect feature flag
- `getCommerceProvider()` async function for server components
- `useCommerceProvider()` hook for client components

### Local Product Database (Tenant Schema)
- `products` table with Shopify sync fields (see DOMAIN-SHOPIFY-CONFIG-SPEC)
- Full-text search index on title + description
- Indexes for handle, status, vendor, product_type
- JSONB columns for variants, images, options

### Shopify Client (Fallback Only)
- GraphQL client with Storefront API token authentication
- Used ONLY for:
  - Initial product sync (during onboarding)
  - Fallback when product not in local DB
  - Cart/checkout operations (not stored locally)
- Type mappers from Shopify types to unified Commerce types

### Commerce Provider Product Operations
- `getByHandle()` - Query local DB first, fallback to Shopify API
- `list()` - Query local DB with pagination
- `search()` - Full-text search on local DB
- `getByIds()` - Batch query local DB

### Product Pages
- `/products` - Product listing with pagination
- `/products/[handle]` - Product detail page
- `/collections/[handle]` - Collection page

### Provider-Agnostic Components
- `ProductCard` - Reusable product card
- `ProductGallery` - Image gallery with thumbnails
- `VariantSelector` - Option selection (size, color, etc.)
- `PriceDisplay` - Price with compare-at support
- All components consume unified `Product` type, not Shopify-specific types

---

## Constraints

- All product fetching MUST go through Commerce Provider, never direct Shopify calls in components
- Components MUST use unified types from `@cgk-platform/commerce`, not provider-specific types
- Feature flag `commerce.provider` controls backend selection - default is `shopify`
- Mobile-first responsive design (390px and 1440px breakpoints)
- Target LCP < 2.5s for product pages

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - REQUIRED for ALL storefront UI (customer-facing = high design bar)

**MCPs to consult:**
- Shopify Dev MCP: `learn_shopify_api(api: "storefront-graphql")` for Storefront API
- Shopify Dev MCP: `introspect_graphql_schema(query: "products")` for product queries
- Shopify Dev MCP: `validate_graphql_codeblocks(...)` before committing any GraphQL
- Context7 MCP: React Server Components patterns, Next.js 14+ app router

**RAWDOG code to reference:**
- `src/lib/shopify/` - Existing Shopify client patterns
- `src/app/products/` - Product page structure
- `src/components/products/` - Product component patterns

**Spec documents:**
- `COMMERCE-PROVIDER-SPEC-2025-02-10.md` - Full Commerce Provider interface and factory pattern
- `CODEBASE-ANALYSIS/INTEGRATIONS-2025-02-10.md` - Shopify integration patterns
- `FRONTEND-DESIGN-SKILL-GUIDE.md` - Skill invocation patterns

---

## Frontend Design Skill Integration

**CRITICAL**: Storefront is customer-facing. Design quality DIRECTLY impacts conversion rates. Every UI component MUST go through `/frontend-design`.

### Why Storefront Design Matters More

- **Conversion impact**: Poor UX = lost sales
- **Trust signals**: Professional design builds customer confidence
- **Mobile-first**: Most e-commerce traffic is mobile
- **Accessibility**: Required for compliance and user experience
- **Performance**: Design choices affect loading perception

### Component-Specific Skill Prompts

**1. Product Card (Grid Item):**
```
/frontend-design

Building ProductCard component for storefront (PHASE-3A-STOREFRONT-FOUNDATION).

Requirements:
- Used in product grids (collections, search results, recommendations)
- Image container:
  - Square aspect ratio with object-cover
  - Hover effect: subtle zoom or second image reveal
  - Sale badge overlay (top-left corner) if compare-at price exists
  - "Out of Stock" overlay if unavailable
  - Wishlist/favorite button (top-right, appears on hover)
- Product info below image:
  - Title (1-2 lines max, truncate with ellipsis)
  - Vendor name (optional, smaller text)
  - Price display:
    - Regular price OR
    - Sale price (bold) + compare-at (strikethrough)
- Actions:
  - Quick add button (if single variant)
  - "Select Options" button (if multiple variants)

Layout:
- Card should work in 2, 3, or 4 column grids
- Minimum touch target 44px for mobile buttons

Design constraints:
- Using unified Product type from @cgk-platform/commerce (not Shopify-specific)
- Must handle missing images gracefully (placeholder)
- Accessible: keyboard focus states, alt text

User context:
- Customers browsing products
- Quick scanning to find items of interest
- May be on slow connections (optimize image loading)
```

**2. Product Detail Page (PDP):**
```
/frontend-design

Building Product Detail Page layout for storefront (PHASE-3A-STOREFRONT-FOUNDATION).

Requirements:
- Image Gallery section:
  - Main large image (zoomable on click/hover)
  - Thumbnail strip below or beside (click to change main)
  - Mobile: swipeable carousel
  - Support for multiple images and video

- Product Info section:
  - Vendor name (link to collection)
  - Product title (H1)
  - Rating stars + review count (click to scroll to reviews)
  - Price block:
    - Current price (large)
    - Compare-at price if on sale (strikethrough)
    - Subscription option price if available
  - Variant selectors:
    - Size: buttons or dropdown
    - Color: swatches (show color visually)
    - Clear indication of selected variant
  - Quantity selector (+/- buttons with input)
  - Add to Cart button (large, prominent, full-width on mobile)
  - Buy Now / Express checkout options
  - Stock status: "In Stock", "Low Stock", "Out of Stock"

- Description section:
  - Expandable accordion or tabs
  - Rich text content support
  - Ingredient lists, usage instructions, etc.

- Trust signals:
  - Shipping info
  - Return policy
  - Payment icons

Layout:
- Desktop: 2 columns (gallery left, info right)
- Mobile: single column (gallery top, info below)

Design constraints:
- LCP < 2.5s (lazy load below-fold content)
- Add to Cart should be visible without scrolling on desktop
- Sticky "Add to Cart" bar on mobile when scrolled past button
```

**3. Variant Selector:**
```
/frontend-design

Building VariantSelector component for storefront (PHASE-3A-STOREFRONT-FOUNDATION).

Requirements:
- Handles different option types:
  - Size: Button group (S, M, L, XL, etc.)
  - Color: Color swatches with visual color + name tooltip
  - Material/Other: Dropdown select
- States:
  - Available: Normal interactive state
  - Selected: Highlighted (bold border, checkmark, or filled)
  - Unavailable: Grayed out, strikethrough, but still visible
- When variant combination is selected:
  - Update price display
  - Update stock status
  - Update product image (if variant has unique image)
- Accessibility:
  - Keyboard navigable
  - Screen reader announces option values

Design:
- Clean, easy to tap on mobile (44px minimum)
- Color swatches should show actual color (not just name)
- Clear visual hierarchy
```

**4. Price Display:**
```
/frontend-design

Building PriceDisplay component for storefront (PHASE-3A-STOREFRONT-FOUNDATION).

Requirements:
- Display modes:
  - Regular price only
  - Sale price + compare-at (strikethrough)
  - Price range (for products with variant prices)
  - Subscription price (e.g., "$25/month")
- Formatting:
  - Currency symbol (from store locale)
  - Proper decimal handling
- Visual treatment:
  - Sale price should be visually distinct (different color or bold)
  - "Save X%" badge option
  - Subscription indicator (icon or label)

Props:
- price: number
- compareAtPrice?: number
- isSubscription?: boolean
- subscriptionInterval?: string
- currencyCode: string
```

### Storefront Design Principles

When invoking `/frontend-design` for storefront components, ALWAYS include:

1. **Conversion context**: "This is on a customer-facing e-commerce page"
2. **Mobile-first requirement**: "Must work at 390px width"
3. **Performance note**: "Consider loading state and lazy loading"
4. **Trust emphasis**: "Should build customer confidence"
5. **Accessibility requirement**: "Must meet WCAG 2.1 AA"

### Workflow for Storefront UI

1. **Invoke `/frontend-design`** with detailed context (see prompts above)
2. **Use Shopify Dev MCP** to validate any GraphQL operations
3. **Map types correctly**: Shopify types → unified Commerce types → component props
4. **Test on real products**: Use varied test data (long titles, missing images, etc.)
5. **Performance audit**: Check Lighthouse for each major page
6. **Cross-browser check**: Safari, Chrome, Firefox at minimum

---

## AI Discretion Areas

The implementing agent should determine the best approach for:
1. GraphQL query organization (single file vs. per-entity files)
2. Caching strategy for product data (React cache, unstable_cache, or request-level)
3. Error boundary placement for failed product fetches
4. Image optimization strategy (Shopify CDN transforms vs. Next.js Image)
5. Skeleton/loading state design for product pages

---

## Tasks

### [PARALLEL] Storefront App Scaffold
- [x] Create `apps/storefront/` Next.js app with TypeScript
- [x] Configure middleware for tenant detection
- [x] Set up root layout with tenant context
- [x] Add homepage placeholder

### [PARALLEL] Local Product Database
- [x] Verify tenant `products` table exists (created during onboarding)
- [x] Implement product queries from local DB
- [x] Implement full-text search query
- [x] Implement pagination with cursor-based approach
- [x] Create `mapLocalProductToCommerceType()` mapper

### [PARALLEL] Shopify Client (Fallback)
- [x] Implement `ShopifyStorefrontClient` class
- [x] Create product GraphQL queries (for fallback only)
- [x] Create collection GraphQL queries
- [x] Implement type mappers (Shopify -> unified types)
- [x] Add async trigger to sync product to local DB on fallback

### [SEQUENTIAL after parallel tasks] Commerce Provider Integration
- [x] Create `apps/storefront/src/lib/commerce.ts`
- [x] Implement `getCommerceProvider()` with caching
- [x] Implement `useCommerceProvider()` client hook
- [x] Wire up tenant config to provider factory

### [SEQUENTIAL after provider integration] Product Pages
- [x] Build product listing page `/products`
- [x] Build product detail page `/products/[handle]`
- [x] Build collection page `/collections/[handle]`
- [x] Create provider-agnostic components (ProductCard, VariantSelector, etc.)

---

## Definition of Done

- [x] `apps/storefront/` app runs with `npm run dev`
- [x] Product listing page shows products from Shopify
- [x] Product detail page displays full product with variants
- [x] Changing feature flag `commerce.provider` logs correct provider type
- [x] All components use unified Commerce types, not Shopify types
- [x] `npx tsc --noEmit` passes
- [x] Mobile responsive (390px) and desktop (1440px) layouts work
