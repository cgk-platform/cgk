# PHASE-2H: Financial Expenses & P&L

**Status**: COMPLETE
**Completed**: 2026-02-10

**Duration**: 1 week (Week 7-8)
**Depends On**: Phase 2A (Admin Shell), Phase 2D (Admin Finance foundation)
**Parallel With**: Phase 2H-TREASURY, Phase 2H-GIFT-CARDS
**Blocks**: None

---

## Goal

Implement comprehensive expense tracking, budget management, and P&L statement generation. This includes manual expense entry, expense categories, budget vs actual tracking, and full profit & loss statement generation with period comparisons.

---

## Success Criteria

- [ ] Unified expense view aggregating all expense types (ad spend, payouts, operating expenses)
- [ ] Expense categories CRUD with type classification (COGS, variable, marketing, operating)
- [ ] Monthly budget setting per category
- [ ] Budget vs actual variance tracking
- [ ] P&L statement generation with standard accounting format
- [ ] Period comparison (previous period, year-over-year)
- [ ] P&L inclusion toggle per expense item
- [ ] PDF export of P&L statements
- [ ] Manual expense entry with receipt upload

---

## Deliverables

### Expense Categories

Categories classify expenses for P&L reporting. Types:
- **COGS** - Cost of goods sold (product costs)
- **Variable** - Variable costs (payment processing, fulfillment)
- **Marketing** - Marketing expenses (ad spend, creator payouts)
- **Operating** - Operating expenses (SaaS, contractors, vendors)
- **Other** - Miscellaneous

**Admin UI Features:**
- Categories list grouped by type
- Create category with name, type, optional ID
- Activate/deactivate categories
- Display order management

### Unified Expenses

Aggregate view of ALL expense sources:
- Ad spend (Meta, Google, TikTok, etc.)
- Creator payouts (cash only, not store credit)
- Vendor payouts
- Contractor payouts
- Operating expenses (manual entries)

**Admin UI Features:**
- Date range filters (default: current month)
- Source filter dropdown
- Search by description/vendor
- Summary cards showing totals by source
- P&L impact summary showing included vs excluded

**P&L Toggle Feature:**
Each expense can be included/excluded from P&L:
- Toggle button on each row (except ad spend - always included)
- Exclusion reason required when excluding
- Visual indicator for excluded items
- API for batch updates

### Budget Management

Monthly budgets per category:
- Set budget amounts for any month
- View budget vs actual per category
- Variance calculation (dollars and percentage)
- Under/over budget indicators
- Month navigation for historical data

**Database Schema:**
```sql
CREATE TABLE expense_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  budgeted_cents INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, category_id, year, month)
);
```

### P&L Statement

Standard accounting P&L format:

```
REVENUE
  Gross Sales
  Less: Discounts
  Less: Returns
  Plus: Shipping Revenue
  = Net Revenue

COST OF GOODS SOLD
  Product Cost
  = Gross Profit (Net Revenue - COGS)
  Gross Margin %

VARIABLE COSTS
  Payment Processing (2.9% + $0.30)
  Shipping (actual 3PL costs OR estimates)
  Fulfillment (estimates)
  = Contribution Margin

MARKETING & SALES
  Ad Spend (by platform)
  Creator Payouts
  = Contribution Profit

OPERATING EXPENSES
  (by category with expandable detail)
  Vendor Payouts
  Contractor Payouts
  = Operating Income

NET PROFIT
  Net Margin %
```

**P&L Features:**
- Period selection (date range picker)
- Quick presets (This Month, Last Month, YTD)
- Period comparison (Previous Period, Year-over-Year)
- Expandable categories (click to see individual expenses)
- Formula tooltips explaining each line item calculation
- PDF export

### Manual Expenses

Direct expense entry for items not in other systems:

**Form Fields:**
- Date
- Category (from expense_categories)
- Description
- Amount
- Vendor name (optional)
- Notes (optional)
- Receipt upload (optional, Vercel Blob)
- Count for P&L toggle

