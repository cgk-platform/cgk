# AGENT-13: Storefront Audit Report
**Date**: 2026-02-19  
**Auditor**: Agent 13 (Storefront Specialist)  
**Scope**: `apps/storefront/src/`, `packages/commerce-primitives/src/`, `packages/commerce-hooks/src/`  
**Phases Reviewed**: PHASE-3A (Foundation), PHASE-3B (Cart), PHASE-3C (Features), PHASE-3D (Theming)

---

## Executive Summary

All four storefront phases (3A–3D) are marked ✅ COMPLETE in their phase docs. The actual implementation is **substantially delivered** — the storefront is a real, functional Next.js App Router application with tenant-aware routing, a full cart/checkout system, per-tenant theming, landing page blocks, reviews, A/B testing, and analytics. However, several gaps exist between the phase specifications and actual code:

| Area | Status | Critical? |
|---|---|---|
| Routing / Pages | ⚠️ Partially implemented | Yes — missing `/collections` index |
| Product Listing Page (PLP) | ⚠️ Partially implemented | Medium — price range filter missing |
| Product Detail Page (PDP) | ✅ Fully implemented | — |
| Cart / Checkout | ✅ Fully implemented | — |
| Shopify Provider Integration | ✅ Fully implemented | — |
| Theming System | ✅ Fully implemented | — |
| Multi-Tenant Config | ✅ Fully implemented | — |
| Performance / SSR | ⚠️ Partially implemented | High — all pages force-dynamic, no ISR |
| Reviews | ✅ Fully implemented | — |
| Bundle Builder | ⚠️ Partially implemented | Low — no standalone hook |
| A/B Testing | ✅ Fully implemented | — |
| Attribution Tracking | ✅ Fully implemented | — |
| Analytics Pixels | ✅ Fully implemented | — |
| Block System (70+ blocks) | ⚠️ Partially implemented | Medium — ~56 block files, not 70+ |

**Overall Phase Completion**: ~91% — solid foundation with a few concrete gaps.

---

## Feature-by-Feature Classification

---

### 1. Storefront Routing / Pages

**Status**: ⚠️ Partially Implemented

#### Implemented Pages
| Route | File | Notes |
|---|---|---|
| `/` | `app/page.tsx` | Basic hero + featured products |
| `/products` | `app/products/page.tsx` | Full listing with filters + pagination |
| `/products/[handle]` | `app/products/[handle]/page.tsx` | Full PDP |
| `/collections/[handle]` | `app/collections/[handle]/page.tsx` | Collection listing with sort + pagination |
| `/search` | `app/search/page.tsx` | Full-text search with results |
| `/cart` | `app/cart/page.tsx` | Full cart page |
| `/checkout` | `app/checkout/page.tsx` | Multi-step checkout (custom provider) or Shopify redirect |
| `/order-confirmation/[orderId]` | `app/order-confirmation/[orderId]/page.tsx` | Order confirmation |
| `/lp/[slug]` | `app/lp/[slug]/page.tsx` | Dynamic landing pages |
| `/account` | `app/account/page.tsx` | Account dashboard |
| `/account/orders` | `app/account/orders/page.tsx` | Order history |
| `/account/orders/[id]` | `app/account/orders/[id]/page.tsx` | Order detail |
| `/account/subscriptions` | `app/account/subscriptions/page.tsx` | Subscriptions manager |
| `/account/subscriptions/[id]` | `app/account/subscriptions/[id]/page.tsx` | Subscription detail |
| `/account/addresses` | `app/account/addresses/page.tsx` | Address book |
| `/account/profile` | `app/account/profile/page.tsx` | Profile settings |
| `/account/wishlist` | `app/account/wishlist/page.tsx` | Wishlist |
| `/account/store-credit` | `app/account/store-credit/page.tsx` | Store credit |
| `/account/rewards` | `app/account/rewards/page.tsx` | Loyalty rewards |
| `/account/referrals` | `app/account/referrals/page.tsx` | Referral program |
| `/account/reviews` | `app/account/reviews/page.tsx` | Review history |
| `/account/support` | `app/account/support/page.tsx` | Support tickets |
| `/contact` | `app/contact/page.tsx` | Contact page |
| `/faq` | `app/faq/page.tsx` | FAQ page |
| `/privacy`, `/terms`, `/returns`, `/shipping` | Static policy pages | Static content |

