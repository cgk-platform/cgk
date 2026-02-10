# Frontend Design Skill Guide for Multi-Tenant Platform

> **PURPOSE**: This guide details HOW and WHEN agents should use the `/frontend-design` skill during UI development across all phases. This is MANDATORY reading for any agent working on UI components.

---

## What is the Frontend Design Skill?

The `/frontend-design` skill is a specialized capability that helps create distinctive, production-grade frontend interfaces with high design quality. It:

- Generates creative, polished code that avoids generic AI aesthetics
- Follows modern design patterns and accessibility standards
- Creates components that are visually distinctive and professional
- Understands shadcn/ui, Tailwind CSS, and React component patterns

---

## MANDATORY: When to Invoke `/frontend-design`

**INVOKE BEFORE creating ANY of these:**

| Component Type | Examples | Why Frontend Design |
|----------------|----------|---------------------|
| **Page Layouts** | Admin shell, dashboard, wizard pages | Establishes visual hierarchy and navigation patterns |
| **Data Display** | Tables, grids, cards, lists | Proper density, scannability, action placement |
| **Forms** | Multi-step wizards, settings, inputs | Validation states, error handling, UX flow |
| **Navigation** | Sidebars, tabs, breadcrumbs | Consistent wayfinding, responsive behavior |
| **Dashboard Widgets** | KPI cards, charts, metrics | Data visualization hierarchy |
| **Interactive Elements** | Modals, drawers, dropdowns | Animation, focus management |
| **Status Indicators** | Badges, dots, progress bars | Color semantics, accessibility |
| **Customer-Facing UI** | Product pages, cart, checkout | Conversion optimization, trust signals |

---

## How to Use the Skill: Step-by-Step

### Step 1: Invoke the Skill FIRST

Before writing ANY component code, invoke the skill with context:

```
/frontend-design

I'm building [COMPONENT NAME] for [PHASE/CONTEXT].

Requirements:
- [Requirement 1]
- [Requirement 2]
- [Requirement 3]

Design constraints:
- Using shadcn/ui components
- Tailwind CSS for styling
- [Any specific brand/theme requirements]

User context:
- [Who uses this: admin, creator, customer?]
- [What actions do they need to take?]

Please provide the component implementation.
```

### Step 2: Provide Sufficient Context

**BAD - Too vague:**
```
/frontend-design
Create a dashboard
```

**GOOD - Specific and contextual:**
```
/frontend-design

I'm building the Super Admin Platform KPIs dashboard (PHASE-2SA-DASHBOARD).

Requirements:
- Display 6 KPI metrics: Total GMV, Platform MRR, Total Brands, Active Brands, System Status, Open Alerts
- Each KPI shows value + percentage change from previous period
- System status should show healthy/degraded/critical with color coding
- Open alerts should show P1/P2/P3 breakdown
- Cards should be responsive: 2 cols on mobile, 3 cols on tablet, 6 cols on desktop

Design constraints:
- Using @repo/ui (shadcn-based) Card, Badge components
- Lucide icons for indicators
- Must match existing admin aesthetic (clean, professional, data-dense)

User context:
- Platform operators who need quick status overview
- Glanceable metrics - should understand health in < 3 seconds
- Will drill down by clicking cards

Please provide the PlatformKPICards component.
```

### Step 3: Include Reference Patterns

When referencing existing RAWDOG patterns, include them:

```
/frontend-design

Building the Orders DataTable for PHASE-2B-ADMIN-COMMERCE.

Reference pattern from RAWDOG:
- See `src/app/admin/orders/page.tsx` for current structure
- Uses DataTable with filters, pagination, bulk actions

Requirements:
- Order list with columns: ID, Customer, Total, Status, Date
- Filters: date range, order status, search
- Pagination with 20 items per page
- Bulk actions: export, mark fulfilled

[rest of context...]
```

### Step 4: Request Multiple Variants When Unsure

```
/frontend-design

Building the brand health indicator for PHASE-2SA-DASHBOARD.

I'm unsure about the visual approach. Please provide 2-3 variants:
1. Traffic light style (red/yellow/green dots)
2. Progress bar style with health percentage
3. Icon-based with tooltip details

Requirements:
- Show healthy/degraded/unhealthy state
- Must be accessible (not color-only)
- Compact for use in grid cards
```

---

## Phase-Specific Frontend Design Guidance

### Phase 2A: Admin Shell (Week 5)

**Components requiring `/frontend-design`:**

1. **Admin Sidebar Navigation**
   ```
   /frontend-design

   Building the admin sidebar for PHASE-2A.

   Requirements:
   - 7 top-level sections with icons
   - Collapsible on mobile (drawer pattern)
   - Current route highlighted
   - Support for nested navigation (expandable sections)
   - Tenant branding at top (logo + name)
   - User menu at bottom

   Sections: Dashboard, Content, Commerce, Attribution, Creators, Finance, Operations, Settings
   ```

