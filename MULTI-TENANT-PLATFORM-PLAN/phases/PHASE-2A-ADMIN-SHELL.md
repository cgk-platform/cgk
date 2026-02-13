# PHASE-2A: Admin Shell & Configuration

> **STATUS**: ✅ COMPLETE (2026-02-13)

**Status**: COMPLETE
**Completed**: 2026-02-10

**Status**: ✅ COMPLETE

**Duration**: 1 week (Week 5)
**Depends On**: Phase 1D (Packages)
**Parallel With**: Phase 2SA-ACCESS (Super Admin Access)
**Blocks**: Phase 2B, 2C, 2D (all admin features need shell first)

---

## ⚠️ MANDATORY: Tenant Isolation

**READ FIRST**: [TENANT-ISOLATION.md](../TENANT-ISOLATION.md)

Every admin query MUST use `withTenant()` wrapper. Never query without tenant context.

Key requirements for this phase:
- All database queries use `withTenant(tenantId, async () => { ... })`
- Cache keys prefixed with tenant: `${tenantId}:dashboard:kpis`
- Tenant context injected via middleware from `x-tenant-id` header

---

## Goal

Build the white-labeled admin portal framework including layout, navigation, dashboard, tenant configuration, and theming system that all other admin features will use.

---

## Success Criteria

- [ ] Admin layout renders with sidebar navigation and header
- [ ] All 7 navigation sections visible and routable
- [ ] Dashboard displays KPI cards and escalations widget
- [ ] Tenant config loads from database (name, logo, colors, features)
- [ ] White-label CSS variables apply correctly
- [ ] Custom domain routing works via middleware
- [ ] Page load time < 2s
- [ ] Mobile responsive layout

---

## Deliverables

### Admin Layout
- Sidebar component with navigation structure
- Header component with tenant branding
- Main content area with overflow handling
- Mobile-responsive drawer navigation

### Navigation Structure (7 Sections)
1. Dashboard (home)
2. Content (Blog, Landing Pages, SEO, Brand Context)
3. Commerce (Orders, Customers, Subscriptions, Reviews, A/B Tests, Promotions)
4. Attribution (Overview, Channels, Journeys, AI Insights)
5. Creators (Directory, Applications, Pipeline, Inbox)
6. Finance (Payouts, Treasury, Expenses, Tax/1099)
7. Operations (Dashboard, Errors, Health) - tenant-filtered view
8. Settings (tenant configuration)

### Dashboard Page
- KPI cards (revenue, orders, customers, subscriptions)
- Escalations widget (pending reviews, failed payouts, errors)
- Recent activity feed

### Tenant Configuration System
- `getTenantConfig()` function with caching
- TenantConfig type definition
- Feature flags per tenant (creators, subscriptions, abTesting, attribution)
- Shopify/Stripe credentials resolution

### White-Labeling
- Theme configuration interface
- CSS variable generation from theme config
- Logo and favicon support
- Font family configuration

### Custom Domain Support
- Middleware for domain-to-tenant resolution
- Subdomain fallback matching
- Header injection for tenant context

---

## Constraints

- Must use `@repo/db` sql template tag (never raw db.query)
- Tenant context via `x-tenant-id` header
- All credentials must be encrypted at rest
- Use shadcn/ui components exclusively
- Follow existing RAWDOG admin layout patterns

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - REQUIRED before creating layout and dashboard components
- Context7 MCP: "shadcn/ui sidebar navigation patterns"
- Context7 MCP: "Next.js middleware tenant routing"

**RAWDOG code to reference:**
- `src/components/admin/AdminNav.tsx` - Navigation structure pattern
- `src/app/admin/layout.tsx` - Admin layout pattern
- `src/app/admin/page.tsx` - Dashboard KPI cards pattern
- `src/middleware.ts` - Auth middleware pattern for tenant injection

**Spec documents:**
- `ARCHITECTURE.md` - Tenant configuration schema
- `CODEBASE-ANALYSIS/ADMIN-FEATURES-2025-02-10.md` - Full admin feature inventory
- `FRONTEND-DESIGN-SKILL-GUIDE.md` - Detailed skill invocation patterns

**Reference docs (copied to plan folder):**
- `reference-docs/ADMIN-PATTERNS.md` - **CRITICAL**: Batch save, cache-busting, Neon pooling patterns with multi-tenant context

---

## Frontend Design Skill Integration

**MANDATORY**: Invoke `/frontend-design` BEFORE implementing each component below.

### Component-Specific Skill Prompts

**1. Admin Sidebar Navigation:**
```
/frontend-design

Building admin sidebar for PHASE-2A-ADMIN-SHELL.

Requirements:
- 7 navigation sections: Dashboard, Content, Commerce, Attribution, Creators, Finance, Operations, Settings
- Collapsible on mobile (slide-out drawer)
- Current route highlighting with indicator
- Support for nested navigation (expandable sections like Commerce > Orders, Customers)
- Tenant branding area at top: logo (fallback to initials) + brand name
- User menu at bottom: avatar, name, role, logout action
- Smooth transitions and hover states

Design constraints:
- Using shadcn/ui Sheet for mobile drawer
- Lucide icons for section icons
- Must support white-label theming (CSS variables for colors)

User context:
- Brand admins managing their e-commerce operations
- Need quick access to all sections
- May have feature flags disabling some sections
```

