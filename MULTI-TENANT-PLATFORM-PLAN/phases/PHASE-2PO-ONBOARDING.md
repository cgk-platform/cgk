# PHASE-2PO-ONBOARDING: Brand Onboarding Wizard

**Status**: COMPLETE
**Completed**: 2026-02-10

**Duration**: Week 10 (5 days)
**Depends On**: Phase 1 (database, auth), Phase 2A (super admin shell), Shopify OAuth setup, Stripe Connect setup
**Parallel With**: None
**Blocks**: None (brands can be created once complete)

---

## Goal

Implement a 9-step brand onboarding wizard that creates tenant organizations with Shopify OAuth connection, domain configuration, Stripe Connect setup, third-party integrations, feature module selection, product import, user invitations, and launch verification.

---

## Success Criteria

- [ ] All 9 wizard steps complete and functional
- [ ] Shopify OAuth flow authenticates and stores credentials
- [ ] Stripe Connect integration creates connected account
- [ ] Feature toggles save to organization settings
- [ ] User invitations send via email
- [ ] Data import from Shopify syncs products, customers, orders
- [ ] Launch verification checks all required items
- [ ] Session persists across page reloads
- [ ] Abandoned sessions can be resumed later
- [ ] Post-onboarding welcome email sends
- [ ] Guided tour displays for new admin users

---

## Deliverables

### 9-Step Wizard

| Step | Name | Required | Can Skip | Description |
|------|------|----------|----------|-------------|
| 1 | Basic Information | Yes | No | Brand name, slug, colors, logo |
| 2 | Connect Shopify | Yes | No | OAuth flow + headless checkout configuration |
| 2b | Shopify Setup | Yes | No | Checkout redirects, post-purchase redirect, cart attributes, webhooks |
| 3 | Configure Domains | No | Yes | Custom domain setup with Vercel provisioning + DNS instructions |
| 4 | Configure Payments | Recommended | Yes | Stripe Connect OAuth, Wise API key setup |
| 5 | Connect Integrations | No | Yes | Meta/Google/TikTok Ads, GA4, Klaviyo, Yotpo, Slack |
| 6 | Enable Features | Yes | No | Module toggles for creators, reviews, attribution, A/B, subscriptions, MCP |
| 7 | Import Products | No | Yes | Shopify product sync to local DB (for fast storefront) |
| 8 | Invite Users | No | Yes | Email invitations with role (admin/member) |
| 9 | Review & Launch | Yes | No | Checklist verification and go-live |

### Key UX Principle: Skip is Always Available

All optional steps have a prominent "Skip for Now" button. The wizard clearly communicates:
- **What can be configured later** via Admin Settings
- **Nothing blocks launch** except Shopify connection
- **No pressure** to configure optional integrations

> **References**:
> - [DOMAIN-SHOPIFY-CONFIG-SPEC](../DOMAIN-SHOPIFY-CONFIG-SPEC-2025-02-10.md) - Domains, Shopify headless, product sync
> - [INTEGRATIONS-CONFIG-SPEC](../INTEGRATIONS-CONFIG-SPEC-2025-02-10.md) - All OAuth and API key integrations

### Database Tables

- `onboarding_sessions` - Track wizard progress and step data
- Extend `organizations` with: `onboarding_status`, `onboarding_completed_at`, `setup_checklist`

### API Routes

```
/api/platform/onboarding/
  route.ts              - POST create session
  [id]/route.ts         - GET session state
  [id]/step/route.ts    - POST step completion

/api/platform/brands/
  onboard/step-1/route.ts  - POST create org
  launch/route.ts          - POST launch brand

/api/platform/shopify/
  oauth/start/route.ts     - POST initiate OAuth
  oauth/callback/route.ts  - GET/POST OAuth callback
  configure/route.ts       - POST save checkout config
  test-checkout/route.ts   - POST test checkout flow
  webhooks/register/route.ts - POST register webhooks

/api/platform/domains/
  add/route.ts          - POST add domain to Vercel
  verify/route.ts       - POST verify DNS configuration
  remove/route.ts       - DELETE remove domain
  status/route.ts       - GET domain verification status

/api/platform/stripe/oauth/
  start/route.ts        - POST initiate Connect
  callback/route.ts     - GET/POST OAuth callback

/api/platform/import/
  products/route.ts     - POST start product sync
  [jobId]/status/route.ts - GET import progress

/api/platform/users/
  invite/route.ts       - POST send invitation
```

