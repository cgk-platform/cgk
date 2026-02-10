# PHASE-3B: Storefront Cart & Checkout

**Duration**: 1 week (Week 12)
**Depends On**: PHASE-3A-STOREFRONT-FOUNDATION
**Parallel With**: None
**Blocks**: PHASE-3C-STOREFRONT-FEATURES

---

## Goal

Implement cart management with tenant-aware attributes and checkout flow using Shopify checkout (default), while scaffolding the custom checkout UI for future Stripe integration.

---

## Success Criteria

- [ ] Cart creates, persists, and syncs via Commerce Provider
- [ ] Cart attributes include tenant tracking (`_tenant`, `_visitor_id`, etc.)
- [ ] Add to cart works from product pages
- [ ] Cart page displays line items with update/remove functionality
- [ ] Shopify checkout redirect works (default flow)
- [ ] Custom checkout UI scaffold exists (renders when feature flag = `custom`)
- [ ] Cart state persists across page navigation
- [ ] `npx tsc --noEmit` passes

---

## Deliverables

### Cart Management System
- `apps/storefront/src/lib/cart/` - Cart operations
- `useCart()` hook for client components
- Cart ID persistence (cookies or localStorage)
- Optimistic updates for cart mutations

### Cart Attributes System
- `CartAttributes` interface with platform fields
- `buildCartAttributes()` function
- Automatic attribute injection on cart create/update

Required cart attributes:
- `_tenant` - Tenant slug for order routing
- `_visitor_id` - Visitor identifier
- `_ab_test_id` - Active A/B test (if any)
- `_ab_variant_id` - Assigned variant (if any)
- `_attribution_source` - UTM source
- `_attribution_campaign` - UTM campaign
- `_free_gifts` - Applied free gift rules

### Cart UI Components
- `CartProvider` - Context for cart state
- `AddToCartButton` - Add variant to cart
- `CartDrawer` or `CartPage` - Full cart view
- `CartLineItem` - Individual line display
- `CartSummary` - Subtotal, discounts, total

### Checkout Flow (Shopify Default)
- Redirect to `cart.checkoutUrl` for Shopify checkout
- Pre-checkout validation (inventory, etc.)
- Checkout button component

### Custom Checkout Scaffold
- `/checkout` route (renders when `commerce.provider` = `custom`)
- Multi-step form structure (shipping, payment, review)
- Stripe Elements placeholder
- Shipping rate selection placeholder
- Order review component

---

## Constraints

- Cart operations MUST go through Commerce Provider interface
- Cart attributes MUST be set on every cart create/update
- Shopify checkout is the default - custom checkout is scaffold only
- Cart must handle out-of-stock gracefully (show warning, allow removal)
- Cookie-based cart ID for cross-device persistence

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - REQUIRED for all cart and checkout UI (CONVERSION-CRITICAL)

**MCPs to consult:**
- Shopify Dev MCP: `introspect_graphql_schema(query: "cart")` for cart mutations
- Shopify Dev MCP: `introspect_graphql_schema(query: "cartLinesAdd")` for specific operations
- Context7 MCP: React context patterns, optimistic UI updates

**RAWDOG code to reference:**
- `src/components/cart/` - Existing cart components
- `src/hooks/use-cart.ts` - Cart hook patterns (if exists)
- `src/lib/shopify/cart.ts` - Shopify cart operations

**Spec documents:**
- `COMMERCE-PROVIDER-SPEC-2025-02-10.md` - Cart interface, CartLine type, Cart type
- `FRONTEND-DESIGN-SKILL-GUIDE.md` - Skill invocation patterns

---

## Frontend Design Skill Integration

**CRITICAL**: Cart and checkout are CONVERSION-CRITICAL. Poor UX here = lost sales. Every component MUST go through `/frontend-design`.

### Component-Specific Skill Prompts

**1. Add to Cart Button:**
```
/frontend-design

Building AddToCartButton for storefront (PHASE-3B-STOREFRONT-CART).

Requirements:
- States:
  - Default: "Add to Cart" button (prominent CTA)
  - Loading: spinner + "Adding..." text
  - Success: checkmark + "Added!" (brief, then reset)
  - Out of Stock: "Out of Stock" (disabled, grayed)
  - Error: "Failed - Try Again" (retry-able)

- Behavior:
  - Click triggers add-to-cart mutation
  - Optimistic: immediately show feedback
  - Open cart drawer on success (optional, configurable)

- Accessibility:
  - aria-label includes product name
  - Disabled state for out of stock
  - Focus visible state

Layout:
- Full-width on mobile PDP
- Inline with quantity selector on desktop

Design:
- Highly prominent (primary brand color)
- Large touch target (min 44px height)
- Clear loading/success/error states
```