**2. Admin Header:**
```
/frontend-design

Building admin header for PHASE-2A-ADMIN-SHELL.

Requirements:
- Breadcrumb navigation (Home > Section > Page)
- Mobile hamburger toggle to open sidebar drawer
- Search input (command palette trigger, Cmd+K)
- Notification bell with unread count badge
- Tenant name display (on larger screens)

Design constraints:
- Fixed position at top
- Blur background effect on scroll
- 64px height
```

**3. Dashboard KPI Cards:**
```
/frontend-design

Building dashboard KPI cards for PHASE-2A-ADMIN-SHELL.

Requirements:
- 4 KPIs: Revenue (today/MTD), Orders (today), Customers (new this week), Active Subscriptions
- Each card shows: label, primary value (large), change percentage with up/down arrow
- Positive change = green, negative = red, neutral = gray
- Optional sparkline for trend visualization
- Cards are clickable to navigate to detail section

Layout:
- Mobile: 2 columns (2x2 grid)
- Desktop: 4 columns (1x4 row)

Design constraints:
- Use shadcn Card component
- Support loading skeleton state
```

**4. Escalations Widget:**
```
/frontend-design

Building escalations widget for admin dashboard.

Requirements:
- Shows items requiring admin attention
- Categories: Pending Reviews, Failed Payouts, Unresolved Errors
- Each category: icon, label, count badge
- Click to navigate to relevant section
- Collapse when all counts are zero
- Show max 5 items with "View All" link

Design:
- Compact list format
- Color-coded priority: critical = red border, warning = amber
```

### Workflow for UI Tasks

1. **Before each component:** Read this section and copy the relevant prompt
2. **Invoke skill:** `/frontend-design` with the prompt
3. **Review output:** Ensure it meets the requirements
4. **Implement:** Use the provided code, adapting to local conventions
5. **Verify:** Test at 390px and 1440px breakpoints

---

## AI Discretion Areas

The implementing agent should determine the best approach for:
1. Caching strategy for tenant config (Redis vs in-memory)
2. CSS variable naming convention for theme
3. Mobile navigation drawer vs sheet implementation
4. Dashboard chart library selection (if needed for KPIs)

---

## Tasks

### [PARALLEL] Core Layout Components
- [ ] Create `apps/admin/src/components/admin/sidebar.tsx`
- [ ] Create `apps/admin/src/components/admin/header.tsx`
- [ ] Create `apps/admin/src/app/admin/layout.tsx`
- [ ] Create `apps/admin/src/lib/navigation.ts` with all 7 sections

### [PARALLEL] Tenant System
- [ ] Create `apps/admin/src/lib/tenant.ts` with TenantConfig interface
- [ ] Implement `getTenantConfig()` with database query
- [ ] Create `apps/admin/src/lib/theme.ts` with CSS variable generation
- [ ] Implement encrypted credential resolution for Shopify/Stripe

### [SEQUENTIAL after Layout] Dashboard
- [ ] Create `apps/admin/src/app/admin/page.tsx` dashboard page
- [ ] Create `apps/admin/src/components/admin/dashboard/cards.tsx` for KPIs
- [ ] Create `apps/admin/src/components/admin/dashboard/escalations.tsx`
- [ ] Create `apps/admin/src/components/admin/dashboard/activity.tsx`
- [ ] Implement `getEscalationCounts()` and `getRevenueMetrics()` lib functions

### [SEQUENTIAL after Tenant] Custom Domain Routing
- [ ] Update `apps/admin/src/middleware.ts` for domain-to-tenant resolution
- [ ] Implement `getTenantByDomain()` database lookup
- [ ] Add subdomain fallback matching
- [ ] Implement redirect to organization selector when no tenant

### [PARALLEL] Settings Page Shell
- [ ] Create `apps/admin/src/app/admin/settings/page.tsx` placeholder
- [ ] Create settings navigation structure
- [ ] Create settings sub-pages:
  - [ ] `/admin/settings/general` - Brand info, logo, colors
  - [ ] `/admin/settings/domains` - Domain management (add/verify/remove)
  - [ ] `/admin/settings/shopify` - Shopify connection, checkout config, product sync
  - [ ] `/admin/settings/payments` - Stripe/Wise configuration
  - [ ] `/admin/settings/team` - Team member management
  - [ ] `/admin/settings/integrations` - Third-party integrations

> **Reference**: See [DOMAIN-SHOPIFY-CONFIG-SPEC](../DOMAIN-SHOPIFY-CONFIG-SPEC-2025-02-10.md) for domain and Shopify settings implementation.

---

## Definition of Done

- [ ] Admin layout renders correctly with sidebar and header
- [ ] Navigation shows all 7 sections with correct icons
- [ ] Dashboard loads KPIs from database
- [ ] Tenant branding (logo, colors) applies via CSS variables
- [ ] Custom domain routes to correct tenant
- [ ] `npx tsc --noEmit` passes
- [ ] Lighthouse accessibility score > 90
- [ ] Mobile layout works at 390px width