**Database Schema:**
```sql
CREATE TABLE operating_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  category_id TEXT NOT NULL,
  description TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  vendor_name TEXT,
  notes TEXT,
  receipt_url TEXT,
  count_for_pnl BOOLEAN DEFAULT true,
  pnl_exclusion_reason TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE expense_categories (
  id TEXT PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'cogs', 'variable', 'marketing', 'operating', 'other'
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Constraints

- P&L calculations must be performant for 1+ year date ranges
- Budget vs actual must update in real-time as expenses are added
- Ad spend data comes from external sync (Meta, Google, TikTok APIs) - not manual entry
- Receipt uploads use Vercel Blob with tenant-prefixed paths
- All amounts stored as cents (integer) for precision
- P&L formula tooltips must match actual calculation logic

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - For P&L statement layout, budget table, expense form

**RAWDOG code to reference:**
- `src/app/admin/expenses/page.tsx` - Unified expenses view
- `src/app/admin/expenses/pl-statement/page.tsx` - P&L statement (1300+ lines, well-documented)
- `src/app/admin/expenses/budgets/page.tsx` - Budget vs actual
- `src/app/admin/expenses/categories/page.tsx` - Category management
- `src/components/admin/PnlStatusBadge.tsx` - P&L toggle component

**Reference docs (copied to plan folder):**
- `reference-docs/ADMIN-PATTERNS.md` - Batch save, cache-busting patterns
- `reference-docs/META-ADS-INTEGRATION.md` - Ad spend sync for P&L
- `reference-docs/GOOGLE-ADS-INTEGRATION.md` - Ad spend sync for P&L
- `reference-docs/TIKTOK-ADS-INTEGRATION.md` - Ad spend sync for P&L

---

## AI Discretion Areas

The implementing agent should determine:
1. P&L PDF layout and styling
2. Budget period navigation (calendar picker vs arrows)
3. Expense category icons/colors
4. Chart/visualization for budget vs actual
5. Line item expansion animation style

---

## Tasks

### [PARALLEL] Database Layer

- [ ] Create `apps/admin/src/lib/expenses/db/categories.ts`
- [ ] Create `apps/admin/src/lib/expenses/db/budgets.ts`
- [ ] Create `apps/admin/src/lib/expenses/db/expenses.ts`
- [ ] Create `apps/admin/src/lib/expenses/db/unified.ts` (aggregates all sources)
- [ ] Create `apps/admin/src/lib/expenses/types.ts`
- [ ] Create `apps/admin/src/lib/expenses/pnl-calculator.ts`

### [PARALLEL] API Routes

- [ ] Create `apps/admin/src/app/api/admin/expenses/categories/route.ts`
- [ ] Create `apps/admin/src/app/api/admin/expenses/budgets/route.ts`
- [ ] Create `apps/admin/src/app/api/admin/expenses/unified/route.ts`
- [ ] Create `apps/admin/src/app/api/admin/expenses/pl-statement/route.ts`
- [ ] Create `apps/admin/src/app/api/admin/expenses/pl-statement/pdf/route.ts`
- [ ] Create `apps/admin/src/app/api/admin/expenses/by-category/route.ts`
- [ ] Create `apps/admin/src/app/api/admin/expenses/pl-line-details/route.ts`
- [ ] Create `apps/admin/src/app/api/admin/pnl/toggle/route.ts`

### [SEQUENTIAL after API] Admin UI

- [ ] Create `apps/admin/src/app/admin/expenses/page.tsx` (unified view)
- [ ] Create `apps/admin/src/app/admin/expenses/categories/page.tsx`
- [ ] Create `apps/admin/src/app/admin/expenses/budgets/page.tsx`
- [ ] Create `apps/admin/src/app/admin/expenses/pl-statement/page.tsx`
- [ ] Create `apps/admin/src/app/admin/expenses/manual/page.tsx`
- [ ] Create `apps/admin/src/components/admin/expenses/expense-form.tsx`
- [ ] Create `apps/admin/src/components/admin/PnlStatusBadge.tsx`

### [SEQUENTIAL after UI] PDF Export

- [ ] Implement P&L PDF generation (use @react-pdf/renderer or similar)
- [ ] Add tenant branding to PDF header
- [ ] Add period and comparison info to PDF

---

## API Endpoints Specification

### GET /api/admin/expenses/unified
**Query params:** startDate, endDate, source (optional), search (optional)
**Returns:** expenses[], summary with totals by source and category type

### GET /api/admin/expenses/pl-statement
**Query params:** startDate, endDate
**Returns:** Full P&L statement object with all sections

### GET /api/admin/expenses/budgets
**Query params:** year, month
**Returns:** comparison[] with category_id, budgeted_cents, actual_cents, variance

### PATCH /api/admin/pnl/toggle
**Body:** { itemType, itemId, countForPnl, reason }
**Returns:** success boolean

---

## Definition of Done

- [ ] Unified expenses shows all expense types with totals
- [ ] Categories can be created, activated/deactivated
- [ ] Budgets can be set per category per month
- [ ] Budget vs actual shows variance correctly
- [ ] P&L statement generates with all sections
- [ ] P&L period comparison works (previous period, YoY)
- [ ] Expense categories expand to show individual items
- [ ] P&L toggle updates items correctly
- [ ] PDF export generates correctly formatted statement
- [ ] Manual expenses can be created with receipt upload
- [ ] All data properly tenant-isolated
- [ ] `npx tsc --noEmit` passes
