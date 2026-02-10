# PHASE-2B: Admin Commerce Features

**Duration**: 1.5 weeks (Week 5-6)
**Depends On**: Phase 2A (Admin Shell)
**Parallel With**: Phase 2C (Content), Phase 2SA-DASHBOARD
**Blocks**: Phase 3 (Storefront - needs order/customer sync patterns)

---

## ⚠️ MANDATORY: Tenant Isolation

**READ FIRST**: [TENANT-ISOLATION.md](../TENANT-ISOLATION.md)

Commerce data is the most sensitive. A tenant data leak here would be catastrophic.

Key requirements for this phase:
- ALL order/customer queries use `withTenant(tenantId, ...)`
- NEVER return orders from wrong tenant - audit every query
- Revenue metrics are per-tenant only
- Customer PII never crosses tenant boundaries
- Shopify API calls use tenant's credentials, not platform credentials

---

## Goal

Implement the Commerce section of the admin portal including orders, customers, subscriptions (with Loop integration), reviews management, and analytics overview.

---

## Success Criteria

- [ ] Orders list with pagination, filters (date, status, search)
- [ ] Order detail page with line items, customer info, fulfillment status
- [ ] Customers list with search, lifetime value display
- [ ] Customer detail with order history
- [ ] Subscriptions list integrated with Loop API
- [ ] Reviews list with moderation actions (approve/reject)
- [ ] Analytics overview with key commerce metrics
- [ ] All data properly tenant-isolated

---

## Deliverables

### Orders Module
- Order list page with DataTable component
- Order filters (date range, status, search)
- Order detail page with full order view
- Order sync from Shopify (on-demand and background)

### Customers Module
- Customer list with search functionality
- Customer detail page
- Order count and lifetime value calculations
- Customer tags and notes

### Subscriptions Module (Loop Integration)
- Subscriptions list page
- Loop API client integration
- Fallback to custom subscription system if Loop disabled
- Subscription status display and filtering

### Reviews Module
- Reviews list with product and customer info
- Status filters (pending, approved, rejected)
- Bulk moderation actions
- Individual approve/reject with audit trail

### Analytics Overview
- Commerce KPIs (revenue, AOV, conversion rate)
- Trend charts (if applicable)
- Quick links to detailed reports

---

## Constraints

- Use `withTenant()` wrapper for ALL database queries
- Loop API calls must include proper authentication
- Reviews moderation must log moderator and timestamp
- Customer PII must be handled with appropriate security
- Use React Query for data fetching with proper cache invalidation

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - For DataTable, filters, and detail page layouts
- Context7 MCP: "React Query pagination patterns"
- Context7 MCP: "shadcn/ui DataTable with filters"

**RAWDOG code to reference:**
- `src/app/admin/orders/page.tsx` - Orders list pattern
- `src/app/admin/customers/page.tsx` - Customers list pattern
- `src/lib/reviews/` - Reviews management patterns
- `src/lib/subscriptions/loop-client.ts` - Loop API integration

**External APIs:**
- Loop Subscriptions API: `https://api.loopsubscriptions.com/admin/2023-10/`
- Shopify Admin API for order sync

**Spec documents:**
- `FRONTEND-DESIGN-SKILL-GUIDE.md` - Full skill invocation patterns

**Reference docs (copied to plan folder):**
- `reference-docs/ADMIN-PATTERNS.md` - **CRITICAL**: Batch save, cache-busting, Neon pooling patterns with multi-tenant context

---

## Frontend Design Skill Integration

**MANDATORY**: Invoke `/frontend-design` BEFORE implementing each UI component.

### Component-Specific Skill Prompts

**1. Orders DataTable:**
```
/frontend-design

Building orders list DataTable for PHASE-2B-ADMIN-COMMERCE.

Requirements:
- Columns: Order ID (clickable), Customer Name, Items (count), Total (currency), Status (badge), Date, Actions (dropdown)
- Filters row above table:
  - Date range picker (last 7d, 30d, 90d, custom)
  - Status multiselect (pending, fulfilled, cancelled, refunded)
  - Search input (searches order ID, customer name, email)
- Bulk selection:
  - Checkbox column
  - "Select all" in header
  - Bulk action toolbar appears when items selected
- Pagination:
  - Page size selector (10, 20, 50)
  - Page navigation with ellipsis for many pages
  - "Showing X-Y of Z orders" text
- Row interactions:
  - Click row to navigate to detail
  - Actions dropdown: View, Refund, Cancel

Design constraints:
- Using shadcn DataTable pattern
- Status badges: fulfilled=green, pending=yellow, cancelled=gray, refunded=red
- Dense layout for power users (compact row height)

User context:
- Admins processing orders, need quick filtering and bulk actions
- May have hundreds/thousands of orders
```

**2. Order Detail Page:**
```
/frontend-design

Building order detail page for PHASE-2B-ADMIN-COMMERCE.

Requirements:
- Header: Order #, Status badge, Date, Edit/Actions dropdown
- Customer section (card):
  - Name, email (mailto link), phone
  - Billing address
  - Shipping address (if different)
- Line items section (table):
  - Product image (thumbnail), title, variant, quantity, unit price, line total
  - Subtotal row
- Order totals section:
  - Subtotal, Discount (if any with code), Shipping, Tax, Total
  - Payment status indicator
- Fulfillment timeline:
  - Steps: Order placed, Payment captured, Shipped, Delivered
  - Show dates and tracking links where available
- Actions:
  - Primary: Mark as Fulfilled / Add Tracking
  - Secondary: Send Email, Refund, Cancel

Layout:
- 2-column on desktop: main content | customer + totals sidebar
- Single column on mobile
```