### Packages Required

```
packages/domains/           - Vercel domain API integration
  src/
    vercel.ts              - Domain add/verify/remove
    types.ts               - DNSRecord, DomainStatus types
```

### Page Structure

```
apps/orchestrator/src/app/brands/new/
  page.tsx              - Wizard container
  step-1/page.tsx       - Basic info form
  step-2/page.tsx       - Shopify OAuth
  step-2/configure/page.tsx - Shopify checkout configuration
  step-3/page.tsx       - Domain configuration + DNS instructions
  step-4/page.tsx       - Payment providers (Stripe, Wise)
  step-5/page.tsx       - Feature modules
  step-6/page.tsx       - Product import
  step-7/page.tsx       - User invitations
  step-8/page.tsx       - Launch checklist
```

### Shopify OAuth Scopes Required

```
read_products, write_products,
read_orders, write_orders,
read_customers, write_customers,
read_inventory, write_inventory,
read_fulfillments, write_fulfillments,
read_shipping, write_shipping,
read_analytics,
read_price_rules, write_price_rules,
read_discounts, write_discounts,
read_checkouts, write_checkouts,
read_themes, write_themes,
read_content, write_content,
read_locales, write_locales
```

### Feature Modules (Step 4)

1. **Creator Portal** - UGC creator management, applications, payouts (requires Stripe)
2. **Reviews System** - Product reviews with email automation
3. **Marketing Attribution** - Touchpoint tracking and conversion attribution
4. **A/B Testing** - Experiments on pricing, shipping, checkout
5. **Subscriptions** - Recurring billing products (requires Shopify)
6. **MCP Integration** - AI assistant access via Model Context Protocol

### Launch Checklist (Step 8)

- [x] Basic information configured
- [x] Shopify store connected
- [x] Checkout redirects configured
- [x] Post-checkout redirect script added to Shopify
- [x] Webhooks verified
- [ ] Custom domain configured (optional)
- [ ] Domain DNS verified (if custom domain)
- [ ] Stripe connected (optional but recommended)
- [x] Features configured
- [x] Products imported to local DB
- [ ] Test order placed (optional)

---

## Constraints

- Slug MUST match pattern `^[a-z0-9-]+$` and be unique
- OAuth state MUST be HMAC-verified to prevent CSRF
- Stripe Connect MUST use platform credentials
- Session storage: Redis with 7-day expiry
- Data import runs as background job with progress polling
- Webhook verification MUST complete before launch

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - REQUIRED for all wizard UI components

**Spec documents:**
- `BRAND-ONBOARDING-SPEC-2025-02-10.md` - Complete implementation details
- `FRONTEND-DESIGN-SKILL-GUIDE.md` - Skill invocation patterns

**RAWDOG code to reference:**
- `/src/app/api/oauth/shopify/` - Existing Shopify OAuth pattern (if exists)
- `/src/lib/shopify/` - Shopify API client patterns

**MCPs to consult:**
- Shopify Dev MCP: "OAuth flow implementation"
- Context7 MCP: "Stripe Connect platform setup"

---

## Frontend Design Skill Integration

**MANDATORY**: The onboarding wizard is a critical user flow. Each step MUST use `/frontend-design`.

### Onboarding Design Principles

- **Progress clarity**: User should always know where they are (step X of 7)
- **Encouragement**: Celebrate progress, don't overwhelm
- **Resumability**: Show that session is saved, can return later
- **Error recovery**: Clear guidance when OAuth or integrations fail
- **Skip handling**: Optional steps should be clearly skippable

### Component-Specific Skill Prompts