**2. Cart Drawer:**
```
/frontend-design

Building Cart Drawer (slide-out panel) for storefront (PHASE-3B-STOREFRONT-CART).

Requirements:
- Header:
  - "Your Cart" title
  - Close button (X)
  - Item count

- Line items list (scrollable):
  - Each line: product image (thumbnail), title, variant info, price
  - Quantity adjuster (+/- buttons or input)
  - Remove button (trash icon or X)
  - Line total

- Summary section (fixed at bottom):
  - Subtotal
  - Shipping note: "Shipping calculated at checkout"
  - Discount code input (optional, expandable)
  - "Checkout" button (full-width, prominent)
  - "Continue Shopping" link

- Empty state:
  - Friendly message: "Your cart is empty"
  - "Shop Now" button

Behavior:
- Slides in from right
- Backdrop overlay (click to close)
- Trap focus when open
- Close on Escape key
- Persist scroll position

Layout:
- Width: ~400px on desktop, full-width on mobile
- Max height: 100vh with internal scroll

Design:
- Clean, uncluttered
- Product images are small but clear
- Checkout button is unmissable
```

**3. Cart Line Item:**
```
/frontend-design

Building CartLineItem component for storefront (PHASE-3B-STOREFRONT-CART).

Requirements:
- Layout:
  - Left: product image (thumbnail, ~80px)
  - Center: product title + variant (size: M, color: Blue)
  - Right: price (per unit or line total)
  - Below center: quantity controls + remove

- Quantity controls:
  - Decrement button (-)
  - Current quantity (centered)
  - Increment button (+)
  - Remove when quantity would go to 0, or separate remove button

- Price display:
  - Unit price or line total
  - Compare-at if on sale (strikethrough)

- States:
  - Updating: subtle loading indicator
  - Error: inline error message with retry
  - Out of stock warning: if stock dropped since added

Design:
- Compact but readable
- Easy to adjust quantity
- Clear remove action (but not too easy to accidentally trigger)
```

**4. Checkout Page Scaffold (Custom):**
```
/frontend-design

Building custom checkout page scaffold for storefront (PHASE-3B-STOREFRONT-CART).

Note: This is a SCAFFOLD - actual checkout implementation is future work. Build the structure now.

Requirements:
- Multi-step flow:
  1. Contact info (email, phone)
  2. Shipping address
  3. Shipping method selection
  4. Payment (Stripe Elements placeholder)
  5. Review & place order

- Step indicator:
  - Show all steps at top
  - Current step highlighted
  - Completed steps have checkmarks

- Sidebar (desktop):
  - Order summary
  - Line items (collapsed/expandable)
  - Subtotal, shipping, tax, total
  - Discount code input

- Form behavior:
  - Inline validation
  - Error messages below fields
  - "Continue" button advances to next step
  - "Back" returns to previous step

Layout:
- Desktop: 2 columns (form left, summary right)
- Mobile: single column, summary at bottom (collapsible)

Design:
- Trust signals throughout (secure badges, payment icons)
- Clean, professional, trustworthy
- Progress should feel quick and easy
```

### Cart UX Principles

When invoking `/frontend-design` for cart/checkout:

1. **Reduce friction**: Every click is a potential drop-off
2. **Show progress**: User should always know what's next
3. **Build trust**: Security badges, clear totals, no surprises
4. **Mobile-first**: Majority of carts are on mobile
5. **Recovery**: Make it easy to fix errors, not start over

---

## AI Discretion Areas

The implementing agent should determine the best approach for:
1. Cart state management (React Context vs. Zustand vs. Jotai)
2. Optimistic update rollback strategy
3. Cart drawer vs. dedicated cart page (or both)
4. Discount code input UX (inline vs. drawer vs. checkout)
5. Empty cart state design

---

## Tasks

### [PARALLEL] Cart Infrastructure
- [ ] Create `apps/storefront/src/lib/cart/` directory
- [ ] Implement cart ID persistence (cookies)
- [ ] Build `CartAttributes` interface and `buildCartAttributes()` function
- [ ] Create `useCart()` hook with cart operations

### [PARALLEL] Cart UI Components
- [ ] Create `CartProvider` context
- [ ] Build `AddToCartButton` component
- [ ] Build `CartLineItem` component
- [ ] Build `CartSummary` component
- [ ] Build `CartDrawer` or `/cart` page

### [SEQUENTIAL after cart infrastructure] Integrate with Product Pages
- [ ] Add `AddToCartButton` to product detail page
- [ ] Wire up variant selection to add-to-cart
- [ ] Show cart item count in header

### [SEQUENTIAL after cart UI] Checkout Flow
- [ ] Implement Shopify checkout redirect flow
- [ ] Add pre-checkout validation
- [ ] Create `/checkout` route for custom checkout scaffold
- [ ] Build multi-step checkout form skeleton (shipping, payment, review)
- [ ] Add Stripe Elements placeholder component

---

## Definition of Done

- [ ] Add to cart from product page works
- [ ] Cart drawer/page shows all line items
- [ ] Update quantity and remove item works
- [ ] Cart attributes include `_tenant` and `_visitor_id`
- [ ] "Checkout" button redirects to Shopify checkout
- [ ] `/checkout` route renders scaffold when `commerce.provider` = `custom`
- [ ] Cart persists after page refresh
- [ ] `npx tsc --noEmit` passes
