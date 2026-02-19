# AGENT-14: Customer Portal Audit Report
**Audit Date:** 2026-02-19  
**Auditor:** Agent 14 (Subagent — Code Audit)  
**Scope:** `packages/portal/src/` + `apps/admin/src/` (portal-related) + `apps/storefront/src/app/account/`  
**Phase Docs Reviewed:** PHASE-3CP-PORTAL-ADMIN.md, PHASE-3CP-PORTAL-PAGES.md, PHASE-3CP-PORTAL-SUBSCRIPTIONS.md, PHASE-3CP-PORTAL-THEMING.md

---

## Executive Summary

The CGK customer portal has a **solid foundation with several critical gaps**. Authentication infrastructure, subscription management UI, theming engine, and admin configuration are all partially to substantially implemented. However, there are **three blocking issues**:

1. **No customer login page** — auth middleware redirects to `/login` which doesn't exist in the storefront app.
2. **Subscription API URL mismatch** — the subscription client library calls `/api/subscriptions/*` but all routes are registered under `/api/account/subscriptions/*`. Most subscription actions (cancel, reschedule, order-now, frequency, swap, payment-method) return 404.
3. **No standalone payment methods page** — exists only in subscription context; no dedicated account payment methods management.

Overall completeness is estimated at **~55%** against the phase plan.

---

## Feature-by-Feature Classification

---

### 1. Customer Self-Service Portal (Login, Registration, Dashboard)

#### 1a. Shopify OAuth / Auth Infrastructure
**Status: ✅ Fully Implemented**

- `packages/portal/src/auth/oauth.ts` — Full PKCE OAuth 2.0 flow for Shopify Customer Account API
- `packages/portal/src/auth/session.ts` — Encrypted session storage in DB via HTTP-only cookies with token auto-refresh
- `packages/portal/src/auth/pkce.ts` — PKCE challenge generation
- `packages/portal/src/auth/middleware.ts` — `requireCustomerAuth()`, `requireNoAuth()`, `getOptionalCustomerAuth()`
- `packages/portal/src/auth/types.ts` — Full TypeScript types for OAuth/session

**Notes:** Implementation is high quality. PKCE, state anti-replay, token refresh buffer (5min), and tenant isolation are all correct.

---

#### 1b. Customer Login Page UI
**Status: ❌ Not Implemented**

`packages/portal/src/auth/middleware.ts` redirects unauthenticated users to `/login`. No page exists at that route:

```bash
$ find apps/storefront/src/app -type d | grep login
# (no output)
```

The content system defines `login.title`, `login.subtitle`, `login.button`, `login.error` keys in `packages/portal/src/content/defaults.ts` — these are defined but never rendered.

There is also no `/auth/callback` route to complete the OAuth flow.

---

#### 1c. Customer Registration
**Status: ✅ N/A (By Design)**

Shopify handles account creation via OAuth redirect. No custom registration page needed or planned.

---

#### 1d. Account Dashboard
**Status: ✅ Fully Implemented**

- `apps/storefront/src/app/account/page.tsx` — Dashboard page exists
- `apps/storefront/src/app/account/layout.tsx` — Shared layout with navigation
- Themed via CSS custom properties from `packages/portal/src/theme/generator.ts`
- Feature-flagged sections via `packages/portal/src/features/isEnabled.ts`

---

### 2. Order History (Order List, Order Detail, Tracking, Returns)

#### 2a. Order List Page
**Status: ✅ Fully Implemented**

- `apps/storefront/src/app/account/orders/page.tsx` — Order list with pagination
- `apps/storefront/src/app/account/orders/components.tsx` — Search, filtering, `OrderCard`, `CancelOrderModal`, `ReturnRequestModal`
- `apps/storefront/src/app/api/account/orders/route.ts` — GET endpoint with filtering and pagination

---

#### 2b. Order Detail Page
**Status: ✅ Fully Implemented**

- `apps/storefront/src/app/account/orders/[id]/page.tsx` — Full detail view with line items, tracking, addresses
- Includes `OrderDetailActions` (cancel, return) and `OrderTrackingSection`
- `apps/storefront/src/app/api/account/orders/[id]/route.ts` — GET + action support

---

#### 2c. Order Tracking
**Status: ⚠️ Partially Implemented**

- Tracking section rendered in order detail page when `order.tracking` is present
- No carrier-specific tracking widget or iframe embed
- No proactive tracking status polling or real-time updates
- No multi-package tracking support

**Missing:**
- Carrier webhook ingestion to update tracking status
- Rich tracking timeline UI (estimated per phase plan)
- Multi-shipment support

---

#### 2d. Order Cancellation
**Status: ✅ Fully Implemented**

- `apps/storefront/src/app/api/account/orders/[id]/cancel/route.ts` — POST endpoint
- `CancelOrderModal` component in orders/components.tsx with reason selection
- `cancelOrder()` API client in `apps/storefront/src/lib/account/api.ts`

---

#### 2e. Returns / Return Requests
**Status: ✅ Fully Implemented**