**1. Wizard Container & Progress:**
```
/frontend-design

Building 9-step onboarding wizard container for PHASE-2PO-ONBOARDING.

Requirements:
- Progress indicator at top:
  - 9 steps shown as connected dots or segments
  - States: completed (checkmark + filled), current (highlighted), upcoming (muted)
  - Step labels visible on desktop, hidden on mobile (tooltip on hover)
  - Labels: Basic Info, Shopify, Domains, Payments, Integrations, Features, Products, Users, Launch

- Navigation:
  - "Back" button (disabled on step 1)
  - "Next" / "Save & Continue" button
  - "Skip for Now" option for optional steps (3, 4, 5, 7, 8) - clearly styled but not prominent

- Session indicator:
  - "Your progress is automatically saved" reassurance
  - If returning to abandoned session: "Welcome back! Continue where you left off"

Layout:
- Centered content area (max-width ~600px)
- Progress indicator full-width above content
- Navigation buttons at bottom of content

Design:
- Clean, focused, non-distracting
- Single task per step
- Mobile-friendly (full-width on small screens)
```

**2. Step 1 - Basic Info Form:**
```
/frontend-design

Building brand info form for onboarding step 1 (PHASE-2PO-ONBOARDING).

Requirements:
- Form fields:
  - Brand Name (text input, required)
    - Auto-generates slug as user types
  - Slug (text input, required)
    - Shows "yourslug.platform.com" preview
    - Real-time availability check with indicator
  - Custom Domain (text input, optional)
    - "yourstore.com" format
  - Primary Color (color picker or preset swatches)
  - Logo Upload (dropzone)
    - Accept .png, .jpg, .svg
    - Preview after upload
    - Optional, can use initials as fallback

- Validation:
  - Slug format: lowercase, numbers, hyphens only
  - Slug uniqueness: async check as user types
  - Show inline errors

- Submit button: "Create Brand & Continue"

Design:
- Clear labels and helper text
- Slug auto-generation is helpful but editable
- Color picker should be simple (swatches or basic picker)
```

**3. Step 2 - Shopify OAuth:**
```
/frontend-design

Building Shopify connection step for onboarding (PHASE-2PO-ONBOARDING).

Requirements:
- Pre-connection state:
  - Shopify logo
  - Brief explanation: "Connect your Shopify store to sync products, orders, and customers"
  - Store URL input (if not auto-detected): "yourstore.myshopify.com"
  - "Connect to Shopify" primary button
  - List of permissions being requested (expandable)

- Connection in progress:
  - Loading state: "Connecting to Shopify..."
  - Redirects to Shopify OAuth

- Success state:
  - Green checkmark + "Connected!"
  - Store name and URL displayed
  - "Products will be synced automatically"
  - "Continue" button

- Error state:
  - Red indicator
  - Error message: "Connection failed. Please try again."
  - "Retry" button
  - "Contact support" link

Design:
- OAuth should feel secure and trustworthy
- Clear success/error feedback
```

**4. Step 4 - Feature Toggles:**
```
/frontend-design

Building feature selection step for onboarding (PHASE-2PO-ONBOARDING).

Requirements:
- Grid of feature cards (2 columns on desktop, 1 on mobile):
  1. Creator Portal - icon, description, toggle switch
  2. Reviews System - icon, description, toggle switch
  3. Marketing Attribution - icon, description, toggle switch
  4. A/B Testing - icon, description, toggle switch
  5. Subscriptions - icon, description, toggle switch
  6. MCP Integration - icon, description, toggle switch

- Each feature card:
  - Icon (top-left)
  - Feature name (bold)
  - Short description (1-2 sentences)
  - Toggle switch (right side)
  - "Requires: Stripe" note if applicable (grayed out if requirement not met)

- Disabled features:
  - Grayed out toggle
  - Tooltip explaining why (e.g., "Requires Stripe connection in Step 3")

- "Select All" / "Deselect All" option

Design:
- Easy to scan and toggle
- Visual indication of what's enabled
- Dependencies clearly communicated
```