2. **Admin Header**
   ```
   /frontend-design

   Building the admin header for PHASE-2A.

   Requirements:
   - Breadcrumb navigation
   - Quick actions (search, notifications)
   - Mobile hamburger toggle for sidebar
   - Tenant name display
   ```

3. **Dashboard KPI Cards**
   ```
   /frontend-design

   Building dashboard KPI cards for PHASE-2A.

   Requirements:
   - Revenue, Orders, Customers, Subscriptions metrics
   - Each card: value, change percentage, sparkline optional
   - Click to drill down to detail
   - 2x2 grid on mobile, 4 cols on desktop
   ```

4. **Escalations Widget**
   ```
   /frontend-design

   Building escalations widget for admin dashboard.

   Requirements:
   - List of items requiring attention
   - Categories: pending reviews, failed payouts, errors
   - Count badges per category
   - Click to navigate to relevant section
   - Compact design, max 5 visible items + "see all"
   ```

---

### Phase 2B: Admin Commerce (Week 5-6)

**Components requiring `/frontend-design`:**

1. **Orders DataTable**
   ```
   /frontend-design

   Building orders list table for PHASE-2B.

   Requirements:
   - Columns: Order ID, Customer, Items, Total, Status, Date, Actions
   - Filters: date range picker, status dropdown, search input
   - Bulk selection with checkbox column
   - Pagination with page size selector
   - Row click navigates to detail
   - Status badges with semantic colors
   ```

2. **Order Detail Page**
   ```
   /frontend-design

   Building order detail page for PHASE-2B.

   Requirements:
   - Order header with ID, status, date
   - Customer info card (name, email, address)
   - Line items table with product, quantity, price
   - Order totals breakdown (subtotal, shipping, tax, discount, total)
   - Fulfillment timeline
   - Action buttons (refund, cancel, resend email)
   ```

3. **Customer List & Detail**
   ```
   /frontend-design

   Building customer list for PHASE-2B.

   Requirements:
   - List with search, sorted by LTV
   - Customer row: avatar, name, email, order count, LTV
   - Detail page: order history, subscription status, notes
   ```

4. **Reviews Moderation Interface**
   ```
   /frontend-design

   Building reviews moderation for PHASE-2B.

   Requirements:
   - Review card: product, star rating, text, customer, date
   - Status indicator: pending/approved/rejected
   - Quick actions: approve, reject
   - Bulk moderation toolbar
   - Filter by status, product, rating
   ```

---

### Phase 2SA: Super Admin Dashboard (Week 6)

**Components requiring `/frontend-design`:**

1. **Platform KPI Cards**
   ```
   /frontend-design

   Building platform-wide KPI cards for super admin (PHASE-2SA).

   Requirements:
   - 6 metrics: GMV, MRR, Total Brands, Active Brands, System Status, Open Alerts
   - GMV/MRR: currency formatted with change %
   - System status: semantic indicator (healthy/degraded/critical)
   - Alerts: P1/P2/P3 breakdown with severity colors
   - Professional, data-dense design
   ```

2. **Brands Grid**
   ```
   /frontend-design

   Building brands grid for super admin (PHASE-2SA).

   Requirements:
   - Brand card: logo, name, slug, status badge
   - Health indicator (dot or icon)
   - 24h metrics: revenue, orders, errors
   - Integration badges (Shopify connected, Stripe connected)
   - Grid layout: responsive columns
   - Click to brand detail
   - Pagination for scale
   ```

3. **Real-Time Alert Feed**
   ```
   /frontend-design

   Building real-time alert feed for PHASE-2SA.

   Requirements:
   - WebSocket-connected live feed
   - Alert item: timestamp, brand, severity, message
   - Severity color coding (P1 red, P2 orange, P3 yellow)
   - Connection status indicator (pulsing dot when connected)
   - Max 50 items with virtualization for performance
   - "New alerts" indicator when scrolled down
   ```

4. **Super Admin Navigation**
   ```
   /frontend-design

   Building orchestrator navigation for PHASE-2SA.

   Requirements:
   - 7 sections: Overview, Brands, Operations, Flags, Users, Analytics, Settings
   - Collapsible sidebar
   - Visual distinction from brand admin (this is platform-level)
   - MFA indicator if applicable
   ```

---

### Phase 2PO: Brand Onboarding Wizard (Week 10)

**Components requiring `/frontend-design`:**