- `apps/storefront/src/app/api/account/orders/[id]/return/route.ts` — POST to create return
- `apps/storefront/src/app/api/account/orders/[id]/returns/[returnId]/route.ts` — Return status
- `ReturnRequestModal` component with item selection and reason capture
- `requestReturn()` API client

**Notes:** Return tracking is basic. No label generation integration, no return merchandise authorization (RMA) workflow.

---

### 3. Subscription Management

#### 3a. Subscription List Page
**Status: ✅ Fully Implemented**

- `apps/storefront/src/app/account/subscriptions/page.tsx`
- Subscription cards via `subscription-card.tsx` component
- `apps/storefront/src/app/api/account/subscriptions/route.ts` — GET with status filtering

---

#### 3b. Subscription Detail Page
**Status: ✅ Fully Implemented (UI)**

- `apps/storefront/src/app/account/subscriptions/[id]/page.tsx`
- Components: `ProductList`, `FrequencyChanger`, `ShippingAddress`, `PaymentMethodDisplay`, `SubscriptionActions`, `OrderHistory`, `OrderSummary`
- Full detail sidebar with all management options rendered

---

#### 3c. Subscription API — CRITICAL URL MISMATCH BUG
**Status: ❌ Broken (Routing Bug)**

`apps/storefront/src/lib/subscriptions/api.ts` declares:
```ts
const API_BASE_URL = '/api/subscriptions'
```

But the **actual Next.js route handlers** live at:
```
/api/account/subscriptions/...
```

There is **no `/api/subscriptions/` directory** in the storefront app. All client-side subscription API calls from the subscription detail components 404 in production.

---

#### 3d. Pause / Resume Subscription
**Status: ⚠️ Partially Implemented**

- `apps/storefront/src/app/api/account/subscriptions/[id]/pause/route.ts` ✅
- `apps/storefront/src/app/api/account/subscriptions/[id]/resume/route.ts` ✅
- UI in `subscription-actions.tsx` calls `pauseSubscription()` / `resumeSubscription()` which hit `/api/subscriptions/...` → **404 due to URL mismatch above**
- `pause/` route.ts accepts `pauseDuration` parameter but client passes it correctly

---

#### 3e. Skip Next Delivery
**Status: ⚠️ Partially Implemented**

- `apps/storefront/src/app/api/account/subscriptions/[id]/skip/route.ts` ✅ 
- Client calls `/api/subscriptions/{id}/skip` → **404 due to URL mismatch**

---

#### 3f. Cancel Subscription (Self-Service)
**Status: ❌ Not Implemented (API Route Missing)**

- `apps/storefront/src/app/account/subscriptions/components/cancellation-flow.tsx` — Full multi-step cancellation UI with save offers, cancellation reasons
- Client calls `cancelSubscription()` → `/api/subscriptions/{id}/cancel` → **no route exists at either path**
- Feature flag `subscriptionCancelSelfServe` correctly defaults to `false`

**Missing:**
- `/api/account/subscriptions/[id]/cancel/route.ts`

---

#### 3g. Reactivate Subscription
**Status: ❌ Not Implemented (API Route Missing)**

- UI calls `reactivateSubscription()` → `/api/subscriptions/{id}/reactivate`
- No route at either URL namespace

**Missing:**
- `/api/account/subscriptions/[id]/reactivate/route.ts`

---

#### 3h. Reschedule Next Order
**Status: ❌ Not Implemented (API Route Missing)**

- `rescheduleNextOrder()` calls `/api/subscriptions/{id}/reschedule`
- No route exists

**Missing:**
- `/api/account/subscriptions/[id]/reschedule/route.ts`

---

#### 3i. Order Now (Trigger Immediate Order)
**Status: ❌ Not Implemented (API Route Missing)**

- `orderNow()` calls `/api/subscriptions/{id}/order-now`
- No route exists

**Missing:**
- `/api/account/subscriptions/[id]/order-now/route.ts`

---

#### 3j. Update Delivery Frequency
**Status: ❌ Not Implemented (API Route Missing)**

- `FrequencyChanger` component + `frequency-selector.tsx` UI ✅
- `updateFrequency()` calls `/api/subscriptions/{id}/frequency`
- No route exists

**Missing:**
- `/api/account/subscriptions/[id]/frequency/route.ts`

---

#### 3k. Product Swap
**Status: ❌ Not Implemented (API Route Missing)**

- `product-swap-modal.tsx` UI component ✅
- `swapItem()` / `removeItem()` / `updateItemQuantity()` call various sub-routes
- No routes exist

**Missing:**
- `/api/account/subscriptions/[id]/swap/route.ts`
- `/api/account/subscriptions/[id]/items/[itemId]/route.ts` (quantity update)

---

#### 3k. Update Payment Method (Subscription-specific)
**Status: ❌ Not Implemented (API Route Missing)**

- `payment-method-modal.tsx` UI exists with existing method selection and email-link request ✅
- `updatePaymentMethod()` calls `/api/subscriptions/payment-methods` → no route
- `requestPaymentUpdateLink()` calls `/api/subscriptions/{id}/payment-link` → no route

**Missing:**
- `/api/account/subscriptions/payment-methods/route.ts`
- `/api/account/subscriptions/[id]/payment-link/route.ts`