**5. Step 8 - Launch Checklist:**
```
/frontend-design

Building launch checklist for final onboarding step 8 (PHASE-2PO-ONBOARDING).

Requirements:
- Checklist items with status:
  - ✓ Basic information configured
  - ✓ Shopify store connected
  - ✓ Checkout redirects configured
  - ✓ Post-checkout redirect script added
  - ✓ Webhooks verified
  - △ Custom domain configured (optional)
  - △ Domain DNS verified (if custom domain)
  - △ Stripe connected (optional but recommended)
  - ✓ Features configured
  - ✓ Products imported to local DB
  - △ Test order placed (optional)

- Status indicators:
  - ✓ Pass: green checkmark
  - △ Optional/Warning: yellow triangle (not blocking)
  - ✗ Fail: red X (blocks launch if required)

- Configuration summary:
  - Brand name, slug
  - Storefront URL (custom or platform subdomain)
  - Admin URL (custom or platform subdomain)
  - Shopify store connected
  - Products synced count
  - Connected integrations
  - Enabled features

- Launch section:
  - "Launch Brand" primary button (disabled if required checks fail)
  - Warning if skipping optional items
  - Success state: confetti/celebration, "Your brand is live!"

Design:
- Clear pass/fail status at a glance
- Summary provides confidence before launch
- Celebration on success!
```

### Workflow for Onboarding UI

1. **Invoke `/frontend-design`** for each step page
2. **Test the full flow**: Create a test brand through all 8 steps
3. **Test abandonment**: Close mid-wizard, return later, verify resume
4. **Test error states**: Fail OAuth, retry, ensure recovery works
5. **Mobile test**: Full wizard flow on 390px width

---

## AI Discretion Areas

The implementing agent should determine:
1. Whether to use step-based routes or single-page wizard with state
2. Optimal import batch sizes for Shopify data
3. Whether webhooks should be verified synchronously or via callback
4. Invitation email template design

---

## Tasks

### [PARALLEL] Database Setup
- [ ] Create `onboarding_sessions` table
- [ ] Add `onboarding_status`, `onboarding_completed_at`, `setup_checklist` to organizations
- [ ] Create session expiry cleanup job

### [PARALLEL] Onboarding Hook
- [ ] Implement `OnboardingContext` and `OnboardingProvider`
- [ ] Implement `useOnboarding()` hook with all methods
- [ ] Implement session persistence to sessionStorage
- [ ] Implement session load/create on mount
- [ ] Implement step navigation methods

### [SEQUENTIAL after hook] Step 1: Basic Info
- [ ] Build form with name, slug, domain, color, logo
- [ ] Implement slug auto-generation from name
- [ ] Implement slug availability check
- [ ] Implement organization creation
- [ ] Implement tenant schema creation

### [SEQUENTIAL after step 1] Step 2: Shopify OAuth
- [ ] Implement OAuth start endpoint with HMAC state
- [ ] Implement OAuth callback with token exchange
- [ ] Store credentials in organization settings (encrypted)
- [ ] Register webhooks on successful connection
- [ ] Display connection status and store info

### [SEQUENTIAL after step 2] Step 2b: Shopify Headless Configuration
- [ ] Build checkout domain configuration UI
- [ ] Build post-checkout redirect configuration
- [ ] Generate Shopify admin script for merchant
- [ ] Implement cart attribute configuration
- [ ] Implement webhook registration on OAuth complete
- [ ] Build test checkout flow validation

### [PARALLEL with step 2b] Step 3: Domain Configuration
- [ ] Implement `packages/domains/` Vercel API client
- [ ] Build domain add API route with Vercel integration
- [ ] Build DNS instructions component
- [ ] Build domain verification polling
- [ ] Implement verification status tracking in DB
- [ ] Build "skip to platform subdomains" flow
- [ ] Add domain management to admin settings

### [SEQUENTIAL after step 3] Step 4: Payments
- [ ] Implement Stripe Connect OAuth start
- [ ] Implement Stripe Connect callback
- [ ] Implement Wise API key form
- [ ] Store payment provider credentials
- [ ] Allow skip with warning

