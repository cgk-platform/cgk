# PHASE-3C: Storefront Features

> **STATUS**: ✅ COMPLETE (2026-02-11)
> **Completed By**: Wave 2 Agents

**Duration**: 1 week (Week 13)
**Depends On**: PHASE-3B-STOREFRONT-CART
**Parallel With**: None
**Blocks**: PHASE-3D-STOREFRONT-THEMING

---

## Goal

Implement e-commerce features including reviews integration, bundle builder, A/B testing, attribution tracking, and analytics pixels to enable full marketing and conversion functionality.

---

## Success Criteria

- [ ] Product reviews display on product pages (internal or Yotpo based on tenant config)
- [ ] `getProductReviews()` and `getProductRating()` functions work
- [ ] Bundle builder allows product selection with dynamic pricing
- [ ] `useBundlePricing()` hook calculates savings and callouts
- [ ] A/B test variant assignment uses consistent hashing
- [ ] `getVariantAssignment()` returns consistent assignments per visitor
- [ ] Attribution tracking captures UTM params and click IDs
- [ ] `recordTouchpoint()` persists attribution data
- [ ] GA4 tracking fires for product views and add-to-cart
- [ ] Meta Pixel tracking fires for standard events
- [ ] TikTok Pixel tracking fires for standard events
- [ ] `npx tsc --noEmit` passes

---

## Deliverables

### Reviews Integration
- `apps/storefront/src/lib/reviews/` - Reviews module
- `getProductReviews(productId)` - Fetch reviews (internal or Yotpo)
- `getProductRating(productId)` - Get aggregate rating
- `ReviewCard` component
- `ReviewsList` component with pagination
- `StarRating` component
- Yotpo integration (when tenant has Yotpo enabled)

### Bundle Builder
- `apps/storefront/src/components/bundle-builder.tsx`
- `useBundlePricing(selectedProducts)` hook
- Dynamic pricing calculation with discounts
- Savings callout generation
- Multi-product cart addition
- Bundle configuration from tenant settings

### A/B Testing
- `apps/storefront/src/lib/ab-testing/` - A/B test module
- `getVariantAssignment(testId)` - Get or create assignment
- Consistent hashing algorithm (visitor ID + test ID -> variant index)
- Assignment persistence (database + cookie)
- `useABTest(testId)` hook for client components
- Integration with cart attributes (`_ab_test_id`, `_ab_variant_id`)

### Attribution Tracking
- `apps/storefront/src/lib/attribution/` - Attribution module
- `initAttributionTracking()` - Capture UTM and click IDs on page load
- `recordTouchpoint(data)` - Persist to API
- `getStoredAttribution()` - Retrieve from cookie/session
- Supported parameters: utm_source, utm_medium, utm_campaign, utm_content, utm_term
- Supported click IDs: fbclid (Meta), gclid (Google), ttclid (TikTok)
- Integration with cart attributes

### Analytics Pixels
- `apps/storefront/src/lib/analytics/` - Analytics module
- GA4 tracking functions:
  - `trackViewItem(product, variant)` - Product view
  - `trackAddToCart(product, variant, quantity)` - Add to cart
  - `trackRemoveFromCart(product, variant, quantity)` - Remove from cart
  - `trackBeginCheckout(cart)` - Checkout initiation
  - `trackPurchase(order)` - Order completion
- Meta Pixel tracking (fbq):
  - ViewContent, AddToCart, InitiateCheckout, Purchase
- TikTok Pixel tracking (ttq):
  - ViewContent, AddToCart, InitiateCheckout, CompletePayment

---

## Constraints

- Reviews source (internal vs. Yotpo) determined by tenant feature flag
- A/B test assignments MUST be consistent for same visitor + test combination
- Attribution data MUST persist for 30 days (cookie expiry)
- Analytics pixels MUST only load when tenant has the integration enabled
- All tracking respects consent (check for cookie consent before firing)

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - Bundle builder UI, review cards

**MCPs to consult:**
- Context7 MCP: React hooks patterns, analytics event structure

**RAWDOG code to reference:**
- `src/lib/analytics.ts` - GA4 tracking patterns (trackAddToCart, etc.)
- `src/components/reviews/` - Review display components
- `src/components/bundle-builder/` - Bundle builder patterns
- `src/lib/ab-testing/` - A/B test assignment (if exists)

**Spec documents:**
- `CODEBASE-ANALYSIS/INTEGRATIONS-2025-02-10.md` - Yotpo, GA4, Meta, TikTok integrations

---

## AI Discretion Areas

The implementing agent should determine the best approach for:
1. Consistent hashing algorithm implementation (MurmurHash, xxHash, or simple)
2. Attribution cookie structure and encryption
3. Analytics consent management approach
4. Bundle builder product selection UI (grid, list, drag-drop)
5. Review sorting/filtering options

---

## Tasks

### [PARALLEL] Reviews Integration
- [ ] Create `apps/storefront/src/lib/reviews/` module
- [ ] Implement `getProductReviews()` with internal/Yotpo branching
- [ ] Implement `getProductRating()`
- [ ] Build `ReviewCard`, `ReviewsList`, `StarRating` components
- [ ] Add reviews section to product detail page

### [PARALLEL] Bundle Builder
- [ ] Create bundle builder component
- [ ] Implement `useBundlePricing()` hook
- [ ] Build pricing calculation logic with discounts
- [ ] Create add-bundle-to-cart action
- [ ] Add bundle builder to relevant landing pages

### [PARALLEL] A/B Testing
- [ ] Create `apps/storefront/src/lib/ab-testing/` module
- [ ] Implement consistent hashing function
- [ ] Build `getVariantAssignment()` with persistence
- [ ] Create `useABTest()` hook
- [ ] Wire A/B test IDs into cart attributes

### [PARALLEL] Attribution Tracking
- [ ] Create `apps/storefront/src/lib/attribution/` module
- [ ] Implement `initAttributionTracking()` for page load
- [ ] Build `recordTouchpoint()` API call
- [ ] Create cookie/session storage for attribution
- [ ] Wire attribution into cart attributes

### [SEQUENTIAL after parallel tasks] Analytics Integration
- [ ] Create `apps/storefront/src/lib/analytics/` module
- [ ] Implement GA4 tracking functions
- [ ] Implement Meta Pixel (fbq) tracking
- [ ] Implement TikTok Pixel (ttq) tracking
- [ ] Add pixel initialization to root layout
- [ ] Wire tracking into cart and checkout flows

---

## Definition of Done

- [ ] Product pages show reviews from configured source
- [ ] Bundle builder calculates dynamic pricing with savings display
- [ ] Same visitor gets same A/B variant on repeat visits
- [ ] UTM parameters captured and stored on first visit
- [ ] GA4 receives add_to_cart event when product added
- [ ] Meta Pixel receives AddToCart event when product added
- [ ] TikTok Pixel receives AddToCart event when product added
- [ ] All tracking respects tenant integration settings
- [ ] `npx tsc --noEmit` passes