---

#### 3l. Update Shipping Address on Subscription
**Status: ❌ Not Implemented**

- `ShippingAddress` component renders current address but has no edit action
- No API route for address update on subscription

**Missing:**
- Edit UI on `ShippingAddress` component
- `/api/account/subscriptions/[id]/address/route.ts`

---

### 4. Account Settings (Profile, Addresses, Payment Methods, Notifications)

#### 4a. Profile Settings (Name, Phone, Marketing Opt-In)
**Status: ✅ Fully Implemented**

- `apps/storefront/src/app/account/profile/page.tsx`
- `apps/storefront/src/app/account/profile/components.tsx` — `ProfileForm` with firstName, lastName, phone, acceptsMarketing toggle
- `apps/storefront/src/app/api/account/profile/route.ts` — PUT endpoint
- `apps/storefront/src/app/api/account/profile/password-reset/route.ts` — POST for password reset link
- Content strings from `defaultContent`

**Minor Gap:** Email field is display-only (correct, managed by Shopify OAuth) but no visual indicator that it's read-only is shown.

---

#### 4b. Address Book Management
**Status: ✅ Fully Implemented**

- `apps/storefront/src/app/account/addresses/page.tsx`
- `apps/storefront/src/app/api/account/addresses/route.ts` — GET + POST
- `apps/storefront/src/app/api/account/addresses/[id]/route.ts` — PUT + DELETE
- `apps/storefront/src/app/api/account/addresses/[id]/default/route.ts` — Set default
- `packages/portal/src/api/addresses.ts` — Full portal API module

---

#### 4c. Standalone Payment Methods Management
**Status: ❌ Not Implemented**

- No `/account/payment-methods` page exists
- Payment method management exists only inside the subscription detail payment modal
- No ability to add/remove/set default payment methods from account settings
- `packages/portal/src/api/subscriptions.ts` has payment method types defined

**Phase plan requires:** Standalone payment methods list, add new card, set default, remove card.

---

#### 4d. Notification / Communication Preferences (Customer-Facing)
**Status: ❌ Not Implemented**

- `CommunicationPreference` type is fully defined in `apps/admin/src/lib/customer-portal/types.ts`
- Admin can view/edit customer communication prefs via `communication-prefs.tsx` component
- **No customer-facing `/account/notifications` page exists** in the storefront
- No API route for customers to self-manage notification preferences
- Profile page only has a single `acceptsMarketing` toggle (Shopify-level), not granular notification controls

---

### 5. Portal Theming / White-Label

#### 5a. CSS Variable Generation Engine
**Status: ✅ Fully Implemented**

- `packages/portal/src/theme/generator.ts` — Full HSL-based CSS variable generation
- Supports: primary/secondary/accent colors, typography (family, size, weight, line-height), border radii, spacing density, dark mode
- `generateThemeCss()` outputs `<style>` tag content
- `generateThemeStyleObject()` outputs React inline styles for SSR

---

#### 5b. Theme Loader from Database
**Status: ✅ Fully Implemented**

- `packages/portal/src/theme/loader.ts` — DB-backed theme with tenant-isolated caching (5min TTL)
- `loadThemeConfig()` / `loadThemeFromDatabase()` / `mergeWithDefaults()` pattern is correct
- Theme API route: `apps/storefront/src/app/api/portal/theme/route.ts` — GET / PUT / DELETE

---

#### 5c. Custom Domain Support
**Status: ⚠️ Partially Implemented**

- `apps/storefront/src/middleware.ts` — Reads custom domain from DB via internal API lookup ✅
- Domain lookup: `apps/storefront/src/app/api/internal/domain-lookup/route.ts` ✅
- SSL status stored in `portal_settings.ssl_status` ✅
- Admin UI shows custom domain input and SSL status badge ✅
- **SSL auto-provisioning: ❌ NOT implemented** — UI says "SSL certificate will be automatically provisioned once DNS is verified" but there is no Cloudflare/Let's Encrypt/Certbot integration
- **Custom domain admin API: ❌ NOT wired** — `portal-settings-client.tsx` sends `customDomain` in `updateSettings()` to `/api/admin/customer-portal/settings`, but the PUT handler in that route only processes `features`, `branding`, `messaging`, `enabled` — not `customDomain`. Saving a custom domain silently does nothing.

---

#### 5d. Dark Mode Support
**Status: ⚠️ Partially Implemented (With Bug)**

- Theme config supports `darkModeEnabled`, `darkModeDefault`, and all dark color overrides ✅
- CSS generator outputs dark mode variables and `@media (prefers-color-scheme: dark)` ✅
- **Bug:** `packages/portal/src/theme/generator.ts` lines 113-114 contain a string comparison bug:
  ```ts
  '--portal-primary-foreground': adjustLightness(primary, primary > '#888888' ? -40 : 40)
  // 'primary' is a hex string like '#3b82f6' - JS string comparison is lexicographic, not luminance-based
  // This incorrectly determines foreground contrast color
  ```
- Dark mode toggle in theme loader: no mechanism for customers to toggle dark/light mode at runtime

---

#### 5e. Custom Fonts
**Status: ✅ Implemented**