#### Missing Pages
| Route | Status | Priority |
|---|---|---|
| `/collections` | ❌ Not implemented | Medium — no collections index page to browse all collections |
| `/account/login` or `/auth/login` | ❌ Not found in filesystem | High — no visible login/register page (may be middleware-handled externally) |

---

### 2. Product Listing Pages (PLP)

**Status**: ⚠️ Partially Implemented

#### Implemented
- `/products` page with `ProductGrid` + `ProductFilters` sidebar
- Filters: Sort (newest, price-asc/desc, title-asc/desc), Product Type, Vendor
- Pagination via "Load More" link
- `/collections/[handle]` with sort dropdown and "Load More"
- `ProductFilters` component with collapsible sections, active filter tags, mobile drawer button
- `ProductGrid` with configurable column counts (sm/md/lg)
- `ProductCard` with price, compare-at, vendor badge

#### Missing / Gaps
- **Price range filter**: `ProductFilters` has only Sort, Type, and Vendor sections. Despite the component docstring mentioning "price range options", there is **no price range slider or min/max input** implemented. `ProductFiltersProps` has no `minPrice`/`maxPrice` props, and the collection URL has no `priceMin`/`priceMax` searchParams.
- **Collections index page** (`/collections`): No `app/collections/page.tsx` exists — only the handle-based page. Users cannot browse all collections.
- **Collection page lacks sidebar filters**: `/collections/[handle]` only has an inline sort `<select>` (no `ProductFilters` sidebar). Full filter panel (type, vendor, price) is only on `/products`.
- **Search page lacks filters/sorting**: `/search` renders `ProductGrid` with no sort or filter controls beyond the search query itself.

---

### 3. Product Detail Pages (PDP)

**Status**: ✅ Fully Implemented

#### Implemented
- `app/products/[handle]/page.tsx` — Full SSR product page
- `ProductGallery` — Image gallery with thumbnail strip, zoom modal, `next/image` with `priority` on main image
- `VariantSelector` — Option selection (size, color, etc.) with availability states
- `PriceDisplay` — Price with compare-at, sale badges
- `AddToCartButton` — All states: default, loading, success, out-of-stock, error
- `ProductReviews` — Review list with pagination, sort, helpful marking
- `StarRating` — Rating stars component
- `ReviewCard` — Individual review display

---

### 4. Cart / Checkout

**Status**: ✅ Fully Implemented

#### Implemented
- **Cart Provider**: `CartProvider` in `commerce-hooks`, `CartContext`, full cart state
- **Cart Hooks**: `useCart`, `useCartCount`, `useCartLoading`, `useCartUpdating`, `useCartEmpty`, `useCartError`
- **Cart Actions** (`lib/cart/actions.ts`): `getCurrentCart`, `addToCart`, `updateCartLine`, `removeCartLine`, `applyDiscountCode`, `removeDiscountCode`
- **Cart Attributes**: `_tenant`, `_visitor_id`, `_session_id`, `_attribution_*`, `_ab_test_id`, `_ab_variant_id`, `_free_gifts` automatically injected
- **CartDrawer**: Full slide-out with backdrop, focus trap, escape key, loading/empty states, line items, summary
- **CartLineItem**: Thumbnail, title, variant, quantity stepper, remove button
- **CartSummary**: Subtotal, discount codes, estimated total, checkout CTA
- **Cart page** (`/cart`): Full-page cart view
- **Custom Checkout** (`/checkout`): Multi-step wizard — Contact → Shipping Address → Delivery (shipping rates) → Payment (Stripe Elements) → Review
- **Shopify checkout**: `cart.checkoutUrl` redirect when `commerce.provider = 'shopify'`
- **Stripe integration**: `StripeProvider`, `PaymentForm` with `PaymentElement`, create-payment-intent API route, confirm-order API route
- **Order confirmation** (`/order-confirmation/[orderId]`): Full order details with items, address, totals, email confirmation notice

---

### 5. Shopify Provider Integration

**Status**: ✅ Fully Implemented