1. **Wizard Container & Progress**
   ```
   /frontend-design

   Building 9-step onboarding wizard for PHASE-2PO-ONBOARDING.

   Requirements:
   - Progress indicator showing current step (1-9)
   - Step labels: Basic Info, Shopify, Domains, Payments, Integrations, Features, Products, Users, Launch
   - Visual states: completed (checkmark), current (highlighted), upcoming (muted)
   - "Skip for Now" option for optional steps (3, 4, 5, 7, 8)
   - Step navigation (back/next buttons)
   - Session persistence indicator
   ```

2. **Step 1: Basic Info Form**
   ```
   /frontend-design

   Building brand info form for onboarding step 1.

   Requirements:
   - Fields: brand name, slug (auto-generated), domain, primary color, logo upload
   - Slug validation with availability check
   - Color picker for brand color
   - Logo dropzone with preview
   - Form validation with inline errors
   ```

3. **Step 2: Shopify OAuth Connection**
   ```
   /frontend-design

   Building Shopify OAuth step for onboarding.

   Requirements:
   - "Connect to Shopify" button
   - Store URL input if needed
   - Connection status indicator
   - Success state with store name/info display
   - Error state with retry option
   - Required scopes list (informational)
   ```

4. **Step 4: Feature Module Toggles**
   ```
   /frontend-design

   Building feature selection step for onboarding.

   Requirements:
   - Feature cards: Creator Portal, Reviews, Attribution, A/B Testing, Subscriptions, MCP
   - Each card: icon, name, description, toggle switch
   - Dependency indicators (e.g., "Requires Stripe")
   - Disabled state for features with unmet requirements
   ```

5. **Step 7: Launch Checklist**
   ```
   /frontend-design

   Building launch checklist for final onboarding step.

   Requirements:
   - Verification items list
   - Each item: description, status (pass/fail/pending), action button
   - Overall readiness indicator
   - "Launch Brand" button (enabled only when required items pass)
   - Summary of configuration
   ```

---

### Phase 3A-3D: Storefront (Weeks 11-14)

**CRITICAL: Storefront is customer-facing. Design quality directly impacts conversion.**

1. **Product Card**
   ```
   /frontend-design

   Building product card for storefront (PHASE-3A).

   Requirements:
   - Product image with hover effect
   - Product title (truncated if long)
   - Price with compare-at display if on sale
   - Quick-add button or "View Options" for variants
   - Wishlist/favorite action
   - Mobile: full-width; Desktop: grid item
   - Accessibility: keyboard navigation, screen reader labels
   ```

2. **Product Detail Page**
   ```
   /frontend-design

   Building PDP for storefront (PHASE-3A).

   Requirements:
   - Image gallery with thumbnails
   - Product title and price
   - Variant selector (size, color as dropdowns or swatches)
   - Quantity selector
   - Add to cart button (prominent)
   - Product description (expandable accordion)
   - Reviews summary (stars + count)
   - Trust badges
   - Mobile-first layout
   ```

3. **Cart Drawer/Page**
   ```
   /frontend-design

   Building cart for storefront (PHASE-3B).

   Requirements:
   - Line items with image, title, variant, price, quantity
   - Quantity adjustment (+/-)
   - Remove item action
   - Subtotal display
   - Promo code input
   - Checkout button (prominent)
   - Upsell/cross-sell section
   - Slide-out drawer on desktop, full page on mobile
   ```

4. **Checkout Flow**
   ```
   /frontend-design

   Building checkout UI scaffold for storefront (PHASE-3B).

   Requirements:
   - Multi-step: Contact, Shipping, Payment, Review
   - Address autocomplete integration
   - Shipping method selection
   - Order summary sidebar
   - Trust signals throughout
   - Express checkout options (Shop Pay, Apple Pay)
   - Mobile-optimized single-column layout
   ```

---

### Phase 4A-4D: Creator Portal (Weeks 15-18)

1. **Creator Dashboard**
   ```
   /frontend-design

   Building creator dashboard for PHASE-4A.

   Requirements:
   - Multi-brand earnings display (card per brand)
   - Each brand card: balance, pending, active projects count
   - Total earnings summary across brands
   - Withdrawal status indicator
   - Recent activity feed
   - Brand switcher if viewing single-brand details
   ```

2. **Brand Earnings Card**
   ```
   /frontend-design

   Building brand earnings card for creator portal (PHASE-4A).

   Requirements:
   - Brand logo and name
   - Available balance (large, prominent)
   - Pending balance (secondary)
   - Active projects count
   - Commission rate display
   - Discount code (copyable)
   - Quick action: request withdrawal
   ```