- `customFontsUrl` in theme config injects `@import url(...)` at top of generated CSS
- `fontFamily` / `headingFontFamily` CSS variables applied to `body` and `h1-h6`
- Admin branding editor has a Google Fonts dropdown (limited set of 10 fonts hardcoded)

**Gap:** Only supports Google Fonts via URL import; no local font upload support.

---

#### 5f. Custom CSS Overrides
**Status: ✅ Implemented**

- `customCss` field in theme config appended at end of generated CSS
- No sandboxing or validation of user-provided CSS (security consideration)

---

#### 5g. Logo / Favicon Injection
**Status: ⚠️ Partially Implemented**

- `logoUrl`, `logoDarkUrl`, `faviconUrl` stored in theme config ✅
- `--portal-logo-height` CSS variable generated ✅
- **No dynamic favicon injection** — `faviconUrl` is in the DB but no code injects it into the `<head>` metadata in `layout.tsx`
- Logo URL in account layout: not verified to be consuming `logoUrl` from theme

---

#### 5h. Live Theme Preview in Admin
**Status: ❌ Not Implemented**

- `BrandingEditor` component in admin renders color pickers and font selectors
- No preview panel or iframe that shows theme changes in real-time
- Phase plan requires a live preview

---

### 6. Portal Admin Configuration

#### 6a. Enable / Disable Portal
**Status: ✅ Fully Implemented**

- `portal_settings.enabled` DB column ✅
- Admin toggle in `portal-settings-client.tsx` and `customer-portal-page-client.tsx` ✅
- `setPortalEnabled()` DB function ✅
- API: PUT `/api/admin/customer-portal/settings` with `{ enabled: true/false }` ✅

---

#### 6b. Feature Flags / Feature Toggles
**Status: ✅ Fully Implemented**

- `apps/admin/src/components/customer-portal/feature-toggles.tsx` — Full UI with category grouping, warning messages ✅
- 14 feature flags covering core pages and subscription actions ✅
- `packages/portal/src/features/isEnabled.ts` — DB-backed feature flag resolver with 1-minute cache ✅
- `DEFAULT_PORTAL_FEATURES` sane defaults (subscriptionCancelSelfServe defaults to `false`) ✅

**Minor Gap:** `packages/portal` feature flags use `portal.` prefix (e.g., `portal.subscription_pause`) but admin types use camelCase (`subscriptionPause`). Conversion logic exists in `isEnabled.ts` but inconsistency is a maintenance risk.

---

#### 6c. Branding / Logo / Colors (Admin UI)
**Status: ✅ Mostly Implemented**

- `apps/admin/src/components/customer-portal/branding-editor.tsx` — Colors, fonts, border radius ✅
- Reset to defaults button ✅
- Save persists to `/api/admin/customer-portal/settings` ✅

**Gaps:**
- Logo upload UI not in `branding-editor.tsx` (no file upload, only URL entry in types)
- No live preview
- Google Fonts list hardcoded to 10 options

---

#### 6d. Messaging Customization
**Status: ✅ Fully Implemented**

- `apps/admin/src/components/customer-portal/messaging-editor.tsx` — All messaging string fields ✅
- `PortalMessaging` type with welcome message, page titles, empty states ✅
- `packages/portal/src/content/getContent.ts` + `defaults.ts` — Content resolution ✅

---

#### 6e. Custom Domain Admin Config
**Status: ⚠️ UI Only — Not Wired to Backend**

- UI input + SSL badge in `portal-settings-client.tsx` ✅ (visual)
- `handleSaveDomain()` sends `{ customDomain }` to the settings API route
- **The settings PUT route (`apps/admin/src/app/api/admin/customer-portal/settings/route.ts`) does NOT handle `customDomain`** — it only processes `features`, `branding`, `messaging`, `enabled`
- No `updateCustomDomain()` function in `apps/admin/src/lib/customer-portal/db.ts`
- SSL provisioning automation: ❌ no implementation

---

#### 6f. Customer Lookup & Impersonation
**Status: ✅ Fully Implemented**

- `apps/admin/src/components/customer-portal/customer-lookup.tsx` ✅
- `apps/admin/src/app/admin/customer-portal/customer-detail-panel.tsx` — Customer detail with comms prefs ✅
- `apps/admin/src/app/api/admin/customer-portal/customers/route.ts` — Search API ✅
- `apps/admin/src/app/api/admin/customer-portal/customers/[id]/route.ts` — Individual customer ✅
- `apps/admin/src/app/api/admin/customer-portal/customers/[id]/impersonate/route.ts` — Session impersonation ✅
- `createImpersonationSession()`, `endImpersonationSession()`, `logImpersonationAction()` in DB layer ✅

---

#### 6g. Portal Analytics
**Status: ✅ Fully Implemented**

- `apps/admin/src/components/customer-portal/portal-analytics.tsx` — KPI cards, date presets ✅
- `apps/admin/src/app/api/admin/customer-portal/analytics/route.ts` ✅
- `getPortalAnalytics()` DB function with login, page view, action tracking ✅
- 7d / 30d / 90d presets ✅

