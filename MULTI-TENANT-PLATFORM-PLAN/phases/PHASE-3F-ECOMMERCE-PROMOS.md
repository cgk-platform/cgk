# PHASE-3F: Promo Codes, Promotions & Selling Plans

**Duration**: 1.5 weeks (Week 15-16)
**Depends On**: Phase 3A (Storefront Foundation), Phase 2B (Admin Commerce)
**Parallel With**: Phase 3E (Recovery)
**Blocks**: Phase 3G (Segments - uses promo code targeting)

---

## ⚠️ MANDATORY: Tenant Isolation

**READ FIRST**: [TENANT-ISOLATION.md](../TENANT-ISOLATION.md)

Promo codes and selling plans are revenue-critical. Key requirements:
- Shopify is source of truth for discount validation (never validate locally)
- Platform metadata (creator attribution) stored per-tenant in Redis
- Selling plans stored per-tenant in database
- Promotions calendar stored per-tenant in config

---

## Goal

Implement promo code management, bulk code generation, sitewide promotions scheduling, and selling plan (subscription) configuration for multi-tenant commerce operations.

---

## Success Criteria

- [ ] Promo code list with Shopify data + platform metadata
- [ ] Single code creation and bulk code generation
- [ ] Creator attribution linking for commission tracking
- [ ] Shareable links with OG metadata (`/d/{CODE}`)
- [ ] Promotions calendar with sale scheduling
- [ ] Selling plan CRUD with discount windows
- [ ] All data properly tenant-isolated

---

## Deliverables

### Promo Code Management
- Promo code list page with Shopify + platform data
- Code creation flow (single and bulk)
- Creator attribution linking
- Performance tracking (uses, revenue, AOV)
- Status filtering (active, expired, scheduled)

### Shareable Links
- Dynamic route `/d/{CODE}` for discount application
- OG metadata configuration per code
- Redirect handling (to product/collection/home)
- Commission tracking for creators

### Promotions Scheduling
- Calendar view of scheduled sales
- Sale creation wizard (dates, discounts, banners)
- Sitewide vs. product-specific discounts
- Subscription-specific discount overrides
- Timezone handling (start Eastern, end Pacific)

### Selling Plans
- Selling plan CRUD interface
- Interval configuration (days/weeks/months)
- Discount types (percentage, fixed, explicit price)
- Discount windows (initial discount → ongoing discount)
- Priority ordering for display
- Product/collection assignment

---

## Constraints

- Promo codes must be created in Shopify (via GraphQL)
- Validation always via Shopify API (no local validation)
- Platform metadata (creator, OG) stored in Redis per-tenant
- Selling plans stored in database with Shopify sync
- Promotions affect site-wide pricing config

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - For promo code list, calendar view, selling plan editor
- Shopify Dev MCP: Introspect `codeDiscountNodeByCode`, `priceRuleCreate`
- Context7 MCP: "React calendar component patterns"

**RAWDOG code to reference:**
- `src/app/admin/promo-codes/page.tsx` - Promo code list
- `src/app/admin/promo-codes/CreatePromoCodeModal.tsx` - Code creation
- `src/app/admin/promotions/page.tsx` - Promotions calendar
- `src/app/api/admin/selling-plans/route.ts` - Selling plan API

**Spec documents:**
- `ECOMMERCE-OPS-PATTERNS.md` - Promo code patterns

---

## Database Schema

