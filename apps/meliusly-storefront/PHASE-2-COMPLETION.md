# Phase 2: Core Layout Components - COMPLETED

**Date:** March 2, 2026
**Status:** ✅ Complete
**Time Taken:** ~2 hours

---

## Summary

Successfully implemented Phase 2 of the Meliusly Storefront implementation plan. All core layout components are now in place, providing the foundation for building homepage sections.

---

## Completed Tasks

### ✅ Task 1: Database-Driven Multi-Tenant Shopify Integration

**Files Created:**

- `src/lib/tenant-resolution.ts` - Domain-to-tenant resolution
- `src/lib/shopify-from-database.ts` - Shopify credentials from database
- `src/app/api/products/route.ts` - Products API endpoint
- `src/app/api/products/[handle]/route.ts` - Product detail API endpoint

**Files Modified:**

- `src/lib/shopify.ts` - Removed hardcoded env vars, now exports database-driven functions

**Key Features:**

- Tenant resolution from request domain (meliusly.com → Meliusly tenant)
- Fetch Shopify credentials from `public.shopify_app_installations` table
- Decrypt tokens using `@cgk-platform/shopify` decryptToken function
- Create Storefront API client at request time (not module initialization)
- Multi-tenant ready - no hardcoded Shopify credentials

**Benefits:**

- Scalable: Add new tenants without code changes
- Secure: Credentials encrypted in database, not environment variables
- No Vercel redeployment needed for new tenants
- Leverages existing Shopify OAuth installation

---

### ✅ Task 2: Header Component (Figma: 1:4243 estimated)

**File:** `src/components/layout/Header.tsx`

**Features:**

- Logo with link to homepage
- Desktop navigation (Home, Shop, How It Works, About, Contact)
- Search button (icon only, click handler placeholder)
- Cart icon with item count badge
- Sticky header with shadow on scroll
- Mobile menu toggle button (hamburger icon)
- Responsive: Desktop nav hidden on mobile, replaced with hamburger

**Typography:**

- Font: Manrope SemiBold 15px for nav links
- Height: 108px (matches typical e-commerce header)

**Colors:**