#### Implemented
- `packages/commerce-primitives/src/` — Unified types, formatters, validators, cart utilities, pagination utilities, variant selection utilities, money formatters
- `packages/commerce-hooks/src/` — `CommerceProvider`, `CartProvider`, `useCart`, `useProducts`, `useProductByHandle`, `useProductSearch`, `useCheckout`
- `lib/commerce.ts` — `getCommerceProvider()` factory with auto type selection and request caching
- Local PostgreSQL DB as primary product source (fast reads)
- Shopify Storefront API as fallback when product not in local DB
- Cart mutations via Shopify Storefront API (create, add lines, update lines, remove lines, apply discount, buyer identity)
- Product sync via webhooks (Shopify → local DB)

---

### 6. Theming System

**Status**: ✅ Fully Implemented

#### Implemented
- `lib/theme/types.ts` — `PortalThemeConfig`, `StorefrontThemeConfig`, `StorefrontHeaderConfig`, `StorefrontFooterConfig`, `LandingPageConfig`, `BlockType`, `BlockConfig`, etc.
- `lib/theme/defaults.ts` — `DEFAULT_PORTAL_THEME`, `DEFAULT_STOREFRONT_THEME`, `SPACING_PRESETS`, `generateThemeCss`, `loadThemeForSSR`, `mergeStorefrontTheme`
- `lib/theme/ThemeProvider.tsx` — React context with `isDarkMode`, `toggleDarkMode`, `setDarkMode`
- `lib/theme/ThemeStyles.tsx` — `ThemeHead` (CSS custom properties injection in `<head>`), `ThemeFontPreload`, `ThemeFavicon`
- `lib/theme/BrandLogo.tsx` — `ServerBrandLogo` (SSR), `BrandLogo` (client)
- `lib/theme/DarkModeToggle.tsx` — Dark mode toggle button
- CSS custom properties: `--portal-primary`, `--portal-secondary`, `--portal-background`, `--portal-foreground`, `--portal-font-family`, `--portal-card-border-radius`, etc.
- Dark mode colors via `@media (prefers-color-scheme: dark)` + `.dark` class
- Custom CSS injection support (`customCss` field)
- Custom font URL support (`customFontsUrl` field)
- Spacing density presets (compact/normal/relaxed)
- `API route /api/portal/theme` for runtime theme fetching

---

### 7. Multi-Tenant Storefront Config

**Status**: ✅ Fully Implemented

#### Implemented
- `middleware.ts` — Domain-based tenant resolution from hostname; sets `x-tenant-id`, `x-tenant-slug`, `x-tenant-domain` headers on every request
- `lib/tenant.ts` — `getTenantSlug()`, `getTenantConfig()` (reads from middleware headers), `getCommerceProviderType()`
- Database lookup of tenant by custom domain or subdomain
- Internal domain lookup API (`/api/internal/domain-lookup`)
- Tenant context flows through every page, query, and API route
- Tenant slug in cart attributes (`_tenant`) for order routing
- Theme loaded per-tenant in root layout

---

### 8. Performance / SSR

**Status**: ⚠️ Partially Implemented

#### Implemented
- `next/image` used throughout with `priority` on hero images
- SSR via Next.js App Router Server Components (product data fetched server-side)
- `Suspense` boundaries on product grids with skeleton fallbacks
- Local PostgreSQL DB reads (fast, no Shopify API latency on render)
- `generateMetadata` on all product/collection/search pages

#### Missing / Gaps
- **All pages use `force-dynamic` / `revalidate = 0`**: Every page has `export const dynamic = 'force-dynamic'` and `export const revalidate = 0`. This disables **all caching** and ISR. For a multi-tenant SaaS platform, product/collection pages should use ISR with webhook-driven revalidation (`revalidatePath`) to reduce origin load and improve TTFB. Currently each request hits the DB directly.
- **No `generateStaticParams`**: Product and collection pages could pre-generate popular routes at build time (or on-demand ISR), but this is fully disabled.
- **No `unstable_cache` or React `cache()`**: Database query results are not memoized across multiple components in the same request (e.g., `getTenantConfig()` is called in layout AND page on every request — though Next.js deduplifies fetch, SQL queries may not be).
- **Image domain whitelist**: Not audited whether `next.config.js` has proper `images.remotePatterns` for Shopify CDN and Cloudflare Images.

---

### 9. Reviews Integration