3. **Payout Settings**
   ```
   /frontend-design

   Building payout settings for creator portal (PHASE-4B).

   Requirements:
   - Connected payment methods list
   - Add payment method flow (Stripe Connect, Wise, PayPal)
   - Preferred method selector
   - Account status indicators
   - Minimum payout threshold setting
   - Automatic payout toggle
   ```

4. **Projects List & Detail**
   ```
   /frontend-design

   Building projects management for creator portal (PHASE-4C).

   Requirements:
   - Project list with status, brand, deadline, payment amount
   - Status filters (active, pending approval, completed)
   - Project detail: deliverables checklist, file uploads, messages
   - File upload dropzone with progress
   - Contract/e-signature section
   ```

---

## Anti-Patterns to Avoid

### DON'T: Skip the skill for "simple" components

```
// BAD - "It's just a button, I don't need /frontend-design"
<Button onClick={handleSubmit}>Submit</Button>

// The button context matters! Is it:
// - Primary CTA (should be prominent, full-width on mobile)?
// - Destructive action (should have confirmation, red styling)?
// - In a form (should show loading state)?
```

### DON'T: Create UI without understanding the user context

```
// BAD - Building a dashboard without knowing who uses it
/frontend-design
Create a metrics dashboard
```

### DON'T: Copy-paste generic patterns

Each context (admin, storefront, creator portal) has different users with different needs:
- **Admin**: Dense data, power-user features, keyboard shortcuts
- **Storefront**: Conversion-focused, trust signals, mobile-first
- **Creator**: Clear earnings visibility, simple actions, brand context

### DON'T: Forget accessibility

```
/frontend-design
[Include in requirements]
- Keyboard navigable
- Screen reader labels
- Color not sole indicator of state
- Sufficient contrast
```

---

## Integration with Other Skills & MCPs

### Combine with Context7 MCP for library patterns

```
/frontend-design

Before building: I'll use Context7 MCP to look up "shadcn/ui DataTable with column sorting and filters"

Building orders table for PHASE-2B...
[rest of context]
```

### Combine with Shopify Dev MCP for commerce UI

```
/frontend-design

I've used Shopify Dev MCP to get the Product type from Storefront API.

Building product card that receives this Product type:
[include type definition]

Requirements:
- Display all relevant product fields
- Handle missing images gracefully
- Support products with/without variants
```

---

## Output Expectations

After invoking `/frontend-design`, expect:

1. **Complete, working component code** - Not pseudocode or outlines
2. **Proper TypeScript types** - Props interfaces, state types
3. **Accessibility built-in** - ARIA labels, keyboard handling
4. **Responsive by default** - Mobile-first with desktop adaptations
5. **Loading/error states** - Not just happy path
6. **Integration notes** - How to use the component, required props

---

## Quick Reference: Phase-to-UI Mapping

| Phase | Primary UI Work | Invoke Skill For |
|-------|-----------------|------------------|
| 2A | Admin shell | Sidebar, header, dashboard, layout |
| 2B | Commerce features | DataTables, filters, detail pages, moderation |
| 2C | Content management | Blog editor, landing page builder, SEO forms |
| 2D | Finance | Payout tables, treasury views, expense forms |
| 2SA-ACCESS | Super admin auth | MFA input, role assignment UI |
| 2SA-DASHBOARD | Platform overview | KPI cards, brands grid, alert feed |
| 2SA-ADVANCED | Cross-tenant ops | Impersonation UI, error explorer |
| 2PO-HEALTH | Monitoring | Health matrix, status indicators |
| 2PO-LOGGING | Log viewer | Log list, filters, detail view |
| 2PO-FLAGS | Feature flags | Flag list, editor, targeting UI |
| 2PO-ONBOARDING | Wizard | 9-step wizard, OAuth flows, integrations, checklists |
| 3A | Storefront foundation | Product card, PDP, variant selector |
| 3B | Cart/checkout | Cart drawer, checkout flow |
| 3C | Features | Reviews display, bundle builder, A/B variants |
| 3D | Theming | Theme configurator, live preview |
| 4A | Creator dashboard | Earnings cards, brand switcher |
| 4B | Payments | Payout settings, withdrawal forms |
| 4C | Projects | Project list, file uploads, contracts |
| 4D | Tax | W-9 form, 1099 viewer |

---

## Verification Checklist

After using `/frontend-design` and implementing the component:

- [ ] Component renders correctly at 390px (mobile)
- [ ] Component renders correctly at 1440px (desktop)
- [ ] Keyboard navigation works
- [ ] Loading states implemented
- [ ] Error states implemented
- [ ] Empty states implemented (where applicable)
- [ ] Matches visual language of adjacent components
- [ ] `npx tsc --noEmit` passes
- [ ] Lighthouse accessibility > 90

---

*Last Updated: 2025-02-10*