**Gap:** No line charts rendered (only KPI cards + top pages/actions lists). Phase plan specifies trend charts.

---

## Summary Classification Table

| Feature Area | Status | Notes |
|---|---|---|
| **Auth: OAuth infrastructure** | ✅ Full | PKCE, session, token refresh |
| **Auth: Login page UI** | ❌ Missing | No /login route exists |
| **Auth: OAuth callback route** | ❌ Missing | No /api/auth/callback route |
| **Dashboard** | ✅ Full | |
| **Order list** | ✅ Full | |
| **Order detail** | ✅ Full | |
| **Order tracking widget** | ⚠️ Partial | Static display only |
| **Order cancellation** | ✅ Full | |
| **Returns / RMA** | ✅ Full | Basic flow |
| **Subscription list** | ✅ Full | |
| **Subscription detail UI** | ✅ Full | All components present |
| **Subscription API URL routing** | ❌ Broken | Calls /api/subscriptions, routes at /api/account/subscriptions |
| **Pause / Resume** | ⚠️ Partial | Routes exist, URL mismatch breaks client |
| **Skip delivery** | ⚠️ Partial | Route exists, URL mismatch breaks client |
| **Cancel subscription** | ❌ Missing | UI exists, no API route |
| **Reactivate subscription** | ❌ Missing | UI exists, no API route |
| **Reschedule** | ❌ Missing | UI exists, no API route |
| **Order Now** | ❌ Missing | UI exists, no API route |
| **Update frequency** | ❌ Missing | UI exists, no API route |
| **Product swap** | ❌ Missing | UI exists, no API route |
| **Payment method update (sub)** | ❌ Missing | UI exists, no API route |
| **Address update on sub** | ❌ Missing | No edit UI or route |
| **Profile settings** | ✅ Full | |
| **Address book** | ✅ Full | |
| **Payment methods page** | ❌ Missing | No standalone page |
| **Notification preferences** | ❌ Missing | No customer-facing page |
| **CSS theme generation** | ✅ Full | |
| **Theme DB loader** | ✅ Full | |
| **Custom domain routing** | ✅ Full | Middleware works |
| **Custom domain admin save** | ❌ Broken | API route ignores customDomain |
| **SSL auto-provisioning** | ❌ Missing | Not implemented |
| **Dark mode** | ⚠️ Partial | Bug in contrast color logic |
| **Custom fonts** | ✅ Full | |
| **Custom CSS** | ✅ Full | |
| **Favicon injection** | ⚠️ Partial | In DB, not injected in layout |
| **Live theme preview** | ❌ Missing | |
| **Portal enable/disable** | ✅ Full | |
| **Feature flags** | ✅ Full | |
| **Branding editor (admin)** | ✅ Full | No live preview |
| **Messaging editor (admin)** | ✅ Full | |
| **Custom domain admin UI** | ⚠️ Partial | UI only, not persisted |
| **Customer lookup** | ✅ Full | |
| **Admin impersonation** | ✅ Full | |
| **Portal analytics** | ✅ Full | No trend charts |

---

## Prioritized TODO List

### 🔴 P0 — Blocking / Critical (Must fix before any customer use)

#### P0-1: Create Customer Login Page
**File:** `apps/storefront/src/app/login/page.tsx` (new file)  
**File:** `apps/storefront/src/app/api/auth/callback/route.ts` (new file)  
**File:** `apps/storefront/src/app/api/auth/logout/route.ts` (new file)

```
TODO: Create /login page that:
  - Renders branded login UI using portal theme CSS variables
  - Calls initiateShopifyLogin() from packages/portal/src/auth/oauth.ts
  - Redirects user to Shopify OAuth authorization URL
  - Uses content strings: login.title, login.subtitle, login.button, login.error

TODO: Create /api/auth/callback/route.ts that:
  - Reads ?code= and ?state= query params
  - Calls handleShopifyCallback() from packages/portal/src/auth/oauth.ts
  - Creates session via createCustomerSession()
  - Redirects to redirectAfterLogin destination

TODO: Create /api/auth/logout/route.ts that:
  - Calls logout() from packages/portal/src/auth/session.ts
  - Clears session cookie
  - Redirects to /login

TODO: Add requireNoAuth() guard to login page (if already logged in, redirect to /account)
```

---

#### P0-2: Fix Subscription API URL Mismatch
**File:** `apps/storefront/src/lib/subscriptions/api.ts`

```
TODO: Change API_BASE_URL from '/api/subscriptions' to '/api/account/subscriptions'
  (One-line fix. All existing route handlers at /api/account/subscriptions/* will immediately work.)

TODO: After fix, verify all existing routes work:
  - GET /api/account/subscriptions → list
  - GET /api/account/subscriptions/[id] → detail
  - POST /api/account/subscriptions/[id]/pause → pause
  - POST /api/account/subscriptions/[id]/resume → resume
  - POST /api/account/subscriptions/[id]/skip → skip
```

---

#### P0-3: Create Missing Subscription API Routes

These routes are called by the subscription UI but do not exist:

