# Meliusly Storefront - Quick Start Guide

**Project:** CGK Platform - Meliusly Headless Shopify Storefront
**Status:** Phase 1C (Installation) - Ready for Execution
**Timeline:** 8-12 weeks total

---

## 🚀 Where We Are Now

### ✅ Complete (Days 1-3)
- **Phase 0C**: Figma reference document created
- **Phase 1A**: Meliusly tenant registered (ID: `5cb87b13-3b13-4400-9542-53c8b8d12cb8`)
- **Phase 1B**: Multi-tenant Shopify app architecture implemented

### 🔥 Next Step (YOU Do This)
**Phase 1C: Install CGK Platform App to Meliusly Store**

Visit this URL while logged into Meliusly Shopify admin:
```
https://admin.shopify.com/store/meliusly/oauth/install_custom_app?client_id=6bdb14a850b3220eaa2c8decb420bb8c
```

Then verify installation:
```bash
pnpm tsx scripts/verify-meliusly-installation.ts
```

---

## 📚 Key Documents

| Document | Purpose |
|----------|---------|
| `/MULTI-TENANT-PLATFORM-PLAN/MELIUSLY-STOREFRONT-PLAN.md` | Complete implementation plan (60 days) |
| `/MULTI-TENANT-PLATFORM-PLAN/MELIUSLY-FIGMA-REFERENCE.md` | Immutable Figma node IDs and design tokens |
| `/MULTI-TENANT-PLATFORM-PLAN/MELIUSLY-SHOPIFY-INSTALLATION-GUIDE.md` | Detailed installation walkthrough |
| `/MULTI-TENANT-PLATFORM-PLAN/PHASE-1C-INSTALLATION-SUMMARY.md` | Current phase summary |

---

## 🎯 Meliusly Details

- **Tenant ID:** `5cb87b13-3b13-4400-9542-53c8b8d12cb8`
- **Slug:** `meliusly`
- **Database Schema:** `tenant_meliusly`
- **Shopify Store:** `meliusly.myshopify.com` (to be confirmed)
- **Shopify App:** CGK Platform (Client ID: `6bdb14a850b3220eaa2c8decb420bb8c`)

---

## 🔧 Verification Scripts

```bash
# Verify Shopify app installation
pnpm tsx scripts/verify-meliusly-installation.ts

# Manually record installation (if OAuth callback fails)
pnpm tsx scripts/record-meliusly-installation.ts
```

---

## 📋 Implementation Phases Overview

| Phase | Duration | Status |
|-------|----------|--------|
| 0: Figma Skill & Reference | 2-3 days | ✅ COMPLETE |
| 1A: Tenant Registration | 1 day | ✅ COMPLETE |
| 1B: Multi-Tenant Architecture | 2-4 days | ✅ COMPLETE |
| 1C: Install Shopify App | 0.5 day | 🔥 **YOU DO THIS** |
| 1D: Update Organization | 0.5 day | ⏳ Pending |
| 1E: Figma Assets | 1-2 days | ⏳ Pending |
| 1F: Theme Config | 1 day | ⏳ Pending |
| 2: Layout (Header, Footer) | 4-5 days | ⏳ Pending |
| 3: Homepage (12 sections) | 8-12 days | ⏳ Pending |
| 4: PDP (13 subsections) | 7-10 days | ⏳ Pending |
| 5: Cart & Checkout | 3-4 days | ⏳ Pending |
| 6: Supporting Pages | 3-4 days | ⏳ Pending |
| 7: Collections Page | 2-3 days | ⏳ Pending |
| 8: Testing & Audit | 5-7 days | ⏳ Pending |
| 9: Deployment | 2-3 days | ⏳ Pending |
| **Total** | **42-60 days** | **~5% complete** |

---

## 🎨 Design Tokens (Quick Reference)

```css
/* Colors */
--primary: #0268A0;      /* Blue */
--dark: #161F2B;          /* Navy */
--white: #FFFFFF;

/* Typography */
--font-family: 'Manrope', system-ui, sans-serif;
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;

/* Font Sizes */
--text-xs: 12px;   --text-sm: 13px;   --text-base: 14px;
--text-md: 16px;   --text-lg: 18px;   --text-xl: 24px;
--text-2xl: 32px;  --text-3xl: 40px;

/* Breakpoints */
--mobile: 360px;
--desktop: 1440px;
```

---

## 🛠️ Tech Stack

- **Framework:** Next.js 16 + React 19 (Server Components)
- **Styling:** Tailwind CSS 4.x
- **Commerce:** Shopify Storefront API + Admin API
- **Database:** PostgreSQL (schema-per-tenant)
- **Auth:** JWT (custom, no Clerk)
- **Fonts:** Manrope (Google Fonts)
- **Icons:** lucide-react

---

## 🎯 Success Criteria

### Technical
- Lighthouse Performance >85 (all pages)
- Lighthouse Accessibility >90
- LCP <2.5s (homepage, PDP)
- Type check passes
- E2E tests pass (>70% coverage)

### Design
- Visual parity >98% vs Figma (all pages)
- Typography EXACT match
- Colors EXACT match (verified with DevTools)
- Spacing within ±2px

### Functional
- Shopify products load correctly
- Add to cart works
- Checkout redirect works
- All navigation functional
- Forms submit correctly

---

## 🚨 Critical Rules

1. **Always Use `withTenant()`** for database queries
2. **Invoke `/frontend-design`** before building ANY component
3. **Pixel-perfect audit** after EVERY section (compare to Figma)
4. **Never skip tasks** - complete everything, no TODOs
5. **Type check after every change**: `npx tsc --noEmit`

---

## 📞 Getting Help

- **Plan Issues:** Check `/MULTI-TENANT-PLATFORM-PLAN/MELIUSLY-STOREFRONT-PLAN.md`
- **Installation Issues:** Check `/MULTI-TENANT-PLATFORM-PLAN/MELIUSLY-SHOPIFY-INSTALLATION-GUIDE.md`
- **Figma Reference:** `/MULTI-TENANT-PLATFORM-PLAN/MELIUSLY-FIGMA-REFERENCE.md`
- **Design Tokens:** `apps/storefront/src/lib/theme/meliusly-theme.ts` (to be created)

---

## ⏭️ After Installation (Phase 1C)

1. Run verification script (confirm all checks pass)
2. Phase 1D: Update organization with Shopify domain
3. Phase 1E: Extract Figma assets (hero images, icons, backgrounds)
4. Phase 1F: Configure theme (Manrope font, color palette, Tailwind)
5. Phase 2: Build header and footer
6. Phase 3: Build homepage sections (12 sections, pixel-perfect)

---

**Mr. Tinkleberry**, this quick start guide provides everything you need to understand where we are and what to do next!