**Status**: ✅ Fully Implemented

- `lib/reviews/index.ts` — Main module with `getProductReviews()`, `getProductRating()`, internal/Yotpo branching
- `lib/reviews/internal.ts` — PostgreSQL-backed reviews with pagination, sort
- `lib/reviews/yotpo.ts` — Yotpo API integration (when tenant has Yotpo enabled)
- `lib/reviews/types.ts` — `Review`, `PaginatedReviews`, `ProductRating`, `ReviewSortOrder`
- `components/products/ReviewCard.tsx` — Individual review with stars, date, helpful button
- `components/products/ProductReviews.tsx` — Paginated list with sort, "load more", rating summary
- `components/products/StarRating.tsx` — Star rating display
- PDP block: `components/blocks/pdp/PDPReviewsBlock.tsx`

---

### 10. Bundle Builder

**Status**: ⚠️ Partially Implemented

#### Implemented
- `components/blocks/promo/BundleBuilderBlock.tsx` — Full interactive bundle builder UI with item selection, tier-based discounts, savings callout, multi-product cart addition, `useMemo` for pricing calculation

#### Missing
- **`useBundlePricing()` standalone hook**: Phase 3C spec requires a standalone `useBundlePricing(selectedProducts)` hook in `apps/storefront/src/` (or `lib/`). The bundle pricing logic exists **inline** inside `BundleBuilderBlock.tsx` using `useMemo`, but is not extracted into a reusable hook. This prevents reuse in other contexts (e.g., a dedicated bundle page, PDP upsell widget).
- **No dedicated bundle route**: Bundle builder only exists as a landing page block, not as a standalone `/bundles` or `/build-a-bundle` route.

---

### 11. A/B Testing

**Status**: ✅ Fully Implemented

- `lib/ab-testing/index.ts` — `getVariantAssignment()`, `getActiveTest()`
- `lib/ab-testing/hash.ts` — FNV-1a consistent hashing, `getHashBucket()`, `getVariantIndex()`, `isInTrafficAllocation()`
- `lib/ab-testing/storage.ts` — Cookie read/write, database persistence
- `lib/ab-testing/types.ts` — `ABTest`, `ABVariant`, `ABAssignment`, `GetAssignmentOptions`
- Integration with cart attributes (`_ab_test_id`, `_ab_variant_id`)

---

### 12. Attribution Tracking

**Status**: ✅ Fully Implemented

- `lib/attribution/index.ts` — `initAttributionTracking()`, `recordTouchpoint()`, `parseAttributionParams()`
- `lib/attribution/storage.ts` — Cookie-based first-touch + last-touch storage, `getAttributionFromCookie()`, `saveAttributionToCookie()`
- `lib/attribution/types.ts` — `AttributionTouchpoint`, `AttributionCookieData`, `ParsedAttributionParams`
- Captures: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `fbclid`, `gclid`, `ttclid`, `creatorCode`
- 30-day cookie expiry
- Touchpoints persisted to DB via `withTenant`
- Cart attribute injection (`_attribution_source`, `_attribution_campaign`, etc.)

---

### 13. Analytics Pixels

**Status**: ✅ Fully Implemented

- `lib/analytics/ga4.ts` — `trackViewItem`, `trackAddToCart`, `trackRemoveFromCart`, `trackBeginCheckout`, `trackPurchase`, `trackViewItemList`
- `lib/analytics/meta.ts` — Meta Pixel (`fbq`): `ViewContent`, `AddToCart`, `InitiateCheckout`, `Purchase`
- `lib/analytics/tiktok.ts` — TikTok Pixel (`ttq`): `ViewContent`, `AddToCart`, `InitiateCheckout`, `CompletePayment`
- `lib/analytics/types.ts` — `EcommerceItem`, `PurchaseEventData`, `ViewItemListData`
- `lib/analytics/index.ts` — Unified export
- Debug mode via `NEXT_PUBLIC_DEBUG_ANALYTICS`
- Graceful no-op when measurement IDs not configured

---

### 14. Landing Page Block System

**Status**: ⚠️ Partially Implemented

#### Implemented
- `components/blocks/BlockRenderer.tsx` — Dispatches to block components by type
- Block registry in `lib/theme/types.ts` — 70+ block type strings defined
- Block categories: core, content, conversion, about, interactive, layout, pdp, policy, promo, shop, social