```sql
-- Promo code platform metadata (Shopify is source of truth for discount)
-- Note: Discount details live in Shopify, we store attribution/OG here
CREATE TABLE promo_code_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  shopify_discount_id TEXT,
  creator_id UUID REFERENCES creators(id) ON DELETE SET NULL,
  commission_percent DECIMAL(5,2),
  og_title TEXT,
  og_description TEXT,
  og_image TEXT,
  redirect_target TEXT DEFAULT 'HOME',  -- HOME, PRODUCT, COLLECTION
  redirect_handle TEXT,
  uses_count INTEGER DEFAULT 0,
  revenue_generated DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, code)
);

CREATE INDEX idx_promo_metadata_creator ON promo_code_metadata(tenant_id, creator_id);

-- Selling plans
CREATE TABLE selling_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  internal_name TEXT,
  selector_title TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  interval_unit TEXT NOT NULL,  -- DAY, WEEK, MONTH
  interval_count INTEGER NOT NULL DEFAULT 1,
  discount_type TEXT NOT NULL,  -- percentage, fixed_amount, explicit_price
  discount_value DECIMAL(10,2) NOT NULL,
  discount_after_payment INTEGER,  -- When discount changes (e.g., after 3 payments)
  discount_after_value DECIMAL(10,2),
  shopify_selling_plan_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- Scheduled promotions/sales
CREATE TABLE scheduled_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'scheduled',  -- scheduled, active, ended, disabled
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  sitewide_discount_percent DECIMAL(5,2),
  subscription_discount_percent DECIMAL(5,2),
  bundle_discount_percent DECIMAL(5,2),
  onetime_discount_percent DECIMAL(5,2),
  banner_text TEXT,
  badge_text TEXT,
  promo_code TEXT,  -- Optional auto-applied code
  product_overrides JSONB,  -- Per-product price overrides
  selling_plan_overrides JSONB,  -- Selling plan discount overrides
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_promotions_dates ON scheduled_promotions(
  tenant_id, starts_at, ends_at
);
```

---

## AI Discretion Areas

The implementing agent should determine:
1. Calendar component library (react-big-calendar, FullCalendar, custom)
2. Bulk code generation batch size (100, 500, 1000)
3. OG image upload vs. URL input
4. Promotion overlap handling (warn vs. prevent)
5. Selling plan sync strategy with Shopify

---

## Tasks

### [PARALLEL] Database Layer
- [ ] Create `packages/db/src/schema/promo-code-metadata.ts`
- [ ] Create `packages/db/src/schema/selling-plans.ts`
- [ ] Create `packages/db/src/schema/scheduled-promotions.ts`
- [ ] Create migration files
- [ ] Create `apps/admin/src/lib/promo-codes/db.ts`
- [ ] Create `apps/admin/src/lib/selling-plans/db.ts`

### [PARALLEL] API Routes - Promo Codes
- [ ] Create `apps/admin/src/app/api/admin/promo-codes/route.ts` (GET list, POST create)
- [ ] Create `apps/admin/src/app/api/admin/promo-codes/[code]/route.ts` (GET, PATCH, DELETE)
- [ ] Create `apps/admin/src/app/api/admin/promo-codes/bulk/route.ts` (POST bulk create)
- [ ] Create `apps/admin/src/app/api/admin/promo-codes/[code]/metadata/route.ts`

### [PARALLEL] API Routes - Promotions
- [ ] Create `apps/admin/src/app/api/admin/promotions/route.ts` (GET list, POST create)
- [ ] Create `apps/admin/src/app/api/admin/promotions/[id]/route.ts` (GET, PUT, DELETE)
- [ ] Create `apps/admin/src/app/api/admin/promotions/active/route.ts` (GET current)

### [PARALLEL] API Routes - Selling Plans
- [ ] Create `apps/admin/src/app/api/admin/selling-plans/route.ts` (GET, POST)
- [ ] Create `apps/admin/src/app/api/admin/selling-plans/[id]/route.ts` (GET, PUT, DELETE)
- [ ] Create `apps/admin/src/app/api/admin/selling-plans/sync/route.ts` (POST Shopify sync)

### [SEQUENTIAL after API] Shareable Link Route
- [ ] Create `apps/storefront/src/app/d/[code]/route.ts`
- [ ] Implement discount application logic
- [ ] Add OG metadata generation
- [ ] Add redirect handling
- [ ] Track attribution

### [SEQUENTIAL after API] Admin UI - Promo Codes
- [ ] Create `apps/admin/src/app/admin/promo-codes/page.tsx`
- [ ] Create promo code list component
- [ ] Create single code creation modal
- [ ] Create bulk generation modal
- [ ] Create code detail/edit modal
- [ ] Create creator linking interface