**3. Customer List:**
```
/frontend-design

Building customer list for PHASE-2B-ADMIN-COMMERCE.

Requirements:
- List view (not full DataTable - simpler)
- Each row: Avatar/initials, Name, Email, Order count, Lifetime Value (LTV)
- Search input filters by name/email
- Sort by: Name, LTV (default), Recent order
- Click row to navigate to customer detail

Design:
- Clean, card-based rows with subtle hover
- LTV prominently displayed as currency
```

**4. Reviews Moderation Interface:**
```
/frontend-design

Building reviews moderation UI for PHASE-2B-ADMIN-COMMERCE.

Requirements:
- Filter tabs: All, Pending (default), Approved, Rejected
- Review card layout:
  - Product thumbnail + name (top)
  - Star rating (1-5 stars visual)
  - Review title + text
  - Customer name + "Verified Purchase" badge if applicable
  - Date submitted
  - Actions: Approve (green), Reject (red)
- Bulk moderation:
  - Checkbox per review
  - Floating toolbar: "Approve Selected", "Reject Selected"
- Empty state for each tab

Design:
- Card-based layout, 1 column on mobile, 2-3 columns on desktop
- Pending reviews have highlighted border
- Quick approve/reject with single click
```

### Workflow for UI Tasks

1. **Read RAWDOG patterns:** Check referenced files for existing implementation
2. **Invoke `/frontend-design`:** With the component prompt above
3. **Adapt to conventions:** Match existing code style
4. **Test interactions:** Especially filters, pagination, bulk actions
5. **Verify responsiveness:** 390px mobile, 1440px desktop

---

## AI Discretion Areas

The implementing agent should determine the best approach for:
1. DataTable component library (shadcn DataTable vs custom)
2. Date range picker component for order filters
3. Reviews bulk action implementation (checkbox vs select all)
4. Analytics chart library if needed
5. Loop API error handling and retry strategy

---

## Tasks

### [PARALLEL] Database Layer
- [ ] Create `apps/admin/src/lib/orders/db.ts` with getOrders, getOrder
- [ ] Create `apps/admin/src/lib/orders/types.ts`
- [ ] Create `apps/admin/src/lib/customers/db.ts` with getCustomers, getCustomer
- [ ] Create `apps/admin/src/lib/reviews/db.ts` with getReviews, moderateReview
- [ ] Create `apps/admin/src/lib/subscriptions/loop-client.ts`

### [PARALLEL] API Routes
- [ ] Create `apps/admin/src/app/api/admin/orders/route.ts` (GET list, POST sync)
- [ ] Create `apps/admin/src/app/api/admin/orders/[id]/route.ts`
- [ ] Create `apps/admin/src/app/api/admin/customers/route.ts`
- [ ] Create `apps/admin/src/app/api/admin/customers/[id]/route.ts`
- [ ] Create `apps/admin/src/app/api/admin/subscriptions/route.ts`
- [ ] Create `apps/admin/src/app/api/admin/reviews/route.ts`
- [ ] Create `apps/admin/src/app/api/admin/reviews/[id]/moderate/route.ts`

### [SEQUENTIAL after API] Orders UI
- [ ] Create `apps/admin/src/app/admin/orders/page.tsx`
- [ ] Create `apps/admin/src/app/admin/orders/components/order-list.tsx`
- [ ] Create `apps/admin/src/app/admin/orders/components/order-filters.tsx`
- [ ] Create `apps/admin/src/app/admin/orders/[id]/page.tsx`
- [ ] Create `apps/admin/src/app/admin/orders/components/order-detail.tsx`

### [SEQUENTIAL after API] Customers UI
- [ ] Create `apps/admin/src/app/admin/customers/page.tsx`
- [ ] Create `apps/admin/src/app/admin/customers/components/customer-list.tsx`
- [ ] Create `apps/admin/src/app/admin/customers/[id]/page.tsx`

### [SEQUENTIAL after API] Subscriptions UI
- [ ] Create `apps/admin/src/app/admin/subscriptions/page.tsx`
- [ ] Create `apps/admin/src/app/admin/subscriptions/components/subscription-list.tsx`

### [SEQUENTIAL after API] Reviews UI
- [ ] Create `apps/admin/src/app/admin/reviews/page.tsx`
- [ ] Create `apps/admin/src/app/admin/reviews/components/review-list.tsx`
- [ ] Create `apps/admin/src/app/admin/reviews/components/review-card.tsx`
- [ ] Implement bulk moderation actions

### [SEQUENTIAL after all UI] Analytics
- [ ] Create `apps/admin/src/app/admin/analytics/page.tsx` (overview)
- [ ] Implement commerce metrics aggregation

---

## Definition of Done

- [ ] Orders list loads with proper pagination
- [ ] Order filters work (date, status, search)
- [ ] Order detail shows complete order information
- [ ] Customers list shows lifetime value
- [ ] Subscriptions load from Loop API (or fallback)
- [ ] Reviews can be approved/rejected with audit trail
- [ ] All queries use `withTenant()` for isolation
- [ ] `npx tsc --noEmit` passes
- [ ] API routes return proper error responses