#### Actual Block Files (56 .tsx files found)
| Category | Files |
|---|---|
| Core | HeroBlock, BenefitsBlock, CTABannerBlock, MarkdownBlock, ReviewsBlock |
| Content | AccordionBlock, BlogGridBlock, IconGridBlock, ImageGalleryBlock, TabsBlock, VideoEmbedBlock |
| Conversion | BeforeAfterBlock, ExitIntentBlock, GuaranteeBlock, ProductLineupBlock, TestimonialCarouselBlock, UrgencyBannerBlock |
| About | AboutHeroBlock, TeamGridBlock, TimelineBlock, ValuesGridBlock |
| Interactive | ContactFormBlock, CountdownBlock, FAQBlock, StoreLocatorBlock |
| Layout | BreadcrumbBlock, DividerBlock, FeatureCardsBlock, FooterBlock, HeaderBlock, ImageTextBlock, MegaMenuBlock, SidebarBlock, SpacerBlock, TestimonialBlock |
| PDP | PDPHeroBlock, PDPRecommendationsBlock, PDPReviewsBlock, PDPSpecificationsBlock, PDPTrustBadgesBlock |
| Policy | PolicyContentBlock |
| Promo | AnnouncementBarBlock, BundleBuilderBlock, CountdownTimerBlock, NewsletterSignupBlock, PromoHeroBlock |
| Shop | CollectionFiltersBlock, CollectionGridBlock, CollectionSortBlock, QuickViewModal, WishlistButton |
| Social | CommunityBlock, InstagramFeedBlock, SocialProofBlock, TrustSignalsBlock, UGCBannerBlock |

#### Gap
Phase 3D spec requires **70+ block types** implemented. The registry (`BlockType`) defines 70+ type strings, but the actual `.tsx` component files total **~56**. The remaining ~14+ block types defined in the registry are likely unimplemented or redirect to a fallback renderer (e.g., `rawdog-standard`, `no-mens-brand`, `new-standard`, `upgrade`, `science`, `health-matrix`, `results`, and several brand-specific PDP blocks like `pdp-bundle-why`, `pdp-bundle-included`, `pdp-bundle-pricing`, `pdp-science-section`, `pdp-usage-guide`, `pdp-ingredient-deep-dive`, `pdp-lifestyle-image`, `pdp-before-after`, `pdp-ready-to-buy`, `pdp-featured-reviews`, `pdp-yotpo-reviews`).

---

## Packages Audit

### `packages/commerce-primitives/src/`

**Status**: ✅ Fully Implemented

Exports:
- Types: `PlatformCartAttributes`, `CartQueryOptions`, `CartState`, `CartLineWithProduct`, `AddToCartInput`, `CartTotals`
- Constants: `CART_COOKIE_NAME`, `VISITOR_COOKIE_NAME`, `SESSION_COOKIE_NAME`, `MAX_LINE_QUANTITY`, `MAX_CART_LINES`, `PLATFORM_ATTRIBUTE_KEYS`
- Formatters: `formatMoney`, `formatMoneyCompact`, `parseMoney`, `addMoney`, `formatCart`, `formatProduct`, `formatCartLine`, `getCartTotals`, `getCartSavings`
- Utilities: `buildCartAttributes`, `parseCartAttributes`, `buildCursor`, `parseCursor`, `buildPageInfo`, `buildVariantKey`, `findVariantByOptions`, `getAvailableOptionValues`, `buildSelectionMatrix`
- Validators: `validateQuantity`, `validateVariant`, `validateAddToCart`, `validateCart`, `validateDiscountCodeFormat`

### `packages/commerce-hooks/src/`

**Status**: ✅ Fully Implemented

Exports:
- Context: `CartContext`, `CartProvider`
- Providers: `CommerceProvider`, `useCommerce`, `useProductActions`, `useOrderActions`, `useDiscountActions`
- Cart hooks: `useCart`, `useCartCount`, `useCartLoading`, `useCartUpdating`, `useCartError`, `useCartEmpty`
- Product hooks: `useProducts`, `useProductByHandle`, `useProductSearch`
- Checkout hooks: `useCheckout`

---

## Prioritized TODO List