```
TODO: Create apps/storefront/src/app/api/account/subscriptions/[id]/cancel/route.ts
  - POST handler: validates session, validates feature flag subscriptionCancelSelfServe
  - Accepts body: { reason: string, saveOffer?: string }
  - Calls subscription provider cancel API
  - Updates local subscription record to status='cancelled'

TODO: Create apps/storefront/src/app/api/account/subscriptions/[id]/reactivate/route.ts
  - POST handler: validates session
  - Calls subscription provider reactivate API
  - Updates local record to status='active'

TODO: Create apps/storefront/src/app/api/account/subscriptions/[id]/reschedule/route.ts
  - POST handler: accepts { newDate: string (ISO) }
  - Validates subscriptionReschedule feature flag
  - Updates next billing date

TODO: Create apps/storefront/src/app/api/account/subscriptions/[id]/order-now/route.ts
  - POST handler: triggers immediate order
  - Returns order confirmation

TODO: Create apps/storefront/src/app/api/account/subscriptions/[id]/frequency/route.ts
  - PATCH handler: accepts { interval: number, intervalUnit: string }
  - Validates subscriptionFrequencyUpdate feature flag
  - Updates subscription frequency

TODO: Create apps/storefront/src/app/api/account/subscriptions/[id]/swap/route.ts
  - POST handler: accepts { oldItemId, newVariantId, quantity }
  - Validates subscriptionProductSwap feature flag

TODO: Create apps/storefront/src/app/api/account/subscriptions/payment-methods/route.ts
  - GET: return saved payment methods for customer

TODO: Create apps/storefront/src/app/api/account/subscriptions/[id]/payment-link/route.ts
  - POST: send email with secure payment update link

TODO: Create apps/storefront/src/app/api/account/subscriptions/[id]/address/route.ts
  - PATCH: update shipping address on subscription
  - Validates subscriptionAddressUpdate feature flag
```

---

#### P0-4: Fix Custom Domain Admin Save
**File:** `apps/admin/src/app/api/admin/customer-portal/settings/route.ts`  
**File:** `apps/admin/src/lib/customer-portal/db.ts`

```
TODO: Add updateCustomDomain() function to db.ts:
  - SQL: UPDATE portal_settings SET custom_domain = $1 WHERE tenant_id = $2
  - Also update ssl_status to 'pending' when domain changes

TODO: Update settings PUT route to handle customDomain in request body:
  - Extract customDomain from body
  - Validate domain format (basic hostname regex)
  - Call updateCustomDomain()
  - Return updated settings including customDomain

TODO: Validate that domain does not conflict with existing tenant custom domains
```

---

### 🟠 P1 — High Priority (Core feature gaps)

#### P1-1: Create Payment Methods Page
**File:** `apps/storefront/src/app/account/payment-methods/page.tsx` (new)  
**File:** `apps/storefront/src/app/api/account/payment-methods/route.ts` (new)

```
TODO: Create /account/payment-methods page:
  - List all saved payment methods (cards, wallets)
  - Add new payment method via Shopify Customer Account API
  - Set default payment method
  - Remove payment method (with safeguard if used in active subscription)
  - Follows portal theme CSS variables

TODO: Create GET /api/account/payment-methods route
TODO: Create POST /api/account/payment-methods route (add)
TODO: Create DELETE /api/account/payment-methods/[id] route (remove)
TODO: Create PATCH /api/account/payment-methods/[id]/default route (set default)

TODO: Add "Payment Methods" to account layout navigation
TODO: Add feature flag check (can be behind 'profile' feature or new 'paymentMethods' flag)
```

---

#### P1-2: Create Notification Preferences Page
**File:** `apps/storefront/src/app/account/notifications/page.tsx` (new)  
**File:** `apps/storefront/src/app/api/account/notifications/route.ts` (new)

```
TODO: Create /account/notifications page:
  - Render all toggles from CommunicationPreference type:
    - orderConfirmations, shippingUpdates, subscriptionReminders (email)
    - marketingEmails (email)
    - smsNotifications, promotionalSms (SMS)
  - Save preferences per-customer

TODO: Create GET /api/account/notifications route (load prefs)
TODO: Create PUT /api/account/notifications route (save prefs)

TODO: Wire to admin communication-prefs.tsx (same data, read-only in admin view)

TODO: Add "Notifications" to account layout navigation
```

---

#### P1-3: Add Subscription Shipping Address Edit UI
**File:** `apps/storefront/src/app/account/subscriptions/components/subscription-details.tsx`

```
TODO: Add "Edit" button to ShippingAddress component in subscription detail
TODO: Create address picker modal that shows existing addresses from address book
TODO: Add "Use this address" action that calls PATCH /api/account/subscriptions/[id]/address
TODO: Respect subscriptionAddressUpdate feature flag (hide edit button if disabled)
```

---

#### P1-4: Fix Dark Mode Contrast Bug
**File:** `packages/portal/src/theme/generator.ts`

```
TODO: Replace string comparison with proper luminance calculation:
  // WRONG:
  adjustLightness(primary, primary > '#888888' ? -40 : 40)

  // CORRECT: Calculate luminance from HSL
  function shouldUseLightForeground(hex: string): boolean {
    const { l } = hexToHSL(hex)
    return l < 50  // dark background needs light foreground
  }
  adjustLightness(primary, shouldUseLightForeground(primary) ? 40 : -40)

TODO: Apply same fix to secondary and darkSecondary foreground calculations
```