### [SEQUENTIAL after API] Admin UI - Promotions
- [ ] Create `apps/admin/src/app/admin/promotions/page.tsx`
- [ ] Create calendar view component
- [ ] Create sale creation wizard
- [ ] Create sale edit modal
- [ ] Add overlap detection UI

### [SEQUENTIAL after API] Admin UI - Selling Plans
- [ ] Create `apps/admin/src/app/admin/selling-plans/page.tsx`
- [ ] Create selling plan list
- [ ] Create selling plan editor
- [ ] Add discount window configuration
- [ ] Add product/collection assignment

### [PARALLEL with UI] Background Jobs
- [ ] Create promotion status updater (scheduled → active → ended)
- [ ] Create promo code usage sync job
- [ ] Create selling plan Shopify sync job

---

## Frontend Design Skill Prompts

**1. Promo Codes List:**
```
/frontend-design

Building promo codes list for PHASE-3F-ECOMMERCE-PROMOS.

Requirements:
- Columns: Code, Type (badge), Value, Status (badge), Uses, Revenue, Creator, Actions
- Type badges: percentage=blue, fixed=green, shipping=purple, bxgy=orange
- Status badges: active=green, scheduled=yellow, expired=gray
- Filters: Status dropdown, Creator dropdown, Search
- Actions: Copy link, Edit, Delete, View in Shopify
- Bulk actions: Generate codes button (opens modal)

Design:
- Copy link button with toast confirmation
- Creator column shows avatar + name, click to filter
- Revenue formatted as currency
```

**2. Bulk Code Generation Modal:**
```
/frontend-design

Building bulk code generation modal for PHASE-3F-ECOMMERCE-PROMOS.

Requirements:
- Prefix input (3-10 chars, uppercase auto)
- Quantity input (10-1000)
- Discount type select (percentage, fixed amount, free shipping)
- Discount value input
- Expiration date picker (optional)
- Customer segment select (optional)
- Creator attribution select (optional)
- Preview section showing example codes

Layout:
- Two-column form on desktop
- Preview card on right side
- Generate button with loading state
- Success state showing download CSV option
```

**3. Promotions Calendar:**
```
/frontend-design

Building promotions calendar for PHASE-3F-ECOMMERCE-PROMOS.

Requirements:
- Monthly calendar view (default)
- Sales shown as colored bars spanning date ranges
- Quick-add button opens sale wizard
- Click sale to edit
- Status colors: scheduled=yellow, active=green, ended=gray
- Sidebar with upcoming sales list
- Quick presets: Black Friday, Cyber Monday, Holiday Sale

Design:
- Overlap detection with warning icon
- Drag to reschedule (optional)
- Responsive (list view on mobile)
```

**4. Selling Plan Editor:**
```
/frontend-design

Building selling plan editor for PHASE-3F-ECOMMERCE-PROMOS.

Requirements:
- Name input
- Selector title input (customer-facing)
- Interval: Unit (days/weeks/months) + Count
- Initial discount: Type + Value
- Discount window toggle:
  - After X payments
  - New discount value
- Priority input (for display order)
- Product/Collection assignment (multi-select)
- Active toggle

Layout:
- Single column form
- Discount window in collapsible section
- Preview card showing customer view
```

---

## Shareable Link Flow

```
User visits: /d/SAVE20

1. Parse code from URL
2. Validate code via Shopify API
3. Get platform metadata (OG settings, redirect target)
4. If OG image request (from social crawler):
   - Return page with OG meta tags
5. If user visit:
   - Set discount cookie/session
   - Redirect to target (product/collection/home)
   - Track visit for attribution
```

---

## Definition of Done

- [ ] Promo codes list showing Shopify + platform data
- [ ] Single and bulk code creation working
- [ ] Creator attribution linking functional
- [ ] Shareable links with OG metadata working
- [ ] Promotions calendar with CRUD
- [ ] Selling plans CRUD with discount windows
- [ ] Shopify sync for selling plans
- [ ] All tenant-isolated
- [ ] `npx tsc --noEmit` passes