### 🔴 HIGH PRIORITY

#### P1-1: Implement ISR / Caching Strategy
**Problem**: Every page uses `dynamic = 'force-dynamic'` and `revalidate = 0`. For a multi-tenant SaaS with multiple brands, this means every product page hits the database on every request. Under load, this will cause DB saturation and slow TTFB.

**Files to change**:
- `apps/storefront/src/app/products/[handle]/page.tsx`
- `apps/storefront/src/app/products/page.tsx`
- `apps/storefront/src/app/collections/[handle]/page.tsx`
- `apps/storefront/src/app/search/page.tsx`

**TODO**:
```typescript
// Product detail pages — ISR with 60s revalidation (webhook revalidates on product update)
export const revalidate = 60
// OR use unstable_cache for DB queries
// Implement revalidatePath('/products/[handle]') in Shopify product.updated webhook handler

// For collections — ISR with 120s revalidation  
export const revalidate = 120

// Add generateStaticParams for popular products (optional, improves cold start)
export async function generateStaticParams() {
  const products = await getTopProducts(50) // pre-generate top 50
  return products.map(p => ({ handle: p.handle }))
}
```

**Also implement `unstable_cache` for tenant config queries** (called on every request):
```typescript
// lib/tenant.ts
import { unstable_cache } from 'next/cache'
export const getTenantConfig = unstable_cache(
  async (tenantSlug: string) => { /* DB lookup */ },
  ['tenant-config'],
  { revalidate: 300, tags: ['tenant'] }
)
```

---

#### P1-2: Add `/account/login` and `/account/register` Pages
**Problem**: No login or registration pages found in the filesystem. The account section exists (`/account`, `/account/orders`, etc.) but there's no `/account/login` route. Customer authentication flow is incomplete.

**Files to create**:
- `apps/storefront/src/app/account/login/page.tsx`
- `apps/storefront/src/app/account/register/page.tsx`
- `apps/storefront/src/app/account/forgot-password/page.tsx`
- `apps/storefront/src/middleware.ts` — Add auth guard for `/account/*` routes (redirect to login if not authenticated)

**TODO**:
- Implement email/password login form
- Implement Shopify customer account creation
- Implement magic link / passwordless option (tenant config)
- Add auth middleware to protect `/account/*` routes
- Add "Login to view orders" CTA on account pages if unauthenticated

---

### 🟡 MEDIUM PRIORITY

#### P2-1: Create `/collections` Index Page
**Problem**: No `app/collections/page.tsx` exists. The breadcrumb on `/collections/[handle]` links back to `/collections` but that route 404s.

**File to create**: `apps/storefront/src/app/collections/page.tsx`

**TODO**:
```typescript
// app/collections/page.tsx
// Fetch all collections from commerce provider
// Display collection cards in a grid (name, image, product count)
// Link each to /collections/[handle]
// Generate metadata with tenant name
```

---

#### P2-2: Add Price Range Filter to ProductFilters
**Problem**: `ProductFilters` component docstring says "price range options" but no price range slider/input is implemented. `ProductFiltersProps` has no `minPrice`/`maxPrice` props.

**File to change**: `apps/storefront/src/components/products/ProductFilters.tsx`

**TODO**:
```typescript
interface ProductFiltersProps {
  // existing...
  minPrice?: number
  maxPrice?: number
  priceRange?: { min: number; max: number } // available range for the collection
}

// Add <FilterSection title="Price Range"> with:
// - Range slider (HTML5 <input type="range"> dual-handle, or radix-ui Slider)
// - OR min/max input pair
// - Apply on change or on "Apply" button
// - URL params: ?priceMin=10&priceMax=100
```

**Also**: Update `/products` page to pass `priceMin`/`priceMax` from searchParams, and update the DB query in `ProductList` to filter by price range.

---

#### P2-3: Add Filter Panel to Collection Pages
**Problem**: `/collections/[handle]` has only an inline sort `<select>`. The full `ProductFilters` sidebar (type, vendor) is only on `/products`. Collections should have the same filter capability.

**File to change**: `apps/storefront/src/app/collections/[handle]/page.tsx`