---

#### P1-5: Implement Dynamic Favicon Injection
**File:** `apps/storefront/src/app/layout.tsx`

```
TODO: Load portal theme config in root layout
TODO: Export dynamic metadata with favicon from theme:
  export async function generateMetadata() {
    const theme = await loadPortalTheme(tenantSlug)
    return {
      icons: { icon: theme.faviconUrl ?? '/favicon.ico' }
    }
  }
TODO: Ensure favicon URL is absolute or proxied (CDN URL)
```

---

### 🟡 P2 — Medium Priority (Quality / Completeness)

#### P2-1: Live Theme Preview in Admin
**File:** `apps/admin/src/components/customer-portal/branding-editor.tsx`

```
TODO: Add preview panel alongside branding editor
  - Use an iframe pointing to /account (customer portal dashboard) with ?preview=1 query
  - Pass theme overrides as URL-encoded JSON or via postMessage
  - Update iframe in real-time as color/font changes are made
  - "Preview" toggle button shows/hides the preview pane

TODO: Create /api/portal/theme/preview route that accepts theme overrides and returns CSS
TODO: Create a PreviewProvider context in storefront that reads preview params
```

---

#### P2-2: Carrier Tracking Webhook Integration
**File:** `apps/storefront/src/app/api/webhooks/` (new directory)

```
TODO: Add webhook receiver for shipping carriers (EasyPost, Shippo, or native Shopify)
TODO: Update order tracking status in DB on webhook receipt
TODO: Create rich tracking timeline component (steps: Processing → Shipped → Out for Delivery → Delivered)
TODO: Support multi-package display for split shipments
```

---

#### P2-3: Logo Upload UI in Admin
**File:** `apps/admin/src/components/customer-portal/branding-editor.tsx`

```
TODO: Add file upload input for logo and favicon (in addition to URL input)
TODO: Upload to platform CDN (S3/CloudFront)
TODO: Store URL in portal branding
TODO: Support dark mode logo (logoDarkUrl field already in DB)
```

---

#### P2-4: Analytics Trend Charts
**File:** `apps/admin/src/components/customer-portal/portal-analytics.tsx`

```
TODO: Add line chart for loginsByDay data (already returned by API)
TODO: Add line chart for pageViewsByDay data (already returned by API)
TODO: Use recharts or the platform's existing chart library
TODO: Show 7-day rolling trend vs previous period comparison
```

---

#### P2-5: Expand Google Fonts List in Branding Editor
**File:** `apps/admin/src/components/customer-portal/branding-editor.tsx`

```
TODO: Replace hardcoded 10-font array with dynamic Google Fonts API lookup
  OR expand list to top 50 fonts with categories (sans-serif, serif, display, monospace)
TODO: Add font preview rendering in the dropdown
TODO: Validate custom fonts URL before saving
```

---

#### P2-6: Feature Flag Key Naming Consistency
**File:** `packages/portal/src/features/isEnabled.ts`  
**File:** `apps/admin/src/lib/customer-portal/types.ts`

```
TODO: Reconcile snake_case DB keys (portal.subscription_pause) with camelCase admin types (subscriptionPause)
  Options:
  a) Standardize on camelCase throughout and update DB seed/migration
  b) Add a canonical key mapping constant shared between packages

TODO: Add subscription_frequency_update and subscription_product_swap to PortalFeatures type in admin
  (These are in packages/portal DEFAULT_FEATURES but missing from admin PortalFeatures interface)
```

---

#### P2-7: Custom CSS Security
**File:** `apps/storefront/src/app/api/portal/theme/route.ts`

```
TODO: Add server-side CSS sanitization for customCss field
  - Strip potential XSS vectors (url() with javascript:, expression(), etc.)
  - Max length validation (e.g., 50KB)
  - Log when custom CSS is saved with tenant + user info for audit trail
```

---

### 🔵 P3 — Low Priority / Nice to Have

#### P3-1: SSL Auto-Provisioning for Custom Domains

```
TODO: Integrate with Cloudflare API or Let's Encrypt/Certbot
TODO: After custom domain saved: trigger DNS verification check (CNAME lookup)
TODO: If DNS verified: initiate SSL certificate request
TODO: Webhook/polling: update ssl_status in DB when cert is issued or fails
TODO: Admin UI: show DNS instructions (CNAME record to add) when domain is set but not verified
```

---

#### P3-2: Account Dashboard Widget Improvements

```
TODO: Add recent subscription orders widget to dashboard
TODO: Add loyalty/rewards balance widget (feature-flagged)
TODO: Add referral code widget (feature-flagged)
TODO: Add store credit balance widget (feature-flagged)
TODO: Render quick-action buttons based on feature flags (not just nav links)
```

---

#### P3-3: RMA / Return Workflow Enhancement

```
TODO: Label generation integration (EasyPost, Shippo)
TODO: RMA number display in return confirmation
TODO: Return status tracking page at /account/orders/[id]/returns/[returnId]
TODO: Return status updates via carrier webhook
```