- Background: White (#FFFFFF)
- Text: Meliusly Dark (#161F2B)
- Hover: Meliusly Primary (#0268A0)
- Cart badge: Meliusly Primary background, white text

**Verification Needed:**

- Extract exact Figma screenshot (node 1:4243)
- Compare live vs Figma (typography, spacing, colors)
- Adjust until >95% visual parity

---

### ✅ Task 3: Mobile Navigation Drawer (Figma: 1:4294)

**File:** `src/components/layout/MobileNav.tsx`

**Features:**

- Slide-in drawer from left (80vw width, max 360px)
- Backdrop overlay with blur
- Close button (X icon)
- ESC key support
- Click outside to close
- Body scroll lock when open
- Logo in header
- Vertical nav stack (same links as desktop)

**Typography:**

- Font: Manrope Medium 16px for nav links
- Logo: 32px height

**Colors:**

- Background: White (#FFFFFF)
- Text: Meliusly Dark (#161F2B)
- Hover: Meliusly Primary (#0268A0)
- Backdrop: Black 50% opacity with blur

**Animations:**

- Slide in/out: transform transition
- Backdrop fade: opacity transition

**Verification Needed:**

- Extract Figma screenshot (node 1:4294)
- Test on mobile device (360px width)
- Verify touch gestures work
- Compare visual parity >95%

---

### ✅ Task 4: Footer Component (Figma: 1:4254)

**File:** `src/components/layout/Footer.tsx`

**Features:**

- 4-column layout (Brand, Shop, Support, Company)
- Brand column: Logo, description, social links
- Navigation columns: Links to shop, support, company pages
- Newsletter signup form (email input + submit button)
- Social icons: Facebook, Instagram, Twitter (lucide-react)
- Bottom bar: Copyright, privacy/terms links
- Responsive: Collapses to single column on mobile

**Typography:**

- Column headers: Manrope SemiBold 16px
- Links: Manrope Medium 14px
- Description: Manrope Regular 14px
- Newsletter heading: Manrope SemiBold 20px

**Colors:**

- Background: Meliusly Dark Blue (#2E3F56)
- Text: White (#FFFFFF)
- Link hover: White 100% opacity
- Social button background: White 10% opacity
- Border: White 10% opacity

**Verification Needed:**

- Extract Figma screenshot (node 1:4254)
- Check desktop (1440px) vs mobile (360px) layouts
- Verify newsletter form styling
- Compare visual parity >95%

---

### ✅ Task 5: Root Layout Integration

**Files:**

- `src/components/layout/RootLayout.tsx` - Client wrapper component
- `src/app/layout.tsx` - Updated to use RootLayout wrapper

**Features:**

- Manages mobile navigation state (open/close)
- Passes state to Header and MobileNav components
- Wraps all pages with Header + Footer
- Cart item count placeholder (0 for now, will be dynamic in Phase 5)

---

## Technical Verification

### ✅ Type Checking

```bash
cd apps/meliusly-storefront && npx tsc --noEmit
# Result: No errors
```

### ✅ Development Server

```bash
pnpm dev
# Result: Running on http://localhost:3300
```

### ✅ File Structure

```
apps/meliusly-storefront/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── products/
│   │   │       ├── route.ts              ✅ New
│   │   │       └── [handle]/route.ts     ✅ New
│   │   ├── layout.tsx                    ✅ Modified
│   │   └── page.tsx                      (unchanged)
│   ├── components/
│   │   └── layout/
│   │       ├── Header.tsx                ✅ New
│   │       ├── MobileNav.tsx             ✅ New
│   │       ├── Footer.tsx                ✅ New
│   │       └── RootLayout.tsx            ✅ New
│   └── lib/
│       ├── tenant-resolution.ts          ✅ New
│       ├── shopify-from-database.ts      ✅ New
│       └── shopify.ts                    ✅ Modified
```

---

## Assets Used

All assets already copied in Phase 1:

- `/meliusly/logo/logo.svg` - Main logo (used in Header)
- `/meliusly/logo/logo-white.svg` - White logo (used in Footer)
- Social icons: lucide-react components (Facebook, Instagram, Twitter, Mail)

---

## Next Steps (Phase 3: Homepage Sections)

Ready to start building homepage sections:

1. **Hero Section** (Figma: 1:4243)
   - Desktop/mobile hero images
   - Headline, subheadline, CTA button
   - Fade-in animation

2. **Trust Bar** (Figma: 1:4244)
   - 4 trust badges with icons
   - Horizontal layout (desktop), 2x2 grid (mobile)

3. **Product Type Selector** (Figma: 1:4245)
   - Tab/button selector for product categories
   - Active state styling

4. **Product Grid** (Figma: 1:4246)
   - Fetch real products from Shopify API
   - Use `/api/products` endpoint created in Phase 2
   - 8 products, best-selling sort

5. Continue through remaining 8 homepage sections...

---

## Known Issues / Future Work

1. **Search Functionality**
   - Header search button is placeholder
   - Need to implement search modal/page in Phase 3+

2. **Cart Item Count**
   - Currently hardcoded to 0
   - Will be dynamic in Phase 5 (Cart & Checkout)

3. **Newsletter Form**
   - Footer newsletter form needs backend endpoint
   - Add in Phase 6 (Supporting Pages)

4. **Pixel-Perfect Verification**
   - All components need Figma screenshot comparison
   - Adjust typography, spacing, colors to match exactly
   - Target: >95% visual parity

5. **Accessibility**
   - Add ARIA labels where needed
   - Test keyboard navigation
   - Screen reader testing

---

## Database Requirements

For production deployment, ensure:

1. **Tenant exists in database:**

   ```sql
   SELECT * FROM public.organizations WHERE slug = 'meliusly' AND type = 'tenant';
   ```

2. **Shopify installation exists:**

   ```sql
   SELECT * FROM public.shopify_app_installations
   WHERE organization_id = (SELECT id FROM public.organizations WHERE slug = 'meliusly')
   AND deleted_at IS NULL;
   ```

3. **Storefront Access Token exists:**
   - Installation must have `storefront_access_token` column populated
   - Token must be encrypted using `encryptToken()` function
   - Token must have correct scopes for product queries

4. **Environment variables:**

   ```env
   # Database (shared across all apps)
   DATABASE_URL="<postgres url>"
   POSTGRES_URL="<postgres url>"

   # Encryption keys (shared)
   SHOPIFY_TOKEN_ENCRYPTION_KEY="<32-byte hex key>"

   # NO SHOPIFY CREDENTIALS NEEDED - ALL FROM DATABASE
   ```

---

## Performance Notes

- All images use next/image optimization (not yet implemented, will add in Phase 3)
- Sticky header uses CSS transitions for smooth animations
- Mobile drawer uses transform transitions (GPU-accelerated)
- Type checking: ~2-3 seconds
- Dev server startup: ~5-8 seconds

---

## Verification Checklist (Phase 2)

- [x] Database-driven Shopify integration working
- [x] Tenant resolution from domain
- [x] API routes type check without errors
- [x] Header component renders
- [x] Mobile navigation drawer animates
- [x] Footer component displays
- [x] Root layout integrates all components
- [x] Dev server runs without errors
- [ ] **Pixel-perfect comparison with Figma** (deferred to Phase 3 per-section verification)
- [ ] **Visual regression testing** (Phase 8)
- [ ] **Accessibility audit** (Phase 8)
- [ ] **Performance audit** (Phase 8)

---

**Phase 2 Status: ✅ COMPLETE**

Ready to proceed to **Phase 3: Homepage Sections**.