### [PARALLEL with step 4] Step 5: Features
- [ ] Build feature module toggle cards
- [ ] Display requirements per feature
- [ ] Save feature selection to organization settings

### [SEQUENTIAL after Shopify connected] Step 6: Product Import
- [ ] Build product import selection UI
- [ ] Implement `importShopifyProducts` background job
- [ ] Create tenant `products` table with Shopify sync fields
- [ ] Implement product mapper (Shopify -> local schema)
- [ ] Implement progress polling UI with page count
- [ ] Register product webhooks for real-time sync
- [ ] Allow skip (products will sync on first storefront load)

### [PARALLEL with step 6] Step 7: User Invitations
- [ ] Build email/role input form
- [ ] Build pending invitations list
- [ ] Implement invitation API call
- [ ] Send invitation emails via Resend
- [ ] Allow skip

### [SEQUENTIAL after all steps] Step 8: Launch
- [ ] Build checklist verification UI
- [ ] Implement webhook verification API
- [ ] Implement domain verification check
- [ ] Implement Shopify checkout redirect verification
- [ ] Build configuration summary display
- [ ] Implement launch API endpoint
- [ ] Update organization status to active
- [ ] Display success state with next actions

### [PARALLEL with steps] Session API
- [ ] Implement session creation endpoint
- [ ] Implement session retrieval endpoint
- [ ] Implement step update endpoint
- [ ] Add Redis session storage

### [SEQUENTIAL after launch] Post-Onboarding
- [ ] Implement welcome email template
- [ ] Send welcome email on launch
- [ ] Implement guided tour component
- [ ] Display tour on first admin login

---

## Definition of Done

- [ ] Complete wizard flow from step 1 to launch (8 steps)
- [ ] Shopify OAuth creates valid access token
- [ ] Shopify checkout redirect configuration saves correctly
- [ ] Post-checkout redirect script generated correctly
- [ ] Webhooks auto-register on Shopify connection
- [ ] Custom domains can be added via Vercel API
- [ ] DNS instructions display with correct records
- [ ] Domain verification polling works correctly
- [ ] Stripe Connect creates connected account
- [ ] Feature toggles persist to organization
- [ ] Product import job syncs all products to local DB
- [ ] Product webhook handlers update local DB in real-time
- [ ] Invitations deliver to recipients
- [ ] Launch checklist verifies all required steps
- [ ] Launch enables organization for use
- [ ] Session survives page reload
- [ ] Abandoned session resumable 7 days later
- [ ] Welcome email delivers with correct links
- [ ] `npx tsc --noEmit` passes
- [ ] E2E test for complete onboarding flow passes

---

## Environment Variables Required

```bash
# Vercel Domain Management
VERCEL_ACCESS_TOKEN=           # Team-level access token with domain permissions
VERCEL_TEAM_ID=                # Team ID
VERCEL_ADMIN_PROJECT_ID=       # Project ID for admin app
VERCEL_STOREFRONT_PROJECT_ID=  # Project ID for storefront app

# Shopify App
SHOPIFY_CLIENT_ID=             # Shopify app client ID
SHOPIFY_CLIENT_SECRET=         # Shopify app client secret
SHOPIFY_SCOPES=read_products,write_products,read_orders,...

# Stripe Connect
STRIPE_SECRET_KEY=             # Platform Stripe secret key
STRIPE_CONNECT_CLIENT_ID=      # Stripe Connect OAuth client ID

# Wise Business
WISE_API_KEY=                  # Wise API key
WISE_PROFILE_ID=               # Wise business profile ID
```

---

## Key References

- [DOMAIN-SHOPIFY-CONFIG-SPEC](../DOMAIN-SHOPIFY-CONFIG-SPEC-2025-02-10.md) - Domain setup, Shopify headless config, product sync
- [BRAND-ONBOARDING-SPEC](../BRAND-ONBOARDING-SPEC-2025-02-10.md) - Complete wizard implementation details
- [COMMERCE-PROVIDER-SPEC](../COMMERCE-PROVIDER-SPEC-2025-02-10.md) - Product operations interface
