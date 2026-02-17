# CGK Platform - Frontend Fix Plan

> **Generated**: 2026-02-16
> **Purpose**: Systematic fix plan for all identified frontend gaps
> **Estimated Phases**: 6 phases

---

## Executive Summary

Based on comprehensive frontend audit, the platform needs fixes across:
- **5 apps**: Orchestrator, Admin, Storefront, Creator Portal, Contractor Portal
- **24 major issues** identified
- **Organized into 6 phases** by priority and dependencies

---

## Overall Status Before Fixes

| App | Completion | Key Gaps |
|-----|------------|----------|
| Orchestrator | 95% | 2 placeholder pages, hardcoded metrics |
| Admin | 98% | 1 mock data issue (inbox stats) |
| Storefront | 85% | Checkout, subscriptions, 60+ blocks |
| Creator Portal | 92% | Teleprompter page, mock agreements |
| Customer Portal | 70% | Missing API routes, feature pages |
| Contractor Portal | 50% | Missing dashboard, projects, auth |

---

## Phase Overview

### Phase 1: Critical - Customer Portal API Routes
**Priority**: P0 - Blocking core functionality
**Scope**: Create all missing `/api/account/*` routes
**Files**: ~10 new API route files
**Estimated Work**: 2-3 hours

### Phase 2: Critical - Storefront Checkout Payment
**Priority**: P0 - Cannot complete purchases
**Scope**: Integrate Stripe Elements into checkout
**Files**: ~5 files (API routes + components)
**Estimated Work**: 3-4 hours

### Phase 3: Critical - Contractor Portal Core
**Priority**: P0 - App unusable without navigation
**Scope**: Layout, navigation, dashboard, projects, auth
**Files**: ~15 new files
**Estimated Work**: 4-5 hours

### Phase 4: High Priority - Backend Integrations
**Priority**: P1 - Major features missing
**Scope**: Subscriptions, order confirmation, orchestrator pages
**Files**: ~10 files
**Estimated Work**: 3-4 hours

### Phase 5: Medium Priority - Mock Data & Feature Pages
**Priority**: P2 - Polish and completeness
**Scope**: Fix mock data, create missing customer portal pages
**Files**: ~15 files
**Estimated Work**: 4-5 hours

### Phase 6: Medium Priority - Storefront Blocks
**Priority**: P2 - Landing page builder completeness
**Scope**: Implement remaining block components
**Files**: ~25 block components
**Estimated Work**: 5-6 hours

### Phase 7: Low Priority - Backend Fixes
**Priority**: P3 - Technical debt
**Scope**: Wise webhook signature, payment provider interface
**Files**: ~2 files
**Estimated Work**: 1-2 hours

---

## Detailed Phase Breakdown

### Phase 1: Customer Portal API Routes

| Task | Files to Create |
|------|-----------------|
| Orders API | `api/account/orders/route.ts`, `api/account/orders/[id]/route.ts` |
| Addresses API | `api/account/addresses/route.ts`, `api/account/addresses/[id]/route.ts` |
| Profile API | `api/account/profile/route.ts` |
| Wishlist API | `api/account/wishlists/route.ts`, `api/account/wishlists/[id]/route.ts` |
| Store Credit API | `api/account/store-credit/route.ts` |
| Features API | `api/account/features/route.ts` |

**Dependencies**: None
**Verification**: `npx tsc --noEmit` from apps/storefront

---

### Phase 2: Storefront Checkout Payment

| Task | Files |
|------|-------|
| PaymentIntent API | `api/checkout/create-payment-intent/route.ts` |
| Confirm Order API | `api/checkout/confirm-order/route.ts` |
| StripeProvider | `components/checkout/StripeProvider.tsx` |
| Update PaymentStep | `components/checkout/PaymentStep.tsx` (modify) |
| Order redirect | Update checkout flow |

**Dependencies**: Phase 1 (for order creation patterns)
**Verification**: `npx tsc --noEmit` from apps/storefront

---

### Phase 3: Contractor Portal Core

| Task | Files |
|------|-------|
| Portal Layout | `app/(portal)/layout.tsx` |
| Sidebar Nav | `components/nav/Sidebar.tsx`, `MobileNav.tsx` |
| Dashboard Page | `app/(portal)/page.tsx` |
| Projects List | `app/(portal)/projects/page.tsx` |
| Project Detail | `app/(portal)/projects/[id]/page.tsx` |
| Projects API | `api/contractor/projects/route.ts`, `[id]/route.ts` |
| Auth Layout | `app/(auth)/layout.tsx` |
| Login Page | `app/(auth)/login/page.tsx` |
| Password Reset | `app/(auth)/forgot-password/page.tsx`, `reset-password/page.tsx` |
| Settings Pages | `app/(portal)/settings/*` |