**TODO**:
- Import `ProductFilters` from `@/components/products`
- Add `type` and `vendor` to `CollectionPageProps.searchParams`
- Fetch `productTypes` and `vendors` available within the collection
- Render `ProductFilters` in a sidebar layout alongside `CollectionProducts`
- Pass `type`, `vendor` to the `CollectionProducts` query

---

#### P2-4: Add Filters/Sorting to Search Page
**Problem**: `/search` has no sort or filter controls — only a text input. Users can't refine results by type, vendor, or sort order.

**File to change**: `apps/storefront/src/app/search/page.tsx`

**TODO**:
- Add sort `<select>` to search results header (same options as PLP)
- Add product type and vendor filter pills/checkboxes
- Wire to URL searchParams (`sort`, `type`, `vendor`)
- Update `SearchResults` to pass sort and filters to `commerce.products.search()`

---

#### P2-5: Implement Missing Block Types (~14+ blocks)
**Problem**: The `BlockType` union in `lib/theme/types.ts` defines 70+ block types, but only ~56 `.tsx` component files exist. The `BlockRenderer` will hit unhandled cases for the missing types.

**Files to audit and create**:
- `pdp-science-section` — Science/ingredient section for PDP
- `pdp-usage-guide` — Usage instructions block
- `pdp-ingredient-deep-dive` — Detailed ingredient analysis
- `pdp-lifestyle-image` — Lifestyle photography section
- `pdp-before-after` — Before/after comparison block
- `pdp-ready-to-buy` — Secondary buy box CTA
- `pdp-featured-reviews` — Curated featured reviews
- `pdp-yotpo-reviews` — Yotpo review widget embed
- `pdp-bundle-why` / `pdp-bundle-included` / `pdp-bundle-pricing` — Bundle-specific PDP sections
- `results` / `rawdog-standard` / `no-mens-brand` / `new-standard` / `upgrade` / `science` / `health-matrix` — Brand-specific blocks

**TODO**:
- Audit `BlockRenderer.tsx` for `default` / fallback case behavior
- For each unimplemented type: create a stub component with sensible defaults (not just a hidden `null`)
- Add logging/warning when an unknown block type is encountered

---

### 🟢 LOW PRIORITY

#### P3-1: Extract `useBundlePricing()` as Standalone Hook
**Problem**: Phase 3C spec requires a standalone `useBundlePricing(selectedProducts)` hook. The pricing logic currently lives inline in `BundleBuilderBlock.tsx` using `useMemo`.

**File to create**: `apps/storefront/src/lib/bundle/useBundlePricing.ts`

**TODO**:
```typescript
// Extract from BundleBuilderBlock.tsx:
export function useBundlePricing(
  selectedItems: BundleItem[],
  tiers: BundleTier[]
): {
  subtotal: number
  discountPercent: number
  discountAmount: number
  total: number
  activeTier: BundleTier | null
  savings: string
  nextTierMessage: string | null
}
```

---

#### P3-2: Add `unstable_cache` to Repeated DB Queries
**Problem**: `getTenantConfig()` and `loadThemeForSSR()` are called in both root layout AND individual pages on every request. While Next.js deduplicates React `cache()` within a single render, there's no cross-request memoization.

**Files to change**:
- `apps/storefront/src/lib/tenant.ts`
- `apps/storefront/src/lib/theme/defaults.ts`

**TODO**:
```typescript
import { unstable_cache } from 'next/cache'

// Cache tenant config for 5 minutes, tagged for revalidation
export const getTenantConfig = unstable_cache(
  rawGetTenantConfig,
  ['tenant-config'],
  { revalidate: 300, tags: ['tenant-config'] }
)
```

---

#### P3-3: Verify `next.config.js` Image Domains
**Problem**: Not audited whether `next.config.js` correctly lists all remote image domains (Shopify CDN: `cdn.shopify.com`, Cloudflare Images, custom CDN).

**File to check**: `apps/storefront/next.config.js` (or `.mjs`)

**TODO**:
```javascript
images: {
  remotePatterns: [
    { protocol: 'https', hostname: 'cdn.shopify.com' },
    { protocol: 'https', hostname: '*.myshopify.com' },
    { protocol: 'https', hostname: 'imagedelivery.net' }, // Cloudflare Images
    // Add any custom CDN domains
  ],
},
```

---