---

#### P3-4: Email Verification on Profile Update

```
TODO: When customer changes email (if allowed via Shopify API): send verification email
TODO: Don't commit email change until verified
TODO: Currently profile update only allows firstName, lastName, phone — email is read-only (correct)
  but there's no visible UI indicator that email can't be changed
```

---

## File Reference Index

| File | Feature | Status |
|---|---|---|
| `packages/portal/src/auth/oauth.ts` | OAuth PKCE flow | ✅ |
| `packages/portal/src/auth/session.ts` | Session management | ✅ |
| `packages/portal/src/auth/middleware.ts` | Auth guards | ✅ |
| `packages/portal/src/auth/pkce.ts` | PKCE helpers | ✅ |
| `packages/portal/src/theme/generator.ts` | CSS generation | ✅ (bug in dark mode) |
| `packages/portal/src/theme/loader.ts` | Theme DB loader | ✅ |
| `packages/portal/src/features/isEnabled.ts` | Feature flags | ✅ |
| `packages/portal/src/content/defaults.ts` | Content strings | ✅ |
| `packages/portal/src/api/subscriptions.ts` | Subscription API module | ✅ |
| `packages/portal/src/api/addresses.ts` | Address API module | ✅ |
| `apps/storefront/src/app/account/page.tsx` | Dashboard | ✅ |
| `apps/storefront/src/app/account/layout.tsx` | Account layout | ✅ |
| `apps/storefront/src/app/account/orders/page.tsx` | Order list | ✅ |
| `apps/storefront/src/app/account/orders/[id]/page.tsx` | Order detail | ✅ |
| `apps/storefront/src/app/account/subscriptions/page.tsx` | Sub list | ✅ |
| `apps/storefront/src/app/account/subscriptions/[id]/page.tsx` | Sub detail | ✅ (UI) |
| `apps/storefront/src/app/account/subscriptions/components/subscription-actions.tsx` | Sub actions | ⚠️ URL broken |
| `apps/storefront/src/app/account/subscriptions/components/cancellation-flow.tsx` | Cancel flow | ⚠️ No API |
| `apps/storefront/src/app/account/subscriptions/components/payment-method-modal.tsx` | Payment modal | ⚠️ No API |
| `apps/storefront/src/app/account/subscriptions/components/product-swap-modal.tsx` | Product swap | ⚠️ No API |
| `apps/storefront/src/app/account/profile/page.tsx` | Profile page | ✅ |
| `apps/storefront/src/app/account/addresses/page.tsx` | Address book | ✅ |
| `apps/storefront/src/lib/subscriptions/api.ts` | Sub API client | ❌ Wrong base URL |
| `apps/storefront/src/app/api/account/subscriptions/` | Sub API routes | ⚠️ Incomplete |
| `apps/storefront/src/app/api/portal/theme/route.ts` | Theme API | ✅ |
| `apps/storefront/src/middleware.ts` | Tenant + domain routing | ✅ |
| `apps/admin/src/app/admin/customer-portal/page.tsx` | Admin portal page | ✅ |
| `apps/admin/src/app/admin/settings/portal/portal-settings-client.tsx` | Portal settings | ⚠️ Domain not saved |
| `apps/admin/src/app/api/admin/customer-portal/settings/route.ts` | Settings API | ⚠️ Missing domain |
| `apps/admin/src/components/customer-portal/feature-toggles.tsx` | Feature toggles | ✅ |
| `apps/admin/src/components/customer-portal/branding-editor.tsx` | Branding editor | ✅ (no preview) |
| `apps/admin/src/components/customer-portal/messaging-editor.tsx` | Messaging | ✅ |
| `apps/admin/src/components/customer-portal/customer-lookup.tsx` | Customer lookup | ✅ |
| `apps/admin/src/components/customer-portal/communication-prefs.tsx` | Admin comms prefs | ✅ (admin-side only) |
| `apps/admin/src/components/customer-portal/portal-analytics.tsx` | Analytics | ✅ (no charts) |
| `apps/admin/src/lib/customer-portal/db.ts` | Portal DB ops | ⚠️ Missing updateCustomDomain |
| `apps/admin/src/lib/customer-portal/types.ts` | Admin types | ✅ |

---

## Notes on Phase Doc Compliance

The PHASE-3CP docs were found at `MULTI-TENANT-PLATFORM-PLAN/phases/` (not the root as specified in task — no files were missing, just nested deeper).

**Key divergences from plan:**
1. Plan specifies a separate `apps/portal/` application — implementation embeds portal in `apps/storefront/` under `/account/*` routes. This is acceptable but means the portal shares the storefront's middleware and layout.
2. Plan specifies `packages/portal` as the shared library — this exists and is properly structured.
3. Plan requires OAuth flow UI (login page, callback) — these are not implemented despite the backend being complete.
4. Plan requires standalone payment methods — not implemented.
5. Plan requires customer notification preferences — not implemented on customer side.
6. Plan requires live theme preview — not implemented.

---

*Report generated by Agent 14 — 2026-02-19*