**Dependencies**: None
**Verification**: `npx tsc --noEmit` from apps/contractor-portal

---

### Phase 4: Backend Integrations

| Task | Files |
|------|-------|
| Subscription Backend | `lib/subscriptions/api.server.ts` (update) |
| Subscription APIs | `api/account/subscriptions/*` |
| Order Confirmation | `app/order-confirmation/page.tsx`, `app/thank-you/page.tsx` |
| Analytics Page | `apps/orchestrator/.../analytics/page.tsx` (replace placeholder) |
| Brand Health Page | `apps/orchestrator/.../brands/health/page.tsx` (replace placeholder) |
| Analytics API | `api/platform/analytics/route.ts` |

**Dependencies**: Phase 1 (customer portal patterns)
**Verification**: Type check on storefront and orchestrator

---

### Phase 5: Mock Data & Feature Pages

| Task | Files |
|------|-------|
| Fix Inbox Stats | `apps/admin/.../inbox/page.tsx` |
| Fix Creator Agreements | `apps/creator-portal/.../AgreementStep.tsx` |
| Fix Tax Documents | `apps/creator-portal/api/creator/tax/documents/[id]/route.ts` |
| Teleprompter Page | `apps/creator-portal/.../teleprompter/page.tsx` |
| Referrals Page | `apps/storefront/.../account/referrals/page.tsx` |
| Rewards Page | `apps/storefront/.../account/rewards/page.tsx` |
| Support Page | `apps/storefront/.../account/support/*` |
| Reviews Page | `apps/storefront/.../account/reviews/*` |
| Fix Overview Metrics | `apps/orchestrator/api/platform/overview/route.ts` |

**Dependencies**: Phase 1 (API patterns)
**Verification**: Type check on affected apps

---

### Phase 6: Storefront Blocks

| Category | Blocks to Create |
|----------|------------------|
| Layout | HeaderBlock, FooterBlock, MegaMenuBlock, BreadcrumbBlock, SidebarBlock |
| Content | VideoEmbedBlock, BlogGridBlock, IconGridBlock, ImageGalleryBlock, AccordionBlock, TabsBlock |
| Social | InstagramFeedBlock, SocialProofBlock, UGCBannerBlock, TrustSignalsBlock, CommunityBlock |
| Conversion | ProductLineupBlock, BeforeAfterBlock, TestimonialCarouselBlock, GuaranteeBlock, UrgencyBannerBlock, ExitIntentBlock |

**Dependencies**: None (can run in parallel with other phases)
**Verification**: `npx tsc --noEmit` from apps/storefront

---

## Execution Instructions

1. **Start each phase** by reading `PHASE-X.md` for detailed instructions
2. **Use the master prompt** from `MASTER-PROMPT.md` for each agent
3. **Verify after each phase** with TypeScript check
4. **Mark completion** in this file after each phase

---

## Completion Tracking

| Phase | Status | Completed By | Date |
|-------|--------|--------------|------|
| Phase 1 | ✅ Complete | Claude Opus 4.5 | 2026-02-16 |
| Phase 2 | ✅ Complete | Claude Opus 4.5 | 2026-02-16 |
| Phase 3 | ✅ Complete | Claude Opus 4.5 | 2026-02-16 |
| Phase 4 | ✅ Complete | Claude Opus 4.5 | 2026-02-16 |
| Phase 5 | ✅ Complete | Claude Opus 4.5 | 2026-02-16 |
| Phase 6 | ✅ Complete | Claude Opus 4.5 | 2026-02-16 |
| Phase 7 | ✅ Complete | Claude Opus 4.5 | 2026-02-16 |

---

## Post-Completion Verification

After all phases complete:

```bash
# Type check all apps
cd /Users/holdenthemic/Documents/cgk
pnpm turbo typecheck

# Or check individually
cd apps/storefront && npx tsc --noEmit
cd apps/admin && npx tsc --noEmit
cd apps/orchestrator && npx tsc --noEmit
cd apps/creator-portal && npx tsc --noEmit
cd apps/contractor-portal && npx tsc --noEmit
```

---

## Files in This Plan

```
FRONTEND-FIX-PLAN/
├── MASTER-PLAN.md          # This file - overview and tracking
├── MASTER-PROMPT.md        # Standard prompt template for agents
├── phases/
│   ├── PHASE-1-CUSTOMER-API.md
│   ├── PHASE-2-CHECKOUT.md
│   ├── PHASE-3-CONTRACTOR.md
│   ├── PHASE-4-INTEGRATIONS.md
│   ├── PHASE-5-MOCK-DATA.md
│   └── PHASE-6-BLOCKS.md
```