#### P3-4: Add Collections Listing to Navigation
**Problem**: The `StorefrontHeader` and `DEFAULT_HEADER` nav config may not link to `/collections`. Once `/collections` page exists (P2-1), add it to default nav.

**File to check**: `apps/storefront/src/lib/theme/defaults.ts`

**TODO**:
- Add `{ label: 'Collections', href: '/collections' }` to `DEFAULT_HEADER.navLinks`
- Verify `StorefrontHeader` renders nav links from theme config

---

#### P3-5: Implement `useABTest()` Client Hook
**Problem**: Phase 3C spec requires a `useABTest(testId)` client hook. The server-side `getVariantAssignment()` exists, but no React hook wrapper was found for client-side components.

**File to create**: `apps/storefront/src/lib/ab-testing/useABTest.ts`

**TODO**:
```typescript
'use client'
export function useABTest(testId: string): {
  variant: string | null
  isLoading: boolean
} {
  // Read variant from cookie (synchronous, hydration-safe)
  // Returns null while loading on server/hydration
}
```

---

## Files Reference Index

### Core Storefront Files
```
apps/storefront/src/
├── middleware.ts                          # Tenant domain resolution
├── app/
│   ├── layout.tsx                         # Root layout with theme + header
│   ├── globals.css                        # Base CSS
│   ├── page.tsx                           # Homepage
│   ├── products/
│   │   ├── page.tsx                       # PLP with filters
│   │   └── [handle]/page.tsx             # PDP
│   ├── collections/
│   │   └── [handle]/page.tsx             # Collection page (no index!)
│   ├── search/page.tsx                   # Search results
│   ├── cart/page.tsx                     # Cart page
│   ├── checkout/
│   │   ├── page.tsx                       # Checkout orchestrator
│   │   └── components.tsx                 # Multi-step checkout UI
│   ├── order-confirmation/[orderId]/page.tsx
│   ├── lp/[slug]/page.tsx                # Dynamic landing pages
│   └── account/                          # Customer portal (no login page!)
├── components/
│   ├── products/                          # ProductCard, Gallery, Filters, Reviews
│   ├── cart/                             # CartDrawer, CartLineItem, CartSummary
│   ├── checkout/                          # StripeProvider, PaymentForm
│   ├── blocks/                           # 56 block components
│   └── layout/                           # StorefrontHeader, Footer
└── lib/
    ├── commerce.ts                        # Provider factory
    ├── tenant.ts                          # Tenant context
    ├── theme/                             # Full theming system
    ├── cart/                             # Cart actions + types
    ├── reviews/                          # Internal + Yotpo reviews
    ├── ab-testing/                       # A/B testing with hashing
    ├── attribution/                      # UTM + click ID tracking
    └── analytics/                        # GA4, Meta Pixel, TikTok Pixel
```

### Package Files
```
packages/commerce-primitives/src/
├── index.ts                              # All exports
├── types/                               # CartState, CartLine, AddToCartInput
├── constants/                           # Cart, pagination constants
├── formatters/                          # money, product, cart formatters
├── utilities/                           # cart-attributes, pagination, variant-selection
└── validators/                          # cart, discount-code validators

packages/commerce-hooks/src/
├── index.ts                             # All exports
├── context/                             # CartContext, CartProvider
├── providers/                           # CommerceProvider
└── hooks/                              # useCart, useProducts, useCheckout
```

---

## Summary Scorecard

| Phase | Spec Status | Actual Implementation | Gap |
|---|---|---|---|
| 3A - Foundation | ✅ Complete | ✅ 95% | Missing /collections index |
| 3B - Cart | ✅ Complete | ✅ 98% | Negligible |
| 3C - Features | ✅ Complete | ✅ 90% | No standalone useBundlePricing hook |
| 3D - Theming | ✅ Complete | ✅ 88% | ~14 block types unimplemented; no ISR |
| **Overall** | — | **~91%** | See TODO list above |

**Estimated Remediation Effort**:
- P1 (High): 2–3 days (ISR strategy, login pages)
- P2 (Medium): 3–4 days (collections index, price filters, collection filters, search filters, missing blocks)
- P3 (Low): 1 day (hook extraction, cache, next.config, nav links)
- **Total**: ~6–8 dev-days to reach full 100% spec compliance

---

*Report generated by Agent 13 | 2026-02-19*
